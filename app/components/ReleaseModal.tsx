'use client'
import { useState } from 'react' // Добавили стейт
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, X, Maximize2 } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { Share2, Download } from 'lucide-react'
import DownloadButton from "./DownloadButton";

export default function ReleaseModal({ release, isOpen, onClose, tracks }: any) {
  const { setQueue, activeTrack, isPlaying, togglePlay } = usePlayer()
  const [isCoverExpanded, setIsCoverExpanded] = useState(false) // Стейт для обложки
  const [copied, setCopied] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  if (!release) return null;

  const formatDuration = (s: any) => {
    const seconds = Math.floor(Number(s));
    if (isNaN(seconds) || seconds <= 0) return '--:--';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/release/${release.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Через 2 секунды текст вернется
  };

  const isThisReleasePlaying = isPlaying && tracks.some((t: any) => t.id === activeTrack?.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative w-full max-w-3xl max-h-[85vh] bg-[#121212] border border-white/5 rounded-xl overflow-hidden flex flex-col shadow-2xl"
          >
            {/* 1. ПОЛНОЭКРАННАЯ ОБЛОЖКА (PREVIEW) */}
            <AnimatePresence>
              {isCoverExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsCoverExpanded(false)}
                  className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-8 cursor-zoom-out"
                >
                  <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white">
                    <X size={24} />
                  </button>
                  <motion.img
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    src={release.cover_url || '/default.png'}
                    className="max-w-full max-h-full rounded-md shadow-2xl object-contain"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {!isDownloadOpen && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 z-50 p-2 hover:bg-white/10 rounded-full transition text-zinc-500"
              >
                <X size={20} />
              </button>
            )}

            <div className="overflow-y-auto custom-scrollbar">
              {/* HEADER */}
              <div className="p-10 flex flex-col sm:flex-row gap-8 items-center sm:items-end bg-gradient-to-b from-white/[0.03] to-transparent">

                {/* ТРИГГЕР ОБЛОЖКИ */}
                <div
                  onClick={() => setIsCoverExpanded(true)}
                  className="w-44 h-44 md:w-52 md:h-52 shadow-2xl rounded-sm overflow-hidden bg-zinc-900 flex-shrink-0 cursor-zoom-in group/cover relative"
                >
                  <img src={release.cover_url || '/default.png'} className="w-full h-full object-cover transition-transform group-hover/cover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 size={24} className="text-white" />
                  </div>
                </div>

                <div className="flex flex-col gap-0 text-center sm:text-left flex-1 min-w-0">
                  <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-1">
                    {release.is_album ? 'Album' : 'Single'}
                  </span>

                  <h1
                    className="font-black tracking-tighter text-white uppercase leading-[0.9] mb-2 break-words"
                    style={{
                      fontSize: release.title.length > 8
                        ? `clamp(20px, ${60 - (release.title.length - 8) * 4}px, 60px)`
                        : '60px',
                    }}
                  >
                    {release.title}
                  </h1>

                  <div className="flex items-center justify-center sm:justify-start text-[12px] font-black mt-2 uppercase mb-4">
                    <span className="text-white hover:underline cursor-pointer tracking-tighter">NORDOSIK</span>
                    <span className="text-zinc-500 mx-1.5 font-normal">•</span>
                    <span className="text-zinc-500 tracking-tighter">{new Date(release.created_at).getFullYear()}</span>
                    <span className="text-zinc-500 mx-1.5 font-normal">•</span>
                    <span className="text-zinc-500 tracking-tighter">
                      {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
                    </span>
                  </div>

                  {/* КНОПКИ ТЕПЕРЬ В РЯД И ВЫГЛЯДЯТ ПИЗДАТО */}
                  <div className="flex items-center justify-center sm:justify-start gap-3 mb-6">

                    {/* 1. SHARE RELEASE */}
                    <button
                      onClick={handleShare}
                      className="group flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 hover:border-white/20 active:scale-95"
                    >
                      <Share2 size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                      <span className="text-[12px] font-black uppercase tracking-widest">
                        {copied ? 'Copied!' : 'Share Release'}
                      </span>
                    </button>

                    {/* 2. DOWNLOAD MANAGER (Сингл или Список для альбома) */}
                    <div className="relative">
                      {release.is_album ? (
                        // Кнопка-триггер для открытия списка в альбоме
                        <button
                          onClick={() => setIsDownloadOpen(!isDownloadOpen)}
                          className="group flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 hover:border-white/20 active:scale-95"
                        >
                          <Download size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                          <span className="text-[12px] font-black uppercase tracking-widest">
                            {isDownloadOpen ? 'Close' : 'Get Tracks'}
                          </span>
                        </button>
                      ) : (
                        // Обычная кнопка скачивания для сингла
                        <DownloadButton
                          url={release.audio_url}
                          fileName={release.title}
                        />
                      )}

                      {/* ВЫПАДАЮЩИЙ СПИСОК ТРЕКОВ ДЛЯ АЛЬБОМА (MANAGER) */}
                      <AnimatePresence>
                        {isDownloadOpen && release.is_album && (
                          /* Портал поверх всего сайта */
                          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">

                            {/* ФОН С БЛЮРОМ (Теперь он точно заблюрит всё сзади) */}
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setIsDownloadOpen(false)}
                              className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
                            />

                            {/* КОНТЕЙНЕР МЕНЕДЖЕРА */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              // Форсируем округление через inline-style и !important классы
                              className="relative w-full max-w-md bg-[#121212] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col !rounded-[40px] overflow-hidden"
                              style={{
                                maxHeight: '75vh',
                                borderRadius: '40px' // Прямое указание радиуса
                              }}
                            >

                              {/* ХЕДЕР (Увеличил отступы, чтобы текст не слипался) */}
                              <div className="flex flex-col items-center justify-center px-10 pt-14 pb-8 border-b border-white/5 bg-[#161616] relative">

                                {/* КНОПКА ЗАКРЫТИЯ (Теперь она выше и правее) */}
                                <button
                                  onClick={() => setIsDownloadOpen(false)}
                                  className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 bg-white text-black rounded-full hover:scale-110 transition-all active:scale-90 shadow-2xl z-[10000]"
                                >
                                  <X size={18} strokeWidth={3} />
                                </button>

                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] mb-2 opacity-50">
                                  Download Manager
                                </span>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter text-center leading-none">
                                  {release.title}
                                </h2>
                              </div>

                              {/* СПИСОК ТРЕКОВ */}
                              <div className="overflow-y-auto flex-1 px-3 py-6 bg-[#121212] custom-scrollbar">
                                <div className="flex flex-col gap-y-1">
                                  {tracks.map((track: any, i: number) => (
                                    <div
                                      key={track.id}
                                      className="flex items-center justify-between p-4 px-6 rounded-[24px] hover:bg-white/[0.05] transition-all group mx-2"
                                    >
                                      <div className="flex items-center gap-x-6 min-w-0">
                                        {/* w-8 чтобы цифры 10+ не двигали текст */}
                                        <span className="text-[12px] font-black text-zinc-700 w-6 text-left group-hover:text-zinc-400">
                                          {i + 1}
                                        </span>
                                        <div className="flex flex-col truncate">
                                          <span className="font-bold text-[15px] text-zinc-200 group-hover:text-white truncate uppercase tracking-tight">
                                            {track.title}
                                          </span>
                                          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-0.5">
                                            NORDOSIK
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                                        <DownloadButton
                                          url={track.song_path || track.audio_url}
                                          fileName={`${release.title} - ${track.title}`}
                                          isMini
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* ФУТЕР */}
                              <div className="px-7 py-6 bg-[#161616] border-t border-white/5 flex justify-center">
                                <span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.6em]">
                                  N.Musics Records
                                </span>
                              </div>
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* CONTROLS & TRACKS */}
              <div className="px-10 pb-10">
                <div className="mb-8">
                  <button
                    onClick={() => isThisReleasePlaying ? togglePlay() : setQueue(tracks, 0)}
                    className="w-14 h-14 bg-white hover:scale-105 transition active:scale-95 rounded-full flex items-center justify-center shadow-xl"
                  >
                    {isThisReleasePlaying
                      ? <Pause fill="black" className="text-black" size={24} />
                      : <Play fill="black" className="text-black ml-1" size={24} />
                    }
                  </button>
                </div>

                <div className="space-y-1">
                  {tracks.map((track: any, i: number) => {
                    const isCurrentTrack = activeTrack?.id === track.id;
                    const isNowPlaying = isCurrentTrack && isPlaying;
                    return (
                      <div
                        key={track.id}
                        onClick={() => setQueue(tracks, i)}
                        className={`grid grid-cols-[30px_1fr_60px] gap-4 p-3 rounded-lg cursor-pointer items-center transition-all duration-500 group ${isNowPlaying
                          ? 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10'
                          : 'hover:bg-white/5 border border-transparent'
                          }`}
                      >
                        <span className="flex items-center justify-center text-sm font-medium">
                          {isNowPlaying ? (
                            <div className="flex items-end gap-[2px] h-3">
                              <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-white" />
                              <motion.div animate={{ height: [12, 4, 12] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[2px] bg-white" />
                              <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[2px] bg-white" />
                            </div>
                          ) : (
                            <span className={isCurrentTrack ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}>{i + 1}</span>
                          )}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-bold text-sm truncate ${isCurrentTrack ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>
                            {track.title}
                          </span>
                          <span className={`text-[10px] uppercase font-black tracking-widest ${isCurrentTrack ? 'text-zinc-400' : 'text-zinc-700'}`}>
                            NORDOSIK
                          </span>
                        </div>
                        <span className={`flex items-center justify-end text-xs font-mono ${isCurrentTrack ? 'text-white' : 'text-zinc-600 group-hover:text-white'}`}>
                          {formatDuration(track.duration)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}