'use client'

import { Play } from 'lucide-react';
import { useSearchParams } from 'next/navigation'
import UploadModal from './components/UploadModal';
import ReleaseModal from './components/ReleaseModal';
import { supabase } from './lib/supabase';
import TrackItem from './components/TrackItem'
import Hero from './components/Hero'
import { useState, useEffect } from 'react'

export default function Home() {
  const [releases, setReleases] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('') // Добавили стейт поиска
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const secretKey = 'topsecret'
      if (searchParams.get('admin') === secretKey) {
        setIsAdmin(true)
        localStorage.setItem('admin_access', 'true')
        return
      }
      if (localStorage.getItem('admin_access') === 'true') {
        setIsAdmin(true)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      const ADMIN_ID = '1537751f-7b84-4530-984d-9a64b6098e51';
      if (user && user.id === ADMIN_ID) {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [searchParams])

  useEffect(() => {
    const fetchReleases = async () => {
      const { data } = await supabase
        .from('releases')
        .select('*')
        .order('id', { ascending: false })
      if (data) setReleases(data)
    }
    fetchReleases()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('modal-open', isModalOpen);
  }, [isModalOpen]);

  // Логика фильтрации (добавили одну переменную)
  const filteredReleases = releases.filter((release) =>
    release.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenRelease = async (release: any) => {
    setSelectedRelease(release);
    setIsModalOpen(true);
    setTracks([]);

    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('release_id', release.title)
      .order('position', { ascending: true });

    if (error) {
      console.error("Ошибка Supabase:", error.message);
      return;
    }

    if (data && data.length > 0) {
      const tracksWithCover = data.map(t => ({ ...t, cover_url: release.cover_url }));
      setTracks(tracksWithCover);
    } else if (!release.is_album) {
      setTracks([release]);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100 pb-32">
      <Hero />

      <div className="px-8 mt-12">
        {/* ВОЗВРАЩАЕМ ТВОЮ РОДНУЮ СТРУКТУРУ ФЛЕКСОВ */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Recent Releases</h2>

          {/* Добавляем инпут прямо сюда, между заголовком и кнопкой */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center" style={{ height: '40px' }}>
              {/* Иконка лупы — теперь она внутри и не мешает */}
              <div className="absolute z-20 flex items-center justify-center pointer-events-none" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <svg
                  xmlns="http://w3.org"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"               
                  stroke="#71717a"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>

              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '44px' }}
                className="bg-[#121212] hover:bg-[#1a1a1a] text-white rounded-full pr-4 py-2 text-[14px] font-bold tracking-tight outline-none border border-zinc-800 focus:border-zinc-600 transition-all placeholder:text-zinc-600 w-48 md:w-64"
              />
            </div>
            {isAdmin && <UploadModal />}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {/* Мапим теперь filteredReleases вместо обычного releases */}
          {filteredReleases?.map((release, index) => (
            <TrackItem
              key={release.id || index}
              release={release}
              index={index}
              onClick={() => handleOpenRelease(release)}
            />
          ))}
        </div>
      </div>

      <ReleaseModal
        release={selectedRelease}
        tracks={tracks}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <div className="fixed bottom-0 left-0 right-0 h-24 bg-black/80 backdrop-blur-xl border-t border-zinc-800 px-6 flex items-center justify-between z-50">
        <div className="flex items-center gap-4 w-1/3">
          <div className="w-14 h-14 bg-zinc-800 rounded overflow-hidden">
            {selectedRelease && <img src={selectedRelease.cover_url} className="w-full h-full object-cover" alt="" />}
          </div>
          <div>
            <div className="text-sm font-medium hover:underline cursor-pointer">
              {selectedRelease?.title || "Not Playing"}
            </div>
            <div className="text-xs text-zinc-500">NORDOSIK</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 w-1/3">
          <div className="flex items-center gap-6 text-zinc-400">
            <Play className="hover:text-white transition cursor-pointer" fill="currentColor" size={28} />
          </div>
          <div className="relative w-full h-1 bg-zinc-800 rounded-full group cursor-pointer">
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