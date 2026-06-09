'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, X, Maximize2, Share2, Download, BookOpen, Save } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { supabase } from '../lib/supabase'
import DownloadButton from "./DownloadButton"

const AdminStory = ({ text, onChange, onSave, loading }: any) => (
  <div className="flex flex-col gap-4 w-full h-full">
    <textarea
      value={text}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter release's story or insights, Nordosik..."
      className="w-full h-40 bg-black/40 border border-white/5 p-4 rounded-2xl text-sm font-medium text-zinc-300 outline-none focus:border-white/20 transition resize-none custom-scrollbar tracking-tight"
    />
    <button onClick={onSave} disabled={loading} className="flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-zinc-200 transition active:scale-98"><Save size={14} /> {loading ? 'Saving...' : 'Save Story'}</button>
  </div>
)

const UserStory = ({ text }: { text: string }) => (
  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
    {text.trim() ? (
      <p className="text-zinc-300 text-sm font-black tracking-tight leading-relaxed whitespace-pre-wrap">
        "{text}"
      </p>
    ) : (
      <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">No story attached to this release yet, stay tuned.</p>
    )}
  </div>
)

// 3. Компонент кнопок Share и Download (Защита от сбоев разметки)
const ActionButtons = ({ handleShare, copied, isMultiTrack, isDownloadOpen, setIsDownloadOpen, audioUrl, title }: any) => (
  <div className="flex items-center justify-center sm:justify-start gap-3 mb-3">
    <button onClick={handleShare} className="group flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 hover:border-white/20 active:scale-95">
      <Share2 size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
      <span className="text-[12px] font-black uppercase tracking-widest">{copied ? 'Copied!' : 'Share Release'}</span>
    </button>
    <div className="relative">
      {isMultiTrack ? (
        <button onClick={() => setIsDownloadOpen(!isDownloadOpen)} className="group flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 hover:border-white/20 active:scale-95">
          <Download size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
          <span className="text-[12px] font-black uppercase tracking-widest">{isDownloadOpen ? 'Close' : 'Get Tracks'}</span>
        </button>
      ) : (
        <DownloadButton url={audioUrl} fileName={title} />
      )}
    </div>
  </div>
)

