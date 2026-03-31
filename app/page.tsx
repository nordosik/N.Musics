import { Play, Plus, Music, Disc } from 'lucide-react';
import UploadModal from './components/UploadModal';
import { supabase } from './lib/supabase';
import TrackItem from './components/TrackItem'

export const revalidate = 0;
export default async function Home() {
  // Получаем список всех релизов из базы
  const { data: releases, error } = await supabase.from('releases').select('*')
  if (error) return <div>Ошибка базы: {error.message}</div>
  if (!releases?.length) return <div>В базе пусто (хотя ты их там видишь)</div>


  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100 pb-32">
      {/* 1. ШАПКА / БАННЕР */}
      <div className="relative h-64 w-full bg-gradient-to-b from-zinc-800 to-[#050505] p-8 flex items-end">
        <div className="flex items-center gap-6 z-10">
          {/* Аватарка/Лого */}
          <div className="w-32 h-32 bg-white shadow-2xl rounded-sm flex items-center justify-center">
            <Disc className="w-16 h-16 text-black animate-spin-slow" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Artist Profile</span>
            <h1 className="text-6xl font-black tracking-tighter mt-1">NORDOSIK</h1>
            <p className="text-zinc-400 mt-2">N.Music • Personal Discography</p>
          </div>
        </div>
        {/* Абстрактный декор на фоне */}
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <Music size={200} />
        </div>
      </div>

      {/* 2. КОНТЕНТ */}
      <div className="px-8 mt-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Recent Releases</h2>
          <UploadModal /> 
        </div>

        {/* СЕТКА РЕЛИЗОВ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {releases?.map((release, index) => (
            <TrackItem key={release.id || index} release={release} />
          ))}
        </div>
      </div>

      {/* 3. ПЛЕЕР (FIXED) */}
      <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-zinc-800 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-14 h-14 bg-zinc-800 rounded"></div>
          <div>
            <div className="text-sm font-medium hover:underline cursor-pointer">Not Playing</div>
            <div className="text-xs text-zinc-500">Select a track</div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="flex items-center gap-6 text-zinc-400">
            <Play className="hover:text-white transition cursor-pointer" fill="currentColor" size={28} />
          </div>
          <div className="w-full max-w-md h-1 bg-zinc-800 rounded-full">
            <div className="w-0 h-full bg-white rounded-full"></div>
          </div>
        </div>

        <div className="w-1/3 flex justify-end text-zinc-400">
          <div className="text-xs uppercase tracking-widest font-bold">N.Music Player</div>
        </div>
      </div>
    </main>
  );
}