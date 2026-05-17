'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../lib/usePlayer' 
import { useEffect, useState } from 'react'

export default function LyricsOverlay() {
  const { isLyricsOpen, activeTrack } = usePlayer()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isLyricsOpen) {
      document.body.style.setProperty('overflow', 'hidden', 'important')
    } else {
      document.body.style.removeProperty('overflow')
    }
    return () => {
      document.body.style.removeProperty('overflow')
    }
  }, [isLyricsOpen])

  if (!isClient) return null

  // Проверяем: если трека нет ИЛИ у трека нет поля lyrics (или оно пустое)
  const hasNoLyrics = !activeTrack || !activeTrack.lyrics || activeTrack.lyrics.trim() === '';

  // Получаем массив строк текста
  const lyricsLines = hasNoLyrics
    ? ["УВЫ, ТЕКСТА НЕТ.", "ОЖИДАЙТЕ ЕГО ДОБАВЛЕНИЯ."]
    : activeTrack?.lyrics?.split('\n') || [];

  return (
    <AnimatePresence>
      {isLyricsOpen && (
        <div 
          // z-40 чтобы быть СТРОГО под плеером (у него z-50). Увеличили размытие до backdrop-blur-xl для чистоты восприятия
          className="fixed inset-0 top-0 left-0 w-screen h-screen flex items-center justify-center bg-black/85 backdrop-blur-xl"
          style={{ zIndex: 40 }}
        >
          {/* КОНТЕНТ С ТЕКСТОМ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full max-w-4xl h-full flex flex-col px-6 text-white pb-24 ${
              hasNoLyrics ? 'justify-center items-center' : 'justify-start pt-16'
            }`}
          >
            <div className={`overflow-y-auto custom-scrollbar text-center selection:bg-white selection:text-black ${
              hasNoLyrics ? 'w-full flex items-center justify-center' : 'flex-1 pr-2'
            }`}>
              <div className={`flex flex-col w-full ${
                hasNoLyrics ? 'gap-y-3' : 'gap-y-6 py-6'
              }`}>
                {lyricsLines.map((line: string, i: number) => {
                  const isHeader = line.startsWith('[') && line.endsWith(']');
                  
                  return (
                    <p
                      key={i}
                      className={`
                        transition-all duration-300 hover:text-white cursor-default text-center
                        ${hasNoLyrics 
                          ? 'text-zinc-500 font-black text-xl md:text-3xl tracking-tighter uppercase leading-tight'
                          : isHeader 
                            ? 'text-zinc-600 font-black text-xs md:text-sm uppercase tracking-[0.4em] mt-6 first:mt-0 opacity-60' 
                            : 'text-zinc-400 hover:scale-105 font-black text-xl md:text-4xl tracking-tighter leading-tight uppercase'
                        }
                      `}
                    >
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}