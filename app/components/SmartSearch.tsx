'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchTrackRow from './SearchTrackRow'
import { Music, Pause, Play } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { locales } from '../lib/locales'

interface SmartSearchProps {
    externalQuery: string;
    onReleaseClick: (release: any) => void; // <--- ДОБАВИЛИ ТИП ФУНКЦИИ КЛИКА
}

export default function SmartSearch({ externalQuery, onReleaseClick }: SmartSearchProps) {
    const [tracks, setTracks] = useState<any[]>([])
    const [releases, setReleases] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const { activeTrack, isPlaying, setQueue, setIsPlaying } = usePlayer();

    const { language } = usePlayer();
    const t = locales[language as 'ru' | 'en' || 'en'];

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
                    {t.searchingDb}
                </div>
            )}

            {!isLoading && tracks.length === 0 && releases.length === 0 && (
                <div className="text-center text-xs font-bold text-zinc-500 tracking-widest uppercase py-12">
                    {t.nothingFound}
                </div>
            )}

            <div className="space-y-12">
                {/* СЕКЦИЯ 1: ТРЕКИ (В ДВЕ КОЛОНКИ) */}
                {tracks.length > 0 && (
                    <div>
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">{t.foundTracks}</h3>
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
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">{t.foundReleases}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {releases.map((release) => {
                                // Проверяем, играет ли сейчас трек из этого релиза
                                // (сверяем по полю release_id трека и названию релиза)
                                const isCurrentRelease = (activeTrack?.release_id === release.title || activeTrack?.title === release.title) && isPlaying;

                                // ВСТАВЛЯЕМ СЮДА (Функция быстрого старта музыки для поиска):
                                const handleQuickPlay = async (e: React.MouseEvent) => {
                                    e.stopPropagation(); // Блокируем открытие релиза

                                    // Если этот релиз уже активен — переключаем паузу/плей
                                    if (isCurrentRelease) {
                                        setIsPlaying(!isPlaying);
                                        return;
                                    }

                                    // Иначе фетчим треки из базы и запускаем
                                    const { data: releaseTracks } = await supabase
                                        .from('tracks')
                                        .select('*')
                                        .eq('release_id', release.title)
                                        .order('position', { ascending: true });

                                    if (releaseTracks && releaseTracks.length > 0) {
                                        const tracksWithCover = releaseTracks.map(t => ({ ...t, cover_url: release.cover_url }));
                                        setQueue(tracksWithCover, 0);
                                        setIsPlaying(true);
                                    } else {
                                        setQueue([release], 0);
                                        setIsPlaying(true);
                                    }
                                };

                                const isEcosystem = release.is_ecosystem
                                const isHot = release.is_hot

                                return (
                                    <div
                                        key={release.id}
                                        onClick={() => onReleaseClick(release)}
                                        /* СУРОВЫЙ КИБЕРПАНК: Подсветка карточек в поиске в тон маркерам */
                                        className={`p-4 rounded-xl cursor-pointer transition-all duration-500 group border flex flex-col h-full ${isCurrentRelease
                                                ? isEcosystem
                                                    ? 'bg-emerald-950/20 border-emerald-400 text-white shadow-[0_0_25px_rgba(52,211,153,0.35),inset_0_0_15px_rgba(52,211,153,0.15)] scale-[1.02]'
                                                    : isHot
                                                        ? 'bg-red-950/20 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.35),inset_0_0_15px_rgba(239,68,68,0.15)] scale-[1.02]'
                                                        : 'bg-zinc-800/20 border-white text-white shadow-[0_0_25px_rgba(255,255,255,0.2),inset_0_0_15px_rgba(255,255,255,0.05)] scale-[1.02]'
                                                : isEcosystem
                                                    ? 'bg-zinc-900/30 border-emerald-500/20 text-zinc-400 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.2)] hover:text-white'
                                                    : isHot
                                                        ? 'bg-zinc-900/30 border-red-500/20 animate-fire-glow text-zinc-400 hover:border-red-400 hover:text-white'
                                                        : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-400 hover:bg-zinc-800/30 hover:border-zinc-700 hover:text-white'
                                            }`}
                                    >
                                        <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden relative shadow-md mb-4 flex items-center justify-center">
                                            {release.cover_url ? (
                                                <img
                                                    src={release.cover_url}
                                                    alt={release.title}
                                                    className={`w-full h-full object-cover transition-transform duration-500 ${isCurrentRelease ? 'scale-105' : 'group-hover:scale-105'}`}
                                                />
                                            ) : (
                                                <Music className="text-zinc-600" size={32} />
                                            )}

                                            {/* ЖИВАЯ КНОПКА PLAY/PAUSE В ПОИСКЕ */}
                                            <button
                                                onClick={handleQuickPlay}
                                                className={`absolute bottom-3 right-3 transition-all duration-300 drop-shadow-2xl z-30 flex items-center justify-center p-2.5 bg-white text-black rounded-full hover:scale-110 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${isCurrentRelease ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'
                                                    }`}
                                            >
                                                {isCurrentRelease ? <Pause fill="black" size={16} /> : <Play fill="black" size={16} className="ml-0.5" />}
                                            </button>
                                        </div>

                                        <h4 className={`text-xs font-black uppercase tracking-wide truncate ${isCurrentRelease ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                            {release.title}
                                        </h4>

                                        {/* ПОДВАЛ КАРТОЧКИ С ГЕОМЕТРИЧЕСКИМИ ТЕГАМИ */}
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                                                {release.release_type === 'album' && t.album}
                                                {release.release_type === 'ep' && t.ep}
                                                {(release.release_type === 'single' || !release.release_type) && t.single}
                                                {release.created_at ? ` • ${new Date(release.created_at).getFullYear()}` : ''}
                                            </p>

                                            {isEcosystem && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399,0_0_4px_#34d399]" />
                                            )}
                                            {isHot && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-sm tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                                    HOT
                                                </span>
                                            )}
                                        </div>
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