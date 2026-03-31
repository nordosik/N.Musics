'use client'
import { usePlayer } from '../lib/usePlayer' 
import { Play, Pause, Volume2, Music } from 'lucide-react'
import { useRef, useEffect, useState } from 'react' // ДОБАВИЛИ useState СЮДА

export default function Player() {
  const { activeTrack, isPlaying, setIsPlaying } = usePlayer()
  const audioRef = useRef<HTMLAudioElement>(null)

  // ПЕРЕНЕСЛИ ХУКИ ВНУТРЬ КОМПОНЕНТА
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  // Функция обновления времени (нужна для ползунка)
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  useEffect(() => {
    if (isPlaying) {
      audioRef.current?.play()
    } else {
      audioRef.current?.pause()
    }
  }, [isPlaying, activeTrack])

  if (!activeTrack) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/95 backdrop-blur-xl border-t border-zinc-800 px-6 flex items-center justify-between z-50">
      
      {/* Добавили onTimeUpdate в тег audio, чтобы время реально обновлялось */}
      <audio 
        ref={audioRef} 
        src={activeTrack.audio_url} 
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      {/* 1. ИНФО */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="w-14 h-14 bg-zinc-800 rounded shadow-lg overflow-hidden flex items-center justify-center">
          {activeTrack.cover_url ? (
            <img src={activeTrack.cover_url} className="w-full h-full object-cover" />
          ) : (
            <Music className="text-zinc-600" />
          )}
        </div>
        <div className="truncate">
          <div className="text-sm font-bold text-white truncate">{activeTrack.title}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Nordosik • N.Music</div>
        </div>
      </div>

      {/* 2. УПРАВЛЕНИЕ И ПРОГРЕСС */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2 bg-white text-black rounded-full hover:scale-105 transition active:scale-95 mb-1"
        >
          {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} />}
        </button>

        <div className="flex items-center gap-2 w-full text-[10px] text-zinc-500 font-mono">
          <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full relative overflow-hidden">
            <div 
              className="absolute h-full bg-white rounded-full transition-all duration-100" 
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <span>{duration ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')}` : '0:00'}</span>
        </div>
      </div>

      {/* 3. ГРОМКОСТЬ */}
      <div className="w-1/3 flex justify-end items-center gap-3 group">
        <Volume2 size={18} className="text-zinc-400 group-hover:text-white transition" />
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={volume}
          onChange={handleVolumeChange}
          className="
            w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer 
            accent-white
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:h-3
            [&::-moz-range-thumb]:w-3
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
          "
        />
      </div>
    </div>
  )
}
