'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { usePlayer } from '../lib/usePlayer'
import { locales } from '../lib/locales'
import { Clock, Calendar } from 'lucide-react'

export default function ScheduledReleaseBanner() {
  const [scheduledReleases, setScheduledReleases] = useState<any[]>([])
  const [timeLeft, setTimeLeft] = useState<Record<number, string>>({})
  const language = usePlayer(state => state.language)
  const t = locales[language as 'ru' | 'en'] || locales.ru

  // 1. Загружаем запланированные релизы
  useEffect(() => {
    const fetchScheduled = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('releases')
        .select('*')
        .not('scheduled_at', 'is', null)
        .gt('scheduled_at', now)
        .eq('is_scheduled_visible', true) // <--- ДОБАВИЛИ ЭТО
        .order('scheduled_at', { ascending: true });

      if (data) setScheduledReleases(data);
    }
    fetchScheduled();

    // Обновляем список каждую минуту на случай, если что-то поменялось
    const interval = setInterval(fetchScheduled, 60000);
    return () => clearInterval(interval);
  }, [])

  // 2. Таймер обратного отсчета
  useEffect(() => {
    if (scheduledReleases.length === 0) return;

    const timer = setInterval(() => {
      const newTimeLeft: Record<number, string> = {};
      const now = new Date().getTime();

      scheduledReleases.forEach(release => {
        const target = new Date(release.scheduled_at).getTime();
        const diff = target - now;

        if (diff <= 0) {
          newTimeLeft[release.id] = t.released;

          // Если время вышло, через 5 секунд удаляем релиз из списка
          // (Используем setTimeout, чтобы не блокировать основной поток)
          setTimeout(() => {
            setScheduledReleases(prev => prev.filter(r => r.id !== release.id));
          }, 5000);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          let str = '';
          const isRu = language === 'ru';

          if (days > 0) str += `${days}${isRu ? 'д' : 'd'} `;
          if (hours > 0) str += `${hours}${isRu ? 'ч' : 'h'} `;
          if (minutes > 0) str += `${minutes}${isRu ? 'м' : 'm'} `;
          str += `${seconds}${isRu ? 'с' : 's'}`;
          newTimeLeft[release.id] = str;
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [scheduledReleases, language]);

  if (scheduledReleases.length === 0) return null;

  return (
    <div className="w-full mb-8 space-y-3">
      <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] px-2 flex items-center gap-2">
        <Calendar size={12} /> {t.scheduledReleases}
      </h3>

      <AnimatePresence>
        {scheduledReleases.map(release => (
          <motion.div
            key={release.id}
            initial={{ opacity: 0, height: 0, marginBottom: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12, y: 0 }} // 12 это gap между плашками
            exit={{ opacity: 0, height: 0, marginBottom: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="relative flex items-center gap-5 p-4 bg-zinc-900/40 border border-white/20 rounded-xl overflow-hidden group backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:border-white/40 transition-colors"
          >
            {/* АНИМИРОВАННЫЙ ГРАДИЕНТ (ШИММЕР) */}
            <div className="animate-shimmer" />

            {/* Левая полоска-индикатор */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10" />

            {/* Обложка */}
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-lg relative z-10">
              <img src={release.cover_url || '/default.png'} alt={release.title} className="w-full h-full object-cover" />
            </div>

            {/* Инфо */}
            <div className="flex flex-col min-w-0 flex-1 relative z-10">
              <h4 className="text-sm font-black text-white truncate tracking-wide">{release.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  {new Date(release.scheduled_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">•</span>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  {release.release_type === 'album' && t.album}
                  {release.release_type === 'ep' && t.ep}
                  {(release.release_type === 'single' || !release.release_type) && t.single}
                </span>
              </div>
            </div>

            {/* Таймер */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg flex-shrink-0 relative z-10">
              <Clock size={14} className="text-zinc-400" />
              <span className="text-sm font-mono font-bold text-white tracking-tighter">
                {timeLeft[release.id] || '...'}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}