export default function ReleaseModal({ release, isOpen, onClose, tracks, isAdmin }: any) {
  const { setQueue, activeTrack, isPlaying, togglePlay, setIsPlaying } = usePlayer()
  const [isCoverExpanded, setIsCoverExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDownloadOpen, setIsDownloadOpen] = useState(false)
  const [isCommentaryOpen, setIsCommentaryOpen] = useState(false)
  const [commentaryText, setCommentaryText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 1. Первый хук синхронизации текста комментария
  useEffect(() => {
    if (release) setCommentaryText(release.commentary || '')
  }, [release])

  // 2. Второй хук бесшовного скрытия плеера, заморозки заднего фона и сохранения позиции скролла
  useEffect(() => {
    if (isOpen) {
      // Прячем плеер
      window.dispatchEvent(new CustomEvent('toggle-player', { detail: true }));

      // Запоминаем точный скролл в локальную переменную компонента, чтобы не потерять
      const currentScroll = window.scrollY;
      document.body.setAttribute('data-scroll-y', currentScroll.toString());

      // Замораживаем только скроллбар, не ломая позиционирование страницы
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      window.dispatchEvent(new CustomEvent('toggle-player', { detail: false }));

      // Достаем сохраненный скролл
      const savedScroll = parseInt(document.body.getAttribute('data-scroll-y') || '0', 10);

      // Возвращаем скроллбары
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-scroll-y');

      // Возвращаем на место с легким таймаутом в 0 мс, чтобы дать браузеру обновить DOM после закрытия модалки
      if (savedScroll > 0) {
        setTimeout(() => {
          window.scrollTo({
            top: savedScroll,
            behavior: 'auto' // 'auto' перекидывает мгновенно и без рывков
          });
        }, 0);
      }
    }

    return () => {
      window.dispatchEvent(new CustomEvent('toggle-player', { detail: false }));
      const savedScroll = parseInt(document.body.getAttribute('data-scroll-y') || '0', 10);
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.removeAttribute('data-scroll-y');
      if (savedScroll > 0) {
        setTimeout(() => {
          window.scrollTo(0, savedScroll);
        }, 0);
      }
    };
  }, [isOpen]);

  // 3. И СТРОГО ПОСЛЕ НИХ ДОЛЖЕН ИДТИ ВЫХОД ИЗ КОМПОНЕНТА!
  if (!release) return null

  const formatDuration = (s: any) => {
    const seconds = Math.floor(Number(s))
    if (isNaN(seconds) || seconds <= 0) return '--:--'
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
  }

  const formatTotalDuration = (totalSeconds: any) => {
    const seconds = Math.floor(Number(totalSeconds))
    if (isNaN(seconds) || seconds <= 0) return ''
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), r = seconds % 60
    return h > 0 ? `${h} ${h === 1 ? 'HR' : 'HRS'} ${m} ${m === 1 ? 'MIN' : 'MINS'}` : `${m} ${m === 1 ? 'MIN' : 'MINS'} ${r} ${r === 1 ? 'SEC' : 'SECS'}`
  }

  const formatFullDate = (dStr: string) => {
    if (!dStr) return '--.--.----'
    const d = new Date(dStr)
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  }

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/release/${release.id}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveCommentary = async () => {
    if (!isAdmin) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('releases').update({ commentary: commentaryText }).eq('id', release.id)
      if (error) throw error
      release.commentary = commentaryText
      alert('Commentary updated successfully, bro!')
    } catch (e: any) { alert(`Error saving: ${e.message}`) } finally { setIsSaving(false) }
  }

  const isThisReleasePlaying = isPlaying && tracks.some((t: any) => t.id === activeTrack?.id)
  const isMultiTrack = release.release_type === 'album' || release.release_type === 'ep'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Фон плавно гаснет (duration-500 для вылизанного эффекта) */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

          <motion.div
            // Кастомная плавная анимация: при закрытии карточка улетает строго наверх (y: -100) и тает
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -100 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // Премиальный easeOutExpo сглаживание
            className="relative w-full max-w-3xl max-h-[85vh] bg-[#121212] border border-white/5 rounded-xl overflow-y-auto custom-scrollbar flex flex-col shadow-2xl"
          >

            <AnimatePresence>
              {isCoverExpanded && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCoverExpanded(false)} className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center p-8 cursor-zoom-out">
                  <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} src={release.cover_url || '/default.png'} className="max-w-full max-h-full rounded-md shadow-2xl object-contain" onError={(e) => { e.currentTarget.src = '/default.png'; }} />
                </motion.div>
              )}
            </AnimatePresence>

            {!isDownloadOpen && !isCommentaryOpen && (
              <button onClick={onClose} className="absolute top-6 right-6 z-50 p-2 hover:bg-white/10 rounded-full transition text-zinc-500"><X size={20} /></button>
            )}

            {/* Карточка зафиксирована в размерах, а этот класс добавляет безопасный отступ снизу от плеера */}
            <div className="flex-shrink-0">
              {/* HEADER: Задали items-stretch, чтобы текстовое поле имело одинаковую высоту с обложкой */}
              <div className="p-10 pb-8 flex flex-col sm:flex-row gap-8 items-center sm:items-stretch bg-gradient-to-b from-white/[0.03] to-transparent">

                {/* ТРИГГЕР ОБЛОЖКИ (Остался оригинальным) */}
                <div onClick={() => release.cover_url && setIsCoverExpanded(true)} className="w-44 h-44 md:w-52 md:h-52 shadow-2xl rounded-sm overflow-hidden bg-zinc-900 flex-shrink-0 cursor-zoom-in group/cover relative flex items-center justify-center">
                  {release.cover_url ? (
                    <img src={release.cover_url} className="w-full h-full object-cover transition-transform group-hover/cover:scale-105" alt="" onError={(e) => {
                      e.currentTarget.style.display = 'none'; const p = e.currentTarget.parentElement;
                      {/* Полностью убрали дефисы из strokeWidth во всех внутренних строках */ }
                      if (p) p.innerHTML = isMultiTrack
                        ? '<svg class="text-zinc-600 w-16 h-16 animate-[spin_8s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>'
                        : '<svg class="text-zinc-600 w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
                    }} />
                  ) : (
                    <>{isMultiTrack ? (
                      <svg className="text-zinc-600 w-16 h-16 animate-[spin_8s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
                    ) : (
                      <svg className="text-zinc-600 w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                    )}</>
                  )}
                  {release.cover_url && <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 size={24} className="text-white" /></div>}
                </div>

                {/* ТЕКСТОВАЯ ИНФОРМАЦИЯ: items-start + justify-end намертво прижмут инфу к нижней границе обложки */}
                <div className="flex flex-col justify-end items-start text-left flex-1 min-w-0 min-h-full">
                  <span className="text-[12px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-1 block">
                    {release.release_type === 'album' && 'Album'}{release.release_type === 'ep' && 'EP'}{release.release_type === 'single' && 'Single'}{!release.release_type && 'Single'}
                  </span>

                  <h1 className="font-black tracking-tighter text-white uppercase leading-[0.9] mb-3 break-words w-full" style={{ fontSize: release.title.length > 8 ? `clamp(20px, ${60 - (release.title.length - 8) * 4}px, 60px)` : '60px' }}>
                    {release.title}
                  </h1>

                  {/* СТРОКА МЕТАДАННЫХ: Заменили flex-wrap на обычный flex без переносов, чтобы STORY никогда не падала вниз */}
                  <div className="flex flex-wrap items-center text-[12px] font-black uppercase mb-5 text-zinc-500 max-w-full gap-y-1.5">
                    <span className="text-white hover:underline cursor-pointer tracking-tighter">NORDOSIK</span>
                    <span className="mx-1.5 font-normal">•</span>
                    <span className="tracking-tighter">{formatFullDate(release.created_at)}</span>
                    <span className="mx-1.5 font-normal">•</span>
                    <span className="tracking-tighter">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
                    {(() => {
                      const totalSec = release.duration > 0 ? release.duration : tracks.reduce((sum: number, t: any) => sum + (Number(t.duration) || 0), 0);
                      if (totalSec > 0) return <><span className="mx-1.5 font-normal">•</span><span className="tracking-tighter text-zinc-500">{formatTotalDuration(totalSec)}</span></>;
                      return null;
                    })()}
                    <span className="mx-1.5 font-normal">•</span>

                    {/* Кнопка STORY теперь имеет flex-shrink-0 и никогда не будет ужиматься или резаться */}
                    <button onClick={() => setIsCommentaryOpen(true)} className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded-md border border-white/5 flex-shrink-0">
                      <BookOpen size={12} strokeWidth={2.5} />
                      <span className="text-[10px] font-black tracking-widest">STORY</span>
                    </button>
                  </div>

                  {/* НИЖНИЙ РЯД КНОПОК */}
                  <div className="flex items-center gap-3 w-full">
                    <ActionButtons
                      handleShare={handleShare}
                      copied={copied}
                      isMultiTrack={isMultiTrack}
                      isDownloadOpen={isDownloadOpen}
                      setIsDownloadOpen={setIsDownloadOpen}
                      audioUrl={release.audio_url}
                      title={release.title}
                    />

                    {/* ВСЕ ОВЕРЛЕИ КНОПОК ЗАКРЫТЫ ВНУТРИ СЕТКИ */}
                    <AnimatePresence>
                      {isDownloadOpen && isMultiTrack && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDownloadOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-[#121212] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col !rounded-[40px] overflow-hidden" style={{ maxHeight: '75vh', borderRadius: '40px' }}>
                            <div className="flex flex-col items-center justify-center px-10 pt-14 pb-8 border-b border-white/5 bg-[#161616] relative">
                              <button onClick={() => setIsDownloadOpen(false)} className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 bg-white text-black rounded-full hover:scale-110 transition-all active:scale-90 shadow-2xl"><X size={18} strokeWidth={3} /></button>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] mb-2 opacity-50">Download Manager</span>
                              <h2 className="text-2xl font-black text-white uppercase tracking-tighter text-center leading-none">{release.title}</h2>
                            </div>
                            <div className="overflow-y-auto flex-1 px-3 py-6 bg-[#121212] custom-scrollbar">
                              <div className="flex flex-col gap-y-1">
                                {tracks.map((track: any, i: number) => (
                                  <div key={track.id} className="flex items-center justify-between p-4 px-6 rounded-[24px] hover:bg-white/[0.05] transition-all group mx-2">
                                    <div className="flex items-center gap-x-6 min-w-0">
                                      <span className="text-[12px] font-black text-zinc-700 w-6 text-left group-hover:text-zinc-400">{i + 1}</span>
                                      <div className="flex flex-col truncate"><span className="font-bold text-[15px] text-zinc-200 group-hover:text-white truncate uppercase tracking-tight">{track.title}</span><span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-0.5">NORDOSIK</span></div>
                                    </div>
                                    <div className="flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"><DownloadButton url={track.song_path || track.audio_url} fileName={`${release.title} - ${track.title}`} isMini /></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="px-7 py-6 bg-[#161616] border-t border-white/5 flex justify-center"><span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.6em]">N.Musics Records</span></div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {isCommentaryOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCommentaryOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
                          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-[#121212] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden" style={{ maxHeight: '75vh', borderRadius: '40px' }}>
                            <div className="flex flex-col items-center justify-center px-10 pt-14 pb-6 border-b border-white/5 bg-[#161616] relative">
                              <button onClick={() => setIsCommentaryOpen(false)} className="absolute top-6 right-6 flex items-center justify-center w-9 h-9 bg-white text-black rounded-full hover:scale-110 transition-all active:scale-90 shadow-2xl z-10">
                                <X size={18} strokeWidth={3} />
                              </button>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.5em] mb-2 opacity-50">
                                Release Background
                              </span>
                              <h2 className="text-xl font-black text-white uppercase tracking-tighter text-center leading-none">
                                Author's Story
                              </h2>
                            </div>
                            <div className="overflow-y-auto flex-1 p-8 bg-[#121212] custom-scrollbar text-center flex flex-col justify-center min-h-[200px]">
                              {isAdmin && (
                                <AdminStory text={commentaryText} onChange={setCommentaryText} onSave={handleSaveCommentary} loading={isSaving} />
                              )}
                              {!isAdmin && (
                                <UserStory text={commentaryText} />
                              )}
                            </div>
                            <div className="px-7 py-5 bg-[#161616] border-t border-white/5 flex justify-center">
                              <span className="text-[10px] font-black text-zinc-800 uppercase tracking-[0.6em]">
                                N.Musics Commentary
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

            {/* CONTROLS & TRACKS: Теперь скроллится СТРОГО эта нижняя часть, если треков больше, чем влезает */}
            <div className="px-10 pb-10">
              <div className="mb-6">
                <button onClick={() => isThisReleasePlaying ? togglePlay() : setQueue(tracks, 0)} className="w-14 h-14 bg-white hover:scale-105 transition active:scale-95 rounded-full flex items-center justify-center shadow-xl">
                  {isThisReleasePlaying ? <Pause fill="black" className="text-black" size={24} /> : <Play fill="black" className="text-black ml-1" size={24} />}
                </button>
              </div>

              <div className="space-y-1">
                {tracks.map((track: any, i: number) => {
                  const isCurrentTrack = activeTrack?.id === track.id
                  const isNowPlaying = isCurrentTrack && isPlaying
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        // 1. Загружаем треки в очередь и передаем индекс текущего трека
                        setQueue(tracks, i);
                        // 2. Жестко и принудительно врубаем воспроизведение в Zustand-стейт плеера
                        setIsPlaying(true);
                        // 3. Плавно возвращаем плеер на главной странице (он выедет снизу)
                        window.dispatchEvent(new CustomEvent('toggle-player', { detail: false }));
                        // 4. Закрываем модалку (карточка улетит наверх, а блюр растворится)
                        onClose();
                      }}
                      className={`grid grid-cols-[30px_1fr_60px] gap-4 p-3 rounded-lg cursor-pointer items-center transition-all duration-500 group ${isCurrentTrack ? 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                    >
                      <span className="flex items-center justify-center text-sm font-medium">
                        {isNowPlaying ? (
                          <div className="flex items-end gap-[2px] h-3">
                            <motion.div animate={{ height: "100%" }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-white" />
                            <motion.div animate={{ height: "60%" }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[2px] bg-white" />
                            <motion.div animate={{ height: "80%" }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[2px] bg-white" />
                          </div>
                        ) : (<span className={isCurrentTrack ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}>{i + 1}</span>)}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className={`font-bold text-sm truncate ${isCurrentTrack ? 'text-white' : 'text-zinc-500 group-hover:text-white'}`}>{track.title}</span>
                        <span className={`text-[10px] uppercase font-black tracking-widest ${isCurrentTrack ? 'text-zinc-400' : 'text-zinc-700'}`}>NORDOSIK</span>
                      </div>
                      <span className={`flex items-center justify-end text-xs font-mono ${isCurrentTrack ? 'text-white' : 'text-zinc-600 group-hover:text-white'}`}>{formatDuration(track.duration)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
