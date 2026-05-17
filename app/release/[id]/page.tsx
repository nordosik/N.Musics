'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePlayer } from '../../lib/usePlayer'
import { ChevronLeft, Share2, Clock, Play, Pause, Music, X } from 'lucide-react'

export default function ReleasePage() {
  const { id } = useParams()
  const router = useRouter()
  const [release, setRelease] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const { activeTrack, isPlaying, setIsPlaying, setQueue } = usePlayer()
  const [copied, setCopied] = useState(false)

  const [playerHidden, setPlayerHidden] = useState(false);

  const togglePlayer = () => {
    const newState = !playerHidden;
    setPlayerHidden(newState);
    // Отправляем событие плееру
    window.dispatchEvent(new CustomEvent('toggle-player', { detail: newState }));
  };

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

  const isCurrentPlaying = activeTrack && tracks.some(t => t.id === activeTrack.id) && isPlaying;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-8 md:p-24 overflow-y-auto">

      {/* КНОПКА ВЫХОДА (КРЕСТИК) */}
      <button onClick={() => router.push('/')} className="fixed top-8 right-8 z-50 p-2 text-zinc-700 hover:text-white transition-colors">
        <X size={32} strokeWidth={1.5} />
      </button>

      <div className="flex flex-col lg:flex-row min-h-screen w-full relative">

        {/* ЛЕВАЯ КОЛОНКА: ОБЛОЖКА И ИНФО */}
        <div className="w-full lg:w-[400px] lg:fixed lg:top-0 lg:left-0 lg:bottom-0 p-12 flex flex-col justify-start z-20 bg-[#050505] md:bg-transparent">

          {/* ОБЛОЖКА: Оставили w-64 h-64, но добавили mt-4 чтобы чуть выше была */}
          <div className="w-64 h-64 overflow-hidden mb-8 shadow-2xl shrink-0 mt-4">
            <img src={release.cover_url} className="w-full h-full object-cover" alt="" />
          </div>

          <div className="w-full text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-3 block">
              {release.is_album ? 'Album' : 'Single'}
            </span>

            {/* Твой H1 с динамическим размером (вставь сюда свою формулу стиля, если она была) */}
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
                title={playerHidden ? "Show Player" : "Hide Player"}
              >
                {playerHidden ? <Music size={18} /> : <X size={18} />}
              </button>

              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                {copied ? <div className="text-[10px] font-bold">COPIED!</div> : <Share2 size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: ТРЕКЛИСТ */}
        <div className="flex-1 lg:ml-[400px] h-full flex flex-col p-8 md:p-20 overflow-hidden">

          {/* Заголовок треклиста — теперь он всегда на месте */}
          <div className="w-full max-w-2xl mx-auto flex items-center justify-between px-4 py-3 border-b-2 border-white/10 mb-6 shrink-0">
            <span className="text-[11px] font-black uppercase tracking-[0.4em] text-zinc-500">Tracklist</span>
            <Clock size={14} className="text-zinc-500" />
          </div>

          {/* КОНТЕЙНЕР ДЛЯ ТРЕКОВ: Центрирует содержимое, если его мало */}
          <div className="flex-1 flex flex-col justify-center min-h-0">
            <div className="overflow-y-auto max-h-full pr-2 custom-scrollbar w-full max-w-2xl mx-auto">
              <div className="flex flex-col">
                {tracks.map((track, i) => {
                  const isCurrent = activeTrack?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      onClick={() => { setQueue(tracks, i); setIsPlaying(true); }}
                      className={`group flex items-center justify-between p-4 border-b border-white/[0.03] cursor-pointer transition-all ${isCurrent ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                        }`}
                    >
                      <div className="flex items-center gap-6">
                        <span className={`text-[12px] font-black w-6 ${isCurrent ? 'text-white' : 'text-zinc-800'}`}>
                          {i + 1}
                        </span>
                        <span className={`text-sm font-black uppercase tracking-tighter ${isCurrent ? 'text-white' : 'text-zinc-500 group-hover:text-white'
                          }`}>
                          {track.title}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono ${isCurrent ? 'text-white' : 'text-zinc-700'}`}>
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Нижняя заглушка теперь минимальна, просто чтобы не липло к краю */}
          <div className="h-10 shrink-0" />
        </div>
      </div>
    </main>
  )
}