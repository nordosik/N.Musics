'use client'
import { motion } from 'framer-motion'
import { Music } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { locales, Language } from '../lib/locales'
import { useState, useEffect } from 'react'

export default function Hero() {
  const { language } = usePlayer();
  // Гарантируем TypeScript, что используем корректный ключ из locales
  const activeLang = (language || 'ru') as Language;
  const t = locales[activeLang];

  // Защита от Hydration Mismatch (ошибок Next.js на сервере)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative h-80 w-full bg-gradient-to-t from-[#050505] via-[#121212] to-[#282828] p-8 flex items-end">
      <div className="flex items-center gap-8 z-10">
        
        {/* АВАТАРКА */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-52 h-52 bg-black rounded-sm overflow-hidden flex-shrink-0 cursor-pointer"
        >
          <img src="/my-avatar.jpg" alt="NORDOSIK" className="w-full h-full object-cover" />
        </motion.div>

        {/* ТЕКСТ */}
        <motion.div 
          whileHover={{ scale: 1.02, x: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex flex-col justify-center cursor-default"
        >
          <span className="text-[13px] font-bold uppercase tracking-[0.4em] text-zinc-400 opacity-80">
            {isMounted ? t.artistProfile : "ПРОФИЛЬ АРТИСТА"}
          </span>
          <h1 className="text-8xl font-black tracking-tighter leading-[1.0] my-1.5 select-none uppercase">
            NORDOSIK
          </h1>
          <p className="text-zinc-500 font-medium text-lg mt-1">
            N.Musics <span className="mx-2 opacity-20">•</span> {isMounted ? t.personalDiscography : "Личная дискография"}
          </p>
        </motion.div>
      </div>

      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Music size={240} />
      </div>
    </div>
  )
}