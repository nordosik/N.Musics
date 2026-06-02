'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchTrackRow from './SearchTrackRow'
import { Music } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'

interface SmartSearchProps {
    externalQuery: string;
    onReleaseClick: (release: any) => void; // <--- ДОБАВИЛИ ТИП ФУНКЦИИ КЛИКА
}

export default function SmartSearch({ externalQuery, onReleaseClick }: SmartSearchProps) {
    const [tracks, setTracks] = useState<any[]>([])
    const [releases, setReleases] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const { activeTrack, isPlaying } = usePlayer();

    useEffect(() => {
        const fetchResults = async () => {
            if (!externalQuery.trim()) {
                setTracks([])
                setReleases([])
                return
            }

            setIsLoading(true)
            const cleanQuery = externalQuery.trim();

            try {
                // 1. Возвращаем простой и стабильный запрос треков без сложных связей
                const { data: trackData } = await supabase
                    .from('tracks')
                    .select('*')
                    .ilike('title', `${cleanQuery}%`)
                    .limit(10)

                // 2. Обычный запрос релизов
                const { data: releaseData } = await supabase
                    .from('releases')
                    .select('*')
                    .ilike('title', `${cleanQuery}%`)
                    .limit(6)

                // 3. УМНАЯ СКЛЕЙКА ОБЛОЖЕК:
                // Вытягиваем вообще все релизы, чтобы сопоставить обложки для найденных треков
                const { data: allReleases } = await supabase
                    .from('releases')
                    .select('title, cover_url');

                const formattedTracks = trackData?.map((track: any) => {
                    // Ищем обложку: либо по release_id (для альбомов), либо по названию трека (для синглов)
                    const matchedRelease = allReleases?.find(
                        (r) => r.title === track.release_id || r.title === track.title
                    );

                    return {
                        ...track,
                        // Если нашли обложку в релизах — вшиваем её, иначе оставляем что было
                        cover_url: matchedRelease?.cover_url || track.cover_url || null
                    };
                }) || [];

                setTracks(formattedTracks)
                setReleases(releaseData || [])
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setIsLoading(false)
            }
        }

        const delayDebounce = setTimeout(() => {
            fetchResults()
        }, 300)

        return () => clearTimeout(delayDebounce)
    }, [externalQuery])

    return (
        <div className="w-full text-white animate-in fade-in duration-300">
            {isLoading && (
                <div className="text-center text-xs font-bold text-zinc-500 tracking-widest uppercase py-12">
                    Поиск по базе...
                </div>
            )}

            {!isLoading && tracks.length === 0 && releases.length === 0 && (
                <div className="text-center text-xs font-bold text-zinc-500 tracking-widest uppercase py-12">
                    Ничего не найдено (строгое совпадение по первой букве)
                </div>
            )}

            <div className="space-y-12">
                {/* СЕКЦИЯ 1: ТРЕКИ (В ДВЕ КОЛОНКИ) */}
                {tracks.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Найденные треки</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tracks.map((track) => (
                                <SearchTrackRow key={track.id} track={track} allTracks={tracks} />
                            ))}
                        </div>
                    </div>
                )}

                {/* СЕКЦИЯ 2: РЕЛИЗЫ (ТЕПЕРЬ С АКТИВНОЙ ПОДСВЕТКОЙ) */}
                {releases.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">Найденные релизы</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {releases.map((release) => {
                                // Проверяем, играет ли сейчас трек из этого релиза
                                // (сверяем по полю release_id трека и названию релиза)
                                const isCurrentRelease = (activeTrack?.release_id === release.title || activeTrack?.title === release.title) && isPlaying;

                                return (
                                    <div
                                        key={release.id}
                                        onClick={() => onReleaseClick(release)}
                                        className={`
                                                p-4 rounded-xl cursor-pointer transition-all duration-300 group border
                                                ${isCurrentRelease
                                                ? 'bg-zinc-800/20 border-white text-white shadow-[0_0_18px_rgba(255,255,255,0.15)] scale-[1.02]'
                                                : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/30 hover:border-zinc-700 hover:text-white'
                                            }
                    `}
                                    >
                                        <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden relative shadow-md mb-4 flex items-center justify-center">
                                            {release.cover_url ? (
                                                <img
                                                    src={release.cover_url}
                                                    alt={release.title}
                                                    className={`w-full h-full object-cover transition-transform duration-300 ${isCurrentRelease ? 'scale-105' : 'group-hover:scale-105'}`}
                                                />
                                            ) : (
                                                <Music className="text-zinc-600" size={32} />
                                            )}
                                        </div>
                                        <h4 className={`text-xs font-black uppercase tracking-wide truncate ${isCurrentRelease ? 'text-white' : ''}`}>
                                            {release.title}
                                        </h4>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                            {release.is_album ? 'ALBUM' : 'SINGLE'} • 2026
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}