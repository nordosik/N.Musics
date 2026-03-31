'use client'
import { usePlayer } from '../lib/usePlayer'
import { Play } from 'lucide-react'

export default function TrackItem({ release }: { release: any }) {
  const { setActiveTrack } = usePlayer()

  return (
    <div 
      onClick={() => setActiveTrack(release)}
      className="group cursor-pointer bg-zinc-900/40 p-4 rounded-lg border border-transparent hover:border-zinc-700 transition-all"
    >
      <div className="aspect-square bg-zinc-800 rounded-md mb-4 flex items-center justify-center relative overflow-hidden shadow-lg">
        {release.cover_url ? (
            <img src={release.cover_url} className="w-full h-full object-cover" />
        ) : (
            <div className="text-zinc-700">MUSIC</div>
        )}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 drop-shadow-2xl">
          <div className="p-3 bg-white rounded-full text-black hover:scale-105 transition shadow-[0_8px_24px_rgba(0,0,0,0.5)]">
            <Play fill="black" size={20} />
          </div>
        </div>
      </div>
      <h3 className="font-bold truncate text-sm">{release.title}</h3>
      <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest font-medium">
        {release.is_album ? 'Album' : 'Single'} • {new Date(release.created_at).getFullYear()}
      </p>
    </div>
  )
}