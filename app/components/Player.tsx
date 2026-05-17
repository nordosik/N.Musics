'use client'
import { usePlayer } from '../lib/usePlayer'
import LyricsOverlay from './LyricsOverlay'
import { Play, Pause, Volume2, Music, SkipBack, SkipForward, Quote, Shuffle, Repeat, Repeat1 } from 'lucide-react'
import React, { useRef, useEffect, useState } from 'react'

export default function Player() {
  const { 
    activeTrack, 
    isPlaying, 
    setIsPlaying, 
    playNext, 
    playPrevious, 
    isLyricsOpen, 
    setIsLyricsOpen,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat
  } = usePlayer();
  
  const audioRef = useRef<HTMLAudioElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('player_volume')) || 1;
    }
    return 1;
  });

  // Синхронизация нативного свойства loop при изменении режима повтора
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = (repeatMode === 'one');
    }
  }, [repeatMode]);

  // ЭФФЕКТ ГОРЯЧИХ КЛАВИШ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case 'ArrowRight':
          if (audioRef.current) audioRef.current.currentTime += 5;
          break;
        case 'ArrowLeft':
          if (audioRef.current) audioRef.current.currentTime -= 5;
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'KeyM':
          setVolume(prev => (prev > 0 ? 0 : 0.3));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setIsPlaying, volume]);

  // СИНХРОНИЗАЦИЯ ГРОМКОСТИ С ХРАНИЛИЩЕМ
  useEffect(() => {
    localStorage.setItem('player_volume', volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    localStorage.setItem('player_volume', v.toString());
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedPercent = x / rect.width;

    const newTime = clickedPercent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }

    if (isPlaying) {
      audioRef.current?.play().catch(() => {
        setIsPlaying(false)
      })
    } else {
      audioRef.current?.pause()
    }
  }, [isPlaying, activeTrack, setIsPlaying, volume]);

  const [isForcedHidden, setIsForcedHidden] = useState(false);

  useEffect(() => {
    const handleToggle = (e: any) => setIsForcedHidden(e.detail);
    window.addEventListener('toggle-player', handleToggle);
    return () => window.removeEventListener('toggle-player', handleToggle);
  }, []);

  return (
    <div className={`
      fixed bottom-0 left-0 right-0 h-24 bg-black/95 backdrop-blur-xl border-t border-zinc-800 px-6 flex items-center justify-between z-50
      transition-all duration-500 ease-in-out
      ${isForcedHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'} 
    `}>

      {/* Нативный loop={repeatMode === 'one'} полностью решает проблему зависания и конфликтов с Shuffle */}
      <audio
        key={activeTrack?.id}
        ref={audioRef}
        src={activeTrack?.audio_url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onTimeUpdate}
        onCanPlay={(e) => e.currentTarget.volume = volume}
        onEnded={() => playNext(true)} 
        autoPlay={isPlaying}
        loop={repeatMode === 'one'}
      />

      {/* 1. ИНФО */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="w-14 h-14 bg-zinc-800 rounded shadow-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          {activeTrack?.cover_url ? (
            <img src={activeTrack.cover_url} className="w-full h-full object-cover" />
          ) : (
            <Music className="text-zinc-600" />
          )}
        </div>
        <div className="truncate">
          <div className="text-sm font-bold text-white truncate">{activeTrack?.title}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Nordosik • N.Musics</div>
        </div>
      </div>

      {/* 2. УПРАВЛЕНИЕ И ПРОГРЕСС */}
      <div className="flex flex-col items-center gap-2 w-1/3">
        <div className="flex items-center gap-6 text-zinc-400">
          
          {/* КНОПКА ПЕРЕМЕШИВАНИЯ */}
          <button
            onClick={toggleShuffle}
            className={`transition-all duration-200 hover:scale-105 active:scale-95 ${
              isShuffle 
                ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={isShuffle ? "Перемешивание включено" : "Перемешать всё"}
          >
            <Shuffle size={18} />
          </button>

          {/* КНОПКА НАЗАД */}
          <SkipBack
            onClick={() => playPrevious()}
            className="hover:text-white cursor-pointer transition active:scale-90"
            size={22}
          />

          {/* ЦЕНТРАЛЬНЫЙ ПЛЕЙ / ПАУЗА */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2.5 bg-white text-black rounded-full hover:scale-105 transition active:scale-95 flex items-center justify-center"
          >
            {isPlaying ? <Pause fill="black" size={18} /> : <Play fill="black" size={18} className="ml-0.5" />}
          </button>

          {/* КНОПКА ВПЕРЕД */}
          <SkipForward
            onClick={() => playNext(false)} 
            className="hover:text-white cursor-pointer transition active:scale-90"
            size={22}
          />

          {/* КНОПКА ПОВТОРА */}
          <button
            onClick={toggleRepeat}
            className="relative transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center w-8 h-8"
            title={
              repeatMode === 'one' ? "Повтор одного трека" :
              repeatMode === 'all' ? "Повтор всего релиза" : "Повтор выключен"
            }
          >
            <div className={`transition-colors ${
              repeatMode !== 'off' 
                ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' 
                : 'text-zinc-500 hover:text-zinc-300'
            }`}>
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </div>

            {repeatMode === 'all' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
            )}
          </button>

        </div>

        {/* Хотбар (Прогресс-бар) */}
        <div className="flex items-center gap-2 w-full text-[10px] text-zinc-500 font-mono mt-1 select-none">
          <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>

          <div
            onClick={handleProgressClick}
            className="flex-1 h-1 bg-zinc-800 rounded-full relative cursor-pointer group"
          >
            <div
              className="absolute h-full bg-zinc-400 group-hover:bg-white transition-all duration-100 rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            <div
              className="absolute h-2.5 w-2.5 bg-white rounded-full -top-[3px] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 5px)` }}
            />
          </div>

          <span>
            {activeTrack?.duration
              ? `${Math.floor(activeTrack.duration / 60)}:${Math.floor(activeTrack.duration % 60).toString().padStart(2, '0')}`
              : '0:00'
            }
          </span>
        </div>
      </div>

      {/* 3. ГРОМКОСТЬ + КНОПКА ТЕКСТА */}
      <div className="w-1/3 flex justify-end items-center gap-4 group">
        <button
          onClick={() => setIsLyricsOpen(!isLyricsOpen)}
          title="Текст песни"
          className={`
            flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 active:scale-90 shadow-md flex-shrink-0
            ${isLyricsOpen
              ? 'bg-white text-black scale-105'
              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'
            }
          `}
        >
          <Quote size={12} className="transform rotate-180 flex-shrink-0" strokeWidth={3.5} />
        </button>

        <Volume2 size={18} className="text-zinc-400 group-hover:text-white transition flex-shrink-0" />
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="
            w-24 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer 
            accent-white flex-shrink-0
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