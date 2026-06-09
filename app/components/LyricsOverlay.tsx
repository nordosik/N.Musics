'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../lib/usePlayer' 
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Save, Edit3, Eye } from 'lucide-react'

export default function LyricsOverlay({ isAdmin = false }: { isAdmin?: boolean }) {
  const { isLyricsOpen, setIsLyricsOpen, activeTrack, lyricsScrollPositions, setLyricsScrollPosition } = usePlayer()
  const [isClient, setIsClient] = useState(false)
  
  const [isEditing, setIsEditing] = useState(false)
  const [lyricsText, setLyricsText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (activeTrack) {
      setLyricsText(activeTrack.lyrics || '')
    }
  }, [activeTrack])

  // Хук для восстановления скролла при открытии и фиксации body
  useEffect(() => {
    if (isLyricsOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.setProperty('overflow', 'hidden', 'important')

      // Восстанавливаем позицию
      if (activeTrack) {
        const savedPos = lyricsScrollPositions[activeTrack.id] || 0;
        if (savedPos > 0) {
          setTimeout(() => {
            if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTop = savedPos;
            }
          }, 50);
        }
      }
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.removeProperty('overflow')
      setIsEditing(false)
    }

    // Чистая функция очистки БЕЗ вызова стейт-экшенов Zustand (убирает бесконечный цикл)
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.removeProperty('overflow')
    }
  }, [isLyricsOpen, activeTrack]) // Оставили только чистые зависимости

  // ФИКС: Сохраняем скролл прямо во время прокрутки пользователем
  const handleScroll = () => {
    if (activeTrack && scrollContainerRef.current) {
      const currentScroll = scrollContainerRef.current.scrollTop;
      // Записываем позицию в Zustand на лету. Zustand оптимизирован и не вызывает лагов при скролле.
      setLyricsScrollPosition(activeTrack.id, currentScroll);
    }
  };

  if (!isClient) return null

  const hasNoLyrics = !activeTrack || !activeTrack.lyrics || activeTrack.lyrics.trim() === '';
  const lyricsLines = hasNoLyrics
    ? ["УВЫ, ТЕКСТА НЕТ.", "ОЖИДАЙТЕ ЕГО ДОБАВЛЕНИЯ."]
    : activeTrack?.lyrics?.split('\n') || [];

  return (
    <AnimatePresence>
      {isLyricsOpen && (
        <div 
          className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-black/95 backdrop-blur-xl"
          style={{ zIndex: 40 }}
        >
          {/* КЛИК ПО ФОНУ ДЛЯ ЗАКРЫТИЯ */}
          <div 
            className="absolute inset-0 z-0 cursor-zoom-out" 
            onClick={() => !isEditing && setIsLyricsOpen(false)} 
          />

          {/* КНОПКИ УПРАВЛЕНИЯ ДЛЯ АДМИНА */}
          {isAdmin && (
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-full transition text-xs font-black uppercase tracking-widest active:scale-95"
              >
                {isEditing ? <Eye size={14} /> : <Edit3 size={14} />}
                {isEditing ? 'Preview' : 'Edit Lyrics'}
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
                      alert(`Error saving lyrics: ${e.message}`)
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full transition text-xs font-black uppercase tracking-widest hover:bg-zinc-200 active:scale-95 disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : 'Save'}
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
            className={`relative z-10 w-full max-w-4xl h-full flex flex-col px-12 md:px-32 text-white pb-36 ${
              hasNoLyrics && !isEditing ? 'justify-center items-center' : 'justify-start pt-24'
            }`}
          >
            {isEditing && isAdmin ? (
              <div className="w-full flex-1 flex flex-col gap-4">
                <div className="text-center mb-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Editing Lyrics for</span>
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
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className={`overflow-y-auto custom-scrollbar text-center selection:bg-white selection:text-black w-full ${
                  hasNoLyrics ? 'flex items-center justify-center' : 'flex-1 pr-2'
                }`}
              >
                <div className={`flex flex-col w-full ${
                  hasNoLyrics ? 'gap-y-3' : 'gap-y-6 py-6'
                }`}>
                  {lyricsLines.map((line: string, i: number) => {
                    const isHeader = line.startsWith('[') && line.endsWith(']');
                    
                    return (
                      <p
                        key={i}
                        className={`
                          transition-all duration-300 hover:text-white cursor-default text-center block w-full truncate-none break-words
                          ${hasNoLyrics 
                            ? 'text-zinc-500 font-black text-xl md:text-3xl tracking-tighter uppercase leading-tight'
                            : isHeader 
                              ? 'text-zinc-600 font-black text-xs md:text-sm uppercase tracking-[0.4em] mt-6 first:mt-0 opacity-60' 
                              : 'text-zinc-400 hover:scale-[1.01] font-black text-xl md:text-4xl tracking-tighter leading-tight uppercase'
                          }
                        `}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}