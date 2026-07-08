'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePlayer } from '../../lib/usePlayer'
import { ChevronLeft, Share2, Clock, Play, Pause, Music, X } from 'lucide-react'
import { locales } from '../../lib/locales'

export default function ReleasePage() {
  const { id } = useParams()
  const router = useRouter()
  const [release, setRelease] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])

  // ДОБАВИЛИ ИМПОРТ isLyricsOpen ИЗ НАШЕГО ZUSTAND СТОРА
  const { activeTrack, isPlaying, setIsPlaying, setQueue, isLyricsOpen, language } = usePlayer()
  const t = locales[language as 'ru' | 'en' || 'en'];

  // Защита от Hydration Mismatch на динамическом роуте
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [copied, setCopied] = useState(false)
  const [playerHidden, setPlayerHidden] = useState(false)

  const togglePlayer = () => {
    const newState = !playerHidden
    setPlayerHidden(newState)
    window.dispatchEvent(new CustomEvent('toggle-player', { detail: newState }))
  }

  useEffect(() => {
    const fetchReleaseData = async () => {
      const { data: relData } = await supabase.from('releases').select('*').eq('id', id).single()
      if (relData) {
        setRelease(relData)
        const { data: trData } = await supabase.from('tracks').select('*').eq('release_id', relData.title).order('position', { ascending: true })
        setTracks(trData && trData.length > 0 ? trData.map(t => ({ ...t, cover_url: relData.cover_url })) : [{ ...relData, id: relData.id + '_tr', duration: relData.duration || 0 }])
      }
    }
    fetchReleaseData()
  }, [id])

  if (!release) return null

  const isCurrentPlaying = activeTrack && tracks.some(t => t.id === activeTrack.id) && isPlaying

  return (
    <main className="min-h-screen bg-[#0c0c0e] text-white p-8 md:p-24 overflow-y-auto">

      {/* ФИКС: КНОПКА ВЫХОДА ТЕПЕРЬ РЕНДЕРИТСЯ ТОЛЬКО ЕСЛИ ТЕКСТ ЗАКРЫТ */}
      {!isLyricsOpen && (
        <button
          onClick={() => router.push('/')}
          className="fixed top-8 right-8 z-50 p-2 text-zinc-700 hover:text-white transition-colors"
        >
          <X size={32} strokeWidth={1.5} />
        </button>
      )}

      <div className="flex flex-col lg:flex-row min-h-screen w-full relative">

        {/* ЛЕВАЯ КОЛОНКА: ОБЛОЖКА И ИНФО */}
        <div className="w-full lg:w-[400px] lg:fixed lg:top-0 lg:left-0 lg:bottom-0 p-12 flex flex-col justify-start z-20 bg-[#050505] md:bg-transparent">

          {/* ОБЛОЖКА */}
          <div className="w-64 h-64 overflow-hidden mb-8 shadow-2xl shrink-0 mt-4">
            <img src={release.cover_url} className="w-full h-full object-cover" alt="" />
          </div>

          <div className="w-full text-center md:text-left">
            {/* ДИНАМИЧЕСКИЙ ТЕГ ТИПА РЕЛИЗА */}
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-3 block">
              {release.release_type === 'album' && t.album}
              {release.release_type === 'ep' && t.ep}
              {release.release_type === 'single' && t.single}
              {!release.release_type && t.single}
            </span>

            {/* Заголовок релиза */}
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none mb-4">
              {release.title}
            </h1>

            {/* Кнопки управления */}
            <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
              <button
                onClick={() => { if (isCurrentPlaying) setIsPlaying(false); else { setQueue(tracks, 0); setIsPlaying(true); } }}
                className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                {isCurrentPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
              </button>

              <button
                onClick={togglePlayer}
                className={`p-2 rounded-full border transition-all ${playerHidden ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-white/10 hover:text-white'}`}
                title={isMounted ? (playerHidden ? t.showPlayer : t.hidePlayer) : "Hide Player"}
              >
                {playerHidden ? <Music size={18} /> : <X size={18} />}
              </button>

              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                {copied ? <div className="text-[10px] font-bold">{t.copiedUpper}</div> : <Share2 size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: ТРЕКЛИСТ */}
        <div className="flex-1 lg:ml-[400px] min-h-screen flex flex-col p-6 pt-12 md:p-12 md:pt-12">

          {/* Заголовок треклиста */}
          <div className="w-full flex items-center justify-between px-2 py-3 border-b border-white/10 mb-6 shrink-0">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500">{isMounted ? t.tracklist : "Tracklist"}</span>
            <Clock size={14} className="text-zinc-500" />
          </div>

          {/* КОНТЕЙНЕР ДЛЯ ТРЕКОВ */}
          <div className="flex-1 overflow-y-auto px-3 pr-2 custom-scrollbar overscroll-contain">
            <div className="flex flex-col">
              {tracks.map((track, i) => {
                const isCurrent = activeTrack?.id === track.id;

                const isCurrentTrackPlaying = isCurrent && isPlaying; // Проверка, играет ли трек прямо сейчас

                const isEcosystemTrack = track.is_ecosystem;
                const isHotNew = track.is_hot;

                return (
                  <div
                    key={track.id}
                    onClick={() => { setQueue(tracks, i); setIsPlaying(true); }}
                    /* УЛЬТИМАТИВНЫЙ НЕОНОВЫЙ ИНТЕРФЕЙС СТРАНИЦЫ РЕЛИЗА */
                    className={`group flex items-center justify-between p-4 rounded-lg my-2 mx-0.5 cursor-pointer transition-all duration-300 relative border ${isCurrentTrackPlaying
                        ? isEcosystemTrack
                          ? 'bg-emerald-950/20 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35),inset_0_0_12px_rgba(52,211,153,0.15)] scale-[1.01]'
                          : isHotNew
                            ? 'bg-red-950/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35),inset_0_0_12px_rgba(239,68,68,0.15)] scale-[1.01]'
                            : 'bg-white/5 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-[1.01]'
                        : isEcosystemTrack
                          ? 'bg-zinc-900/10 border-emerald-500/10 hover:border-emerald-500/30'
                          : isHotNew
                            ? 'bg-zinc-900/10 border-red-500/10 animate-fire-glow hover:border-red-500/30'
                            : 'bg-transparent border-transparent hover:bg-white/[0.02]'
                      }`}
                  >
                    {/* ЛЕВАЯ ЧАСТЬ: Номер/Эквалайзер + Название + Локализованные саб-лайны */}
                    <div className="flex items-center gap-6 min-w-0 flex-1 mr-4">
                      {/* 1. Индекс трека или живой эквалайзер */}
                      <span className="w-6 flex items-center justify-center text-[12px] font-mono flex-shrink-0">
                        {isCurrentTrackPlaying ? (
                          <div className="flex items-end gap-[2px] h-3">
                            <span className="w-[2px] h-3 bg-white block animate-[pulse_0.6s_infinite_alternate]" />
                            <span className="w-[2px] h-2 bg-white block animate-[pulse_0.8s_infinite_alternate]" />
                            <span className="w-[2px] h-3 bg-white block animate-[pulse_0.7s_infinite_alternate]" />
                          </div>
                        ) : (
                          <span className={isCurrent ? "text-white font-bold" : "text-zinc-600 group-hover:text-zinc-400 transition-colors"}>
                            {i + 1}
                          </span>
                        )}
                      </span>

                      {/* 2. Текстовый блок: Название и подпись с полной локализацией */}
                      <div className="flex flex-col min-w-0 justify-center">
                        <span className={`text-sm font-black uppercase tracking-wide truncate transition-colors duration-300 ${isCurrent ? 'text-white' : 'text-zinc-400 group-hover:text-white'
                          }`}>
                          {track.title}
                        </span>

                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[9px] uppercase font-black tracking-widest ${isCurrent ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            NORDOSIK
                          </span>
                          {isEcosystemTrack && (
                            <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500/80 truncate">
                              {/* ПОЛНАЯ МУЛЬТИЯЗЫЧНОСТЬ ИЗ СТОРА */}
                              {t.singleReleaseNotice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ПРАВАЯ ЧАСТЬ: ГЕОМЕТРИЧЕСКИЕ МАРКЕРЫ + ВРЕМЯ ТРЕКА */}
                    <div className="flex items-center gap-4 flex-shrink-0 relative z-20">
                      {isEcosystemTrack && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399,0_0_4px_#34d399]" />
                      )}

                      {isHotNew && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-sm tracking-widest">
                          HOT
                        </span>
                      )}

                      <span className={`text-[10px] font-mono w-11 text-right transition-colors ${isCurrent ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
                        }`}>
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}