'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchTrackRow from './SearchTrackRow'
import { Music, Pause, Play } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { locales } from '../lib/locales'

interface SmartSearchProps {
    externalQuery: string
    onReleaseClick: (release: any) => void
}

// Функция для безопасной подсветки текста (ч/б стиль)
const HighlightText = ({ text, query }: { text: string; query: string }) => {
    if (!query.trim()) return <>{text}</>;

    // Экранируем спецсимволы, чтобы поиск не сломался
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    // Вот тут настраиваем стиль подсветки (сделаем белый фон и черный текст для брутального контраста)
                    <span key={i} className="bg-white/20 text-white px-0.5 rounded-[2px] font-black shadow-[0_0_8px_rgba(255,255,255,0.15)]">
                        {part}
                    </span>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};

export default function SmartSearch({ externalQuery, onReleaseClick }: SmartSearchProps) {
    const [tracks, setTracks] = useState<any[]>([])
    const [releases, setReleases] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const activeTrack = usePlayer((state) => state.activeTrack)
    const isPlaying = usePlayer((state) => state.isPlaying)
    const setQueue = usePlayer((state) => state.setQueue)
    const setIsPlaying = usePlayer((state) => state.setIsPlaying)
    const language = usePlayer((state) => state.language)
    const [latestReleaseId, setLatestReleaseId] = useState<number | null>(null);
    const t = locales[language as 'ru' | 'en'] || locales.ru

    useEffect(() => {
        const fetchResults = async () => {
            if (!externalQuery.trim()) {
                setTracks([])
                setReleases([])
                return
            }

            setIsLoading(true)
            const cleanQuery = externalQuery.trim()

            try {
                // Получаем ID самого свежего релиза глобально
                const { data: latestData } = await supabase
                    .from('releases')
                    .select('id')
                    .order('id', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (latestData) setLatestReleaseId(latestData.id);

                // 1. Запрашиваем ТОЛЬКО существующие колонки у релизов
                const { data: allReleases } = await supabase
                    .from('releases')
                    .select('id, title, cover_url')

                // 2. Ищем треки
                const { data: trackData } = await supabase
                    .from('tracks')
                    .select('*')
                    .ilike('title', `%${cleanQuery}%`)
                    .limit(10)

                // 3. Ищем релизы
                const { data: releaseData } = await supabase
                    .from('releases')
                    .select('*')
                    .ilike('title', `%${cleanQuery}%`)
                    .limit(6)

                // 4. Привязываем обложку к треку из родительского релиза по release_id
                const formattedTracks =
                    trackData?.map((track: any) => {
                        const matchedRelease = allReleases?.find(
                            (r) => Number(r.id) === Number(track.release_id)
                        )

                        return {
                            ...track,
                            cover_url: matchedRelease?.cover_url || null,
                        }

                    }) || []

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
                    {t.searchingDb}
                </div>
            )}

            {!isLoading && tracks.length === 0 && releases.length === 0 && (
                <div className="text-center text-xs font-bold text-zinc-500 tracking-widest uppercase py-12">
                    {t.nothingFound}
                </div>
            )}

            <div className="space-y-12">
                {tracks.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">
                            {t.foundTracks}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tracks.map((track) => (
                                <SearchTrackRow key={track.id} track={track} allTracks={tracks} query={externalQuery} />
                            ))}
                        </div>
                    </div>
                )}

                {releases.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">
                            {t.foundReleases}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {releases.map((release) => {
                                const coverUrl = release.cover_url || release.image_url

                                const isCurrentRelease =
                                    isPlaying &&
                                    activeTrack &&
                                    (String(activeTrack.release_id) === String(release.id) ||
                                        activeTrack.release_id === release.title ||
                                        activeTrack.title === release.title)

                                const handleQuickPlay = async (e: React.MouseEvent) => {
                                    e.stopPropagation()

                                    if (isCurrentRelease) {
                                        setIsPlaying(!isPlaying)
                                        return
                                    }

                                    // 1. Проверяем напрямую по tracks
                                    let { data: releaseTracks } = await supabase
                                        .from('tracks')
                                        .select('*')
                                        .or(`release_id.eq.${release.id},release_id.eq."${release.title}"`)
                                        .order('position', { ascending: true })

                                    // 2. Если пустая выборка — смотрим через release_tracks
                                    if (!releaseTracks || releaseTracks.length === 0) {
                                        const { data: relLinks } = await supabase
                                            .from('release_tracks')
                                            .select('track_id')
                                            .eq('release_id', release.id)

                                        if (relLinks && relLinks.length > 0) {
                                            const trackIds = relLinks.map((l) => l.track_id)
                                            const { data: linkedTracks } = await supabase
                                                .from('tracks')
                                                .select('*')
                                                .in('id', trackIds)
                                            releaseTracks = linkedTracks
                                        }
                                    }

                                    if (releaseTracks && releaseTracks.length > 0) {
                                        const prepared = releaseTracks.map((t) => ({
                                            ...t,
                                            release_id: release.id, // <--- ДОБАВИЛИ СЮДА
                                            release_title: release.title,
                                            cover_url: t.cover_url || t.image_url || coverUrl,
                                        }))
                                        setQueue(prepared, 0)
                                        setIsPlaying(true)
                                    } else {
                                        // Если треков не нашли, запускаем сам релиз как трек
                                        setQueue([{
                                            ...release,
                                            cover_url: coverUrl,
                                            release_id: release.id // <--- ДОБАВИЛИ СЮДА
                                        }], 0)
                                        setIsPlaying(true)
                                    }
                                }

                                const isEcosystem = false;
                                // Маркер NEW только если ID совпадает с самым свежим релизом в базе
                                const isHot = release.id === latestReleaseId;

                                return (
                                    <div
                                        key={release.id}
                                        onClick={async () => {
                                            // 1. Сначала получаем полный список треков из связующей таблицы
                                            const { data: relTracksData } = await supabase
                                                .from('release_tracks')
                                                .select('track_number, tracks(*)')
                                                .eq('release_id', release.id)
                                                .order('track_number', { ascending: true });

                                            let finalTracks = [];

                                            if (relTracksData && relTracksData.length > 0) {
                                                // Если нашли в связующей таблице — мапим и обогащаем
                                                finalTracks = relTracksData
                                                    .filter((item: any) => item.tracks)
                                                    .map((item: any) => ({
                                                        ...item.tracks,
                                                        cover_url: item.tracks.cover_url || release.cover_url,
                                                        release_title: release.title,
                                                        release_id: release.id
                                                    }));
                                            } else {
                                                // Если пусто — делаем запасной запрос напрямую в tracks по release_id
                                                const { data: directTracks } = await supabase
                                                    .from('tracks')
                                                    .select('*')
                                                    .eq('release_id', release.id)
                                                    .order('position', { ascending: true });

                                                if (directTracks && directTracks.length > 0) {
                                                    finalTracks = directTracks.map(t => ({
                                                        ...t,
                                                        cover_url: t.cover_url || release.cover_url,
                                                        release_title: release.title
                                                    }));
                                                }
                                            }

                                            // 2. Открываем модалку с ПОЛНЫМ списком треков
                                            onReleaseClick({
                                                ...release,
                                                tracks: finalTracks.length > 0 ? finalTracks : release.tracks || []
                                            });
                                        }}
                                        className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ease-in-out group border flex flex-col h-full ${isCurrentRelease
                                            ? isEcosystem
                                                ? 'bg-emerald-950/20 border-emerald-400 text-white shadow-[0_0_25px_rgba(52,211,153,0.35),inset_0_0_15px_rgba(52,211,153,0.15)] scale-[1.02]'
                                                : isHot
                                                    ? 'bg-cyan-950/20 border-cyan-300 text-white shadow-[0_0_25px_rgba(34,211,238,0.3),inset_0_0_15px_rgba(34,211,238,0.15)] scale-[1.02]' // Активен
                                                    : 'bg-zinc-800/20 border-white text-white shadow-[0_0_25px_rgba(255,255,255,0.2),inset_0_0_15px_rgba(255,255,255,0.05)] scale-[1.02]'
                                            : isEcosystem
                                                ? 'bg-zinc-900/30 border-emerald-500/40 text-zinc-400 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:text-white'
                                                : isHot
                                                    ? 'bg-zinc-900/30 border-cyan-500/30 text-zinc-400 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:text-white' // Пассив и Ховер
                                                    : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/30 hover:border-zinc-700 hover:text-white'
                                            }`}
                                    >
                                        <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden relative shadow-md mb-4 flex items-center justify-center">
                                            {coverUrl ? (
                                                <img
                                                    src={coverUrl}
                                                    alt={release.title}
                                                    className={`w-full h-full object-cover transition-transform duration-500 transform-gpu will-change-transform ${isCurrentRelease ? 'scale-105' : 'group-hover:scale-105'
                                                        }`}
                                                />
                                            ) : (
                                                <Music className="text-zinc-600" size={32} />
                                            )}

                                            <button
                                                onClick={handleQuickPlay}
                                                className={`absolute bottom-3 right-3 transition-all duration-300 drop-shadow-2xl z-30 flex items-center justify-center p-2.5 bg-white text-black rounded-full hover:scale-110 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${isCurrentRelease
                                                    ? 'opacity-100 translate-y-0 scale-100'
                                                    : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
                                                    }`}
                                            >
                                                {isCurrentRelease && isPlaying ? (
                                                    <Pause fill="black" size={16} />
                                                ) : (
                                                    <Play fill="black" size={16} className="ml-0.5" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Перенос названия до 3 строк без срезки и с сохранением исходного регистра */}
                                        <h4
                                            className={`text-xs font-bold leading-snug line-clamp-3 break-words whitespace-normal transition-colors duration-300 ${isCurrentRelease ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}
                                        >
                                            <HighlightText text={release.title} query={externalQuery} />
                                        </h4>

                                        <div className="flex flex-wrap items-center gap-2 mt-auto pt-2">
                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                                {release.release_type === 'album' && t.album}
                                                {release.release_type === 'ep' && t.ep}
                                                {(release.release_type === 'single' || !release.release_type) && t.single}
                                                {release.created_at
                                                    ? ` • ${new Date(release.created_at).getFullYear()}`
                                                    : ''}
                                            </p>
                                            {isEcosystem && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 rounded-sm tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.15)] flex-shrink-0">
                                                    SINGLE
                                                </span>
                                            )}
                                            {isHot && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-sm tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.15)] flex-shrink-0">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}