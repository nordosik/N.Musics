'use client'

import { Play } from 'lucide-react';
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import UploadModal from './components/UploadModal';
import ReleaseModal from './components/ReleaseModal';
import { supabase } from './lib/supabase';
import TrackItem from './components/TrackItem'
import Hero from './components/Hero'
import SmartSearch from './components/SmartSearch'
import { useState, useEffect } from 'react'

function HomeContent() {
  const [releases, setReleases] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
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
    } else if (release.release_type === 'single' || !release.release_type) {
      // Обновили условие проверки на сингл
      setTracks([release]);
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100 pb-32">
      <Hero />

      <div className="px-8 mt-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight">
            {isSearching ? "Результаты поиска" : "Recent Releases"}
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative flex items-center" style={{ height: '40px' }}>
              <div className="absolute z-20 flex items-center justify-center pointer-events-none" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                <svg xmlns="http://w3.org" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
              </div>

              <input
                type="text"
                placeholder="Search tracks or releases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '44px' }}
                className="bg-[#121212] hover:bg-[#1a1a1a] text-white rounded-full pr-4 py-2 text-[14px] font-bold tracking-tight outline-none border border-zinc-800 focus:border-zinc-600 transition-all placeholder:text-zinc-600 w-48 md:w-64"
              />
            </div>
            {isAdmin && <UploadModal />}
          </div>
        </div>

        {isSearching ? (
          <SmartSearch
            externalQuery={searchQuery}
            onReleaseClick={handleOpenRelease}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {releases?.map((release, index) => (
              <TrackItem
                key={release.id || index}
                release={release}
                index={index}
                onClick={() => handleOpenRelease(release)}
              />
            ))}
          </div>
        )}
      </div>

      <ReleaseModal
        release={selectedRelease}
        tracks={tracks}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isAdmin={isAdmin}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}