'use client'
import { Play, Music, Disc } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePlayer } from '../lib/usePlayer'

interface TrackItemProps {
  release: any;
  index: number;
  onClick: () => void;
}

export default function TrackItem({ release, index, onClick }: TrackItemProps) {
  const { isPlaying, activeTrack } = usePlayer()

  // Проверка: играет ли сейчас этот конкретный релиз
  const isCurrentActive = isPlaying && activeTrack && (
    // 1. Если ID трека совпадает с ID релиза (для синглов)
    activeTrack.id === release.id ||
    // 2. Если в треке указано название этого релиза (для альбомов)
    activeTrack.release_id === release.title
  );

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      onClick={onClick}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.01 }}
      variants={variants}
      transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.05 }}
      className={`group cursor-pointer p-4 rounded-md transition-all duration-500 border-2 box-border flex flex-col h-full ${isCurrentActive
          ? 'bg-zinc-800/80 border-white shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-[1.02]'
          : 'bg-zinc-900/40 border-transparent hover:bg-zinc-800/60'
        }`}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="aspect-square bg-zinc-800 rounded-md mb-4 flex items-center justify-center relative overflow-hidden shadow-lg"
      >
        {release.cover_url ? (
          <img
            src={release.cover_url}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt={release.title}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            {/* Если это альбом или EP — рисуем диск, иначе (сингл) — ноту */}
            {release.release_type === 'album' || release.release_type === 'ep' ? (
              <Disc className="text-zinc-600 w-12 h-12 animate-[spin_8s_linear_infinite]" />
            ) : (
              <Music className="text-zinc-600 w-12 h-12" />
            )}
          </div>
        )}

        {/* Кнопка Play в стиле Spotify */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 drop-shadow-2xl">
          <div className="p-3 bg-white rounded-full text-black hover:scale-110 transition shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <Play fill="black" size={20} />
          </div>
        </div>
      </motion.div>

      <h3 className="font-bold text-sm text-white leading-tight break-words line-clamp-2">
        {release.title}
      </h3>

      {/* ДИНАМИЧЕСКИЙ ВЫВОД ТИПА РЕЛИЗА (SINGLE, EP, ALBUM) */}
      <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest font-medium">
        {release.release_type === 'album' && 'Album'}
        {release.release_type === 'ep' && 'EP'}
        {release.release_type === 'single' && 'Single'}
        {!release.release_type && 'Single'} • {new Date(release.created_at || Date.now()).getFullYear()}
      </p>
    </motion.div>
  );
}