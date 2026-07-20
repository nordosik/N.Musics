'use client'
import { Play, Music } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { motion } from 'framer-motion'
import { useState, useEffect, memo } from 'react'
import { locales } from '../lib/locales'

interface Track {
  id: string | number;
  title: string;
  audio_url: string;
  cover_url?: string;
  duration: number;
  lyrics?: string;
  is_ecosystem?: boolean;
  is_hot?: boolean;
}

interface SearchTrackRowProps {
  track: Track;
  allTracks: Track[];
}

function SearchTrackRow({ track, allTracks }: SearchTrackRowProps) {
  const activeTrack = usePlayer(state => state.activeTrack);
  const isPlaying = usePlayer(state => state.isPlaying);
  const setQueue = usePlayer(state => state.setQueue);
  const setIsPlaying = usePlayer(state => state.setIsPlaying);
  const language = usePlayer(state => state.language);

  const t = locales[language as 'ru' | 'en' || 'en'];

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Условия активности трека
  const isCurrentTrackPlaying = activeTrack?.id === track.id && isPlaying
  const isSelectedTrack = activeTrack?.id === track.id

  const handlePlayClick = () => {
    if (isSelectedTrack) {
      setIsPlaying(!isPlaying)
    } else {
      const idx = allTracks.findIndex(t => t.id === track.id)
      setQueue(allTracks, idx !== -1 ? idx : 0)
    }
  }

  const formatDuration = (s: number) => {
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  const isEcosystem = track.is_ecosystem
  const isHot = track.is_hot

  return (
    <div
      onClick={handlePlayClick}
      className={`w-full h-14 rounded-lg px-4 flex items-center justify-between cursor-pointer group border transition-all duration-300 relative ${isCurrentTrackPlaying
          ? isEcosystem
            ? 'bg-emerald-950/20 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35),inset_0_0_12px_rgba(52,211,153,0.15)] scale-[1.01]'
            : isHot
              ? 'bg-red-950/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35),inset_0_0_12px_rgba(239,68,68,0.15)] scale-[1.01]'
              : 'bg-zinc-800/40 border-zinc-700 shadow-md scale-[1.01]'
          : isEcosystem
            ? 'bg-zinc-900/40 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]'
            : isHot
              ? 'bg-zinc-900/40 border-red-500/20 animate-fire-glow hover:border-red-500/40'
              : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700'
        }`}
    >
      {/* ЛЕВАЯ ЧАСТЬ: Иконка / Родной эквалайзер + Мини-обложка + Название */}
      <div className="flex items-center gap-x-3 truncate flex-1 mr-4">
        <div className="w-5 h-5 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors flex-shrink-0">
          {isMounted && (
            isCurrentTrackPlaying ? (
              <MiniEqualizer />
            ) : isSelectedTrack && !isPlaying ? (
              <Play size={12} className="text-zinc-400 fill-current" />
            ) : (
              <Play size={12} className="opacity-0 group-hover:opacity-100 fill-current text-zinc-400 transition-opacity" />
            )
          )}
        </div>

        {/* МИНИ-ОБЛОЖКА ТРЕКА */}
        <div className="w-8 h-8 bg-zinc-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md">
          {track.cover_url ? (
            <img src={track.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Music className="text-zinc-600" size={14} />
          )}
        </div>

        {/* МЕТАДАННЫЕ ТРЕКА */}
        <div className="truncate">
          <h4 className={`text-xs font-black uppercase tracking-wide truncate transition-colors duration-300 ${isCurrentTrackPlaying ? 'text-white' : 'text-zinc-400 group-hover:text-white'
            }`}>
            {track.title}
          </h4>

          {/* ФИКС: Безопасный рендеринг локализации (защита от Hydration Mismatch) */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isSelectedTrack ? 'text-zinc-400' : 'text-zinc-500'}`}>
              NORDOSIK
            </span>
            {isEcosystem && (
              <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500/80">
                {isMounted ? t.singleReleaseNotice : 'Single'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: ГЕОМЕТРИЧЕСКИЕ МАРКЕРЫ + ВРЕМЯ (С фиксомstopPropagation) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-3 flex-shrink-0 relative z-20"
      >
        {isEcosystem && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399,0_0_4px_#34d399]" />
        )}

        {isHot && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
            HOT
          </span>
        )}
        <div className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-400 transition-colors duration-300 w-11 text-right select-none">
          {formatDuration(track.duration)}
        </div>
      </div>
    </div>
  )
}

const MiniEqualizer = memo(() => {
  return (
    <div className="flex items-end gap-[2px] h-3 pointer-events-none isolate transform-gpu">
      <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-white" />
      <motion.div animate={{ height: [2, 12, 2] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[2px] bg-white" />
      <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[2px] bg-white" />
    </div>
  );
});
MiniEqualizer.displayName = 'MiniEqualizer';

export default memo(SearchTrackRow);