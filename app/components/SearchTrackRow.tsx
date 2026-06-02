'use client'
import { Play, Music } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { motion } from 'framer-motion'

interface Track {
  id: string | number;
  title: string;
  audio_url: string;
  cover_url?: string;
  duration: number;
  lyrics?: string;
}

interface SearchTrackRowProps {
  track: Track;
  allTracks: Track[];
}

export default function SearchTrackRow({ track, allTracks }: SearchTrackRowProps) {
  const { activeTrack, isPlaying, setQueue, setIsPlaying } = usePlayer()

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

  return (
    <div
      onClick={handlePlayClick}
      className={`
        w-full h-14 rounded-lg px-4 flex items-center justify-between cursor-pointer group border transition-all duration-300
        ${isCurrentTrackPlaying
          ? 'bg-zinc-800/40 border-zinc-700 shadow-md scale-[1.01]'
          : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700'
        }
      `}
    >
      {/* ЛЕВАЯ ЧАСТЬ: Иконка / Родной эквалайзер + Мини-обложка + Название */}
      <div className="flex items-center gap-x-3 truncate flex-1 mr-4">

        {/* ИКОНКА ИЛИ ИДЕАЛЬНЫЙ ЭКВАЛАЙЗЕР */}
        <div className="w-5 h-5 flex items-center justify-center text-zinc-500 group-hover:text-white transition-colors flex-shrink-0">
          {isCurrentTrackPlaying ? (
            /* ТОЧНАЯ КОПИЯ ОРИГИНАЛЬНОГО ЭКВАЛАЙЗЕРА НА FRAMER-MOTION */
            <div className="flex items-end gap-[2px] h-3">
              <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-white" />
              <motion.div animate={{ height: [12, 4, 12] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[2px] bg-white" />
              <motion.div animate={{ height: [6, 12, 6] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[2px] bg-white" />
            </div>
          ) : isSelectedTrack && !isPlaying ? (
            <Play size={12} className="text-zinc-400 fill-current" />
          ) : (
            <Play size={12} className="opacity-0 group-hover:opacity-100 fill-current text-zinc-400 transition-opacity" />
          )}
        </div>

        {/* МИНИ-ОБЛОЖКА ТРЕКА */}
        <div className="w-8 h-8 bg-zinc-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md">
          {track.cover_url ? (
            <img src={track.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className="text-zinc-600" size={14} />
          )}
        </div>

        {/* МЕТАДАННЫЕ ТРЕКА */}
        <div className="truncate">
          <h4 className={`
            text-xs font-black uppercase tracking-wide truncate transition-colors duration-300
            ${isCurrentTrackPlaying
              ? 'text-white'
              : 'text-zinc-400 group-hover:text-white'
            }
          `}>
            {track.title}
          </h4>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
            NORDOSIK
          </p>
        </div>

      </div>

      {/* ПРАВАЯ ЧАСТЬ: Время */}
      <div className="text-[10px] text-zinc-500 font-mono flex-shrink-0 group-hover:text-zinc-400 transition-colors duration-300">
        {formatDuration(track.duration)}
      </div>
    </div>
  )
}