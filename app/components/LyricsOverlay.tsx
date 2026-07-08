'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../lib/usePlayer'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Save, Edit3, Eye } from 'lucide-react'
import { locales } from '../lib/locales'

// Функция преобразует текст плеера в структурированный караоке-массив
function parseLyrics(rawText: string) {
  if (!rawText) return [];
  const lines = rawText.split('\n');
  const timeRegex = /^\[(\d+):(\d+(?:\.\d+)?)]/;

  return lines.map((line) => {
    const match = timeRegex.exec(line.trim());
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = line.replace(timeRegex, '').trim();
      return { time, text, isTimed: true };
    }
    return { time: -1, text: line, isTimed: false };
  });
}

export default function LyricsOverlay({ isAdmin = false }: { isAdmin?: boolean }) {
  const { isLyricsOpen, setIsLyricsOpen, activeTrack, lyricsScrollPositions, setLyricsScrollPosition, language, currentTime } = usePlayer()
  const [isClient, setIsClient] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [lyricsText, setLyricsText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const t = locales[language as 'ru' | 'en' || 'en'];

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (activeTrack) {
      setLyricsText(activeTrack.lyrics || '')
    }
  }, [activeTrack])

  useEffect(() => {
    if (isLyricsOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.setProperty('overflow', 'hidden', 'important')
      setIsUserScrolling(false)
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.removeProperty('overflow')
      setIsEditing(false)
      setIsUserScrolling(false)
    }

    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.removeProperty('overflow')
      setIsUserScrolling(false)
    }
  }, [isLyricsOpen])

  const handleScroll = () => {
    if (activeTrack && scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollTop;
      setLyricsScrollPosition(activeTrack.id, currentScroll);
    }
  };

  const [isUserScrolling, setIsUserScrolling] = useState(false);

  if (!isClient) return null

  const hasNoLyrics = !activeTrack || !activeTrack.lyrics || activeTrack.lyrics.trim() === '';
  const lyricsLines = hasNoLyrics
    ? [t.noLyricsLine1, t.noLyricsLine2]
    : activeTrack?.lyrics?.split('\n') || [];

  return (
    <AnimatePresence>
      {isLyricsOpen && (
        /* Превратили в motion.div и зашили ультра-быструю скорость закрытия 0.15 сек */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-black/95 backdrop-blur-xl"
          style={{ zIndex: 40 }}
        >
          {/* КЛИК ПО ФОНУ ДЛЯ ЗАКРЫТИЯ */}
          <div
            className="absolute inset-0 z-0 cursor-zoom-out"
            onClick={() => !isEditing && setIsLyricsOpen(false)}
          />

          {/* ДИНАМИЧЕСКИЙ ЭМБИЕНТ-ФОН V0.2.0 */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
            <AnimatePresence mode="popLayout">
              {activeTrack?.cover_url && (
                <motion.img
                  key={`ambient-bg-${activeTrack.id}`} // Ключ заставит картинки плавно сменять друг друга при переключении песен
                  src={activeTrack.cover_url}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 0.35, scale: 1 }} // Прозрачность 35% — чтобы задник не слепил глаза и текст отлично читался
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }} // Плавное перетекание цветов за 0.8 секунды
                  className="w-full h-full object-cover filter blur-[80px] md:blur-[120px] saturate-[1.6] transform-gpu scale-105"
                  alt=""
                />
              )}
            </AnimatePresence>
            {/* Дополнительное затемнение поверх размытия, чтобы караоке оставалось глубоким и стильным */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
          </div>

          {/* КНОПКИ УПРАВЛЕНИЯ ДЛЯ АДМИНА */}
          {isAdmin && (
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-full transition text-xs font-black uppercase tracking-widest active:scale-95"
              >
                {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
                {isEditing ? t.preview : t.editLyrics}
              </button>

              {isEditing && (
                <button
                  onClick={async () => {
                    if (!activeTrack || !isAdmin) return
                    setIsSaving(true)
                    try {
                      const { error } = await supabase.from('tracks').update({ lyrics: lyricsText }).eq('id', activeTrack.id)
                      if (error) throw error
                      usePlayer.setState({ activeTrack: { ...activeTrack, lyrics: lyricsText } })
                      setIsEditing(false)
                    } catch (e: any) {
                      alert(`${t.saveLyricsError} ${e.message}`)
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full transition text-xs font-black uppercase tracking-widest hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? t.saving : t.save}
                </button>
              )}
            </div>
          )}

          {/* КОНТЕНТ ОКНА */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`relative z-10 w-full max-w-6xl h-full flex flex-col px-6 md:px-8 text-white pb-36 ${hasNoLyrics && !isEditing ? 'justify-center items-center' : 'justify-start pt-24'}`}
          >
            {isEditing && isAdmin ? (
              <div className="w-full flex-1 flex flex-col gap-4">
                <div className="text-center mb-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">{t.editingLyricsFor}</span>
                  <h3 className="text-xl font-black uppercase tracking-tight text-white">{activeTrack?.title}</h3>
                </div>
                <textarea
                  value={lyricsText}
                  onChange={(e) => setLyricsText(e.target.value)}
                  placeholder="Вставь текст песни сюда, Nordosik..."
                  className="w-full flex-1 bg-white/[0.02] border border-white/5 p-6 rounded-3xl text-lg md:text-xl font-black text-center text-zinc-200 outline-none focus:border-white/20 transition resize-none custom-scrollbar tracking-tight focus:bg-white/[0.04]"
                />
              </div>
            ) : (
              /* НАВЕСИЛИ onScroll НА КОНТЕНТНЫЙ ДИВ */
              <motion.div
                key={`lyrics-track-fade-container-${activeTrack?.id || 'empty'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onWheel={() => { if (!isEditing) setIsUserScrolling(true); }}
                onTouchMove={() => { if (!isEditing) setIsUserScrolling(true); }}
                className={`overflow-y-auto custom-scrollbar text-center selection:bg-white selection:text-black w-full ${hasNoLyrics ? 'flex items-center justify-center' : 'flex-1 pr-2'}`}
              >
                <div className={`flex flex-col w-full ${hasNoLyrics ? 'gap-y-3' : 'gap-y-6 py-6'}`}>
                  {(() => {
                    // ФИКС: Если текста реально нет — сразу жестко рендерим заглушку по центру экрана, не запуская парсер
                    if (hasNoLyrics) {
                      return (
                        <div className="flex flex-col items-center justify-center gap-3 my-auto w-full px-6 select-none animate-pulse">
                          <p className="text-zinc-500 font-black text-xl md:text-3xl tracking-tighter uppercase leading-tight text-center block w-full break-words">
                            {t.noLyricsLine1 || "УВЫ, ТЕКСТА НЕТ."}
                          </p>
                          <p className="text-zinc-600 font-black text-sm md:text-base tracking-tighter uppercase leading-tight text-center block w-full break-words opacity-60">
                            {t.noLyricsLine2 || "ОЖИДАЙТЕ ЕГО ДОБАВЛЕНИЯ."}
                          </p>
                        </div>
                      );
                    }

                    const parsedLines = parseLyrics(activeTrack?.lyrics || '');
                    const hasTimings = parsedLines.some(l => l.isTimed);

                    // Находим текущую активную строку на основе времени из usePlayer
                    let activeIndex = -1;
                    if (hasTimings) {
                      for (let i = 0; i < parsedLines.length; i++) {
                        if (parsedLines[i].isTimed && currentTime >= parsedLines[i].time) {
                          activeIndex = i;
                        }
                      }
                    }

                    // Хук авто-центрирования активной строки на экране
                    if (typeof window !== 'undefined' && activeIndex !== -1 && !isUserScrolling) {
                      setTimeout(() => {
                        const activeEl = scrollContainerRef.current?.querySelector(`[data-lyrics-idx="${activeIndex}"]`);
                        if (activeEl && !isEditing) {
                          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }

                    return parsedLines.map((lineObj: any, i: number) => {
                      const isHeader = lineObj.text.startsWith('[') && lineObj.text.endsWith(']');
                      const isActive = hasTimings && i === activeIndex;

                      return (
                        <p
                          key={i}
                          data-lyrics-idx={i}
                          onClick={() => {
                            // Если у строки есть тайминг и мы не в режиме редактирования
                            if (lineObj.isTimed && !isEditing) {
                              // Находим наш аудио-элемент на странице и прокручиваем время
                              const audioElement = document.querySelector('audio');
                              if (audioElement) {
                                audioElement.currentTime = lineObj.time;
                                // Возвращаем автоцентрирование, так как пользователь сам ткнул в строку
                                setIsUserScrolling(false);
                              }
                            }
                          }}
                          className={`transition-all duration-500 text-center block w-full break-words font-black uppercase tracking-normal leading-tight select-none px-4
                            ${isHeader
                              ? 'text-zinc-600 text-xs md:text-sm tracking-[0.4em] mt-6 first:mt-0 opacity-60'
                              : 'text-xl sm:text-2xl md:text-[clamp(24px,3.5vw,42px)]'
                            }
                          `}
                          style={{
                            // Старые и будущие строки плавно затухают, активная горит белым на 100%
                            opacity: isHeader ? 0.6 : (hasTimings ? (isActive ? 1 : 0.25) : 0.4),
                            transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            color: isActive ? '#ffffff' : isHeader ? '#52525b' : '#71717a',
                            transition: 'all 0.4s ease-out'
                          }}
                        >
                          {lineObj.text}
                        </p>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            )}
          </motion.div>
          <AnimatePresence>
            {isUserScrolling && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={() => {
                  // Сбрасываем флаг ручного скролла — экран тут же плавно улетит к активной строке
                  setIsUserScrolling(false);
                }}
                className="absolute bottom-40 left-1/2 -translate-x-1/2 z-50 bg-white text-black font-black uppercase text-xs px-6 py-3 rounded-full tracking-widest shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition flex items-center gap-2"
              >
                <svg xmlns="http://w3.org" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9" /></svg>
                {t.syncBtn || 'Синхронизация'}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}