'use client'
import { usePlayer } from '../lib/usePlayer'
import { Play, Pause, Volume2, Music, SkipBack, SkipForward } from 'lucide-react'
import React, { useRef, useEffect, useState } from 'react' // ДОБАВИЛИ useState СЮДА

export default function Player() {
  const { activeTrack, isPlaying, setIsPlaying, playNext, playPrevious } = usePlayer();
  const audioRef = useRef<HTMLAudioElement>(null)

  // ПЕРЕНЕСЛИ ХУКИ ВНУТРЬ КОМПОНЕНТА
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('player_volume')) || 1;
    }
    return 1;
  });

  // ЭФФЕКТ ГОРЯЧИХ КЛАВИШ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем, если пользователь что-то печатает в полях ввода
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
  }, [isPlaying, setIsPlaying, volume]); // Зависимости важны для актуальных состояний

  // СИНХРОНИЗАЦИЯ ГРОМКОСТИ С ХРАНИЛИЩЕМ
  useEffect(() => {
    localStorage.setItem('player_volume', volume.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Функция обновления времени (нужна для ползунка)
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      setDuration(audioRef.current.duration)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    localStorage.setItem('player_volume', v.toString()); // Сохраняем выбор пользователя
    if (audioRef.current) audioRef.current.volume = v;
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
    setCurrentTime(0);

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

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        // Если скроллим вниз — скрываем, если вверх — показываем
        if (window.scrollY > lastScrollY && window.scrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  const [isForcedHidden, setIsForcedHidden] = useState(false);

  useEffect(() => {
    // Слушаем команду на скрытие/показ
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

      {/* Добавили onTimeUpdate в тег audio, чтобы время реально обновлялось */}
      <audio
        key={activeTrack?.id}
        ref={audioRef}
        src={activeTrack?.audio_url}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onTimeUpdate}
        onCanPlay={(e) => e.currentTarget.volume = volume}
        onEnded={() => playNext()}
        autoPlay={isPlaying}
      />

      {/* 1. ИНФО */}
      <div className="flex items-center gap-4 w-1/3">
        <div className="w-14 h-14 bg-zinc-800 rounded shadow-lg overflow-hidden flex items-center justify-center">
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
        {/* Кнопки управления */}
        <div className="flex items-center gap-6 text-zinc-400">
          <SkipBack
            onClick={() => usePlayer.getState().playPrevious()}
            className="hover:text-white cursor-pointer transition"
            size={24}
          />

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-white text-black rounded-full hover:scale-105 transition active:scale-95"
          >
            {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} />}
          </button>

          <SkipForward
            onClick={() => usePlayer.getState().playNext()}
            className="hover:text-white cursor-pointer transition"
            size={24}
          />
        </div>

        {/* Хотбар (Прогресс-бар) */}
        <div className="flex items-center gap-2 w-full text-[10px] text-zinc-500 font-mono mt-1">
          <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>

          {/* КЛИКАБЕЛЬНАЯ ОБЛАСТЬ */}
          <div
            onClick={handleProgressClick}
            className="flex-1 h-1.5 bg-zinc-800 rounded-full relative cursor-pointer group overflow-hidden"
          >
            {/* Сама полоска */}
            <div
              className="absolute h-full bg-zinc-400 group-hover:bg-white transition-all duration-100"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            {/* Ползунок (появляется при наведении) */}
            <div
              className="absolute h-3 w-3 bg-white rounded-full -top-[3px] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }}
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
