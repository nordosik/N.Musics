'use client'
import { motion } from 'framer-motion'
import { Disc } from 'lucide-react'
import { usePlayer } from '../lib/usePlayer'
import { locales, Language } from '../lib/locales'
import { useState, useEffect } from 'react'

export default function Hero() {
  // Точечный селектор для идеальной производительности
  const language = usePlayer(state => state.language);
  const activeLang = (language || 'ru') as Language;
  const t = locales[activeLang];

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative h-80 w-full overflow-hidden p-8 flex items-end group/hero isolate">
      
      {/* 🎨 ИДЕАЛЬНЫЙ СЛИВАЮЩИЙСЯ БЭКГРАУНД: Затухает строго до #050505 задолго до нижнего края */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e11] via-[#060608] to-[#050505] pointer-events-none z-0" />

      {/* 💿 ИКОНКА ДИСКА: ПОЛНОСТЬЮ ИЗОЛИРОВАНА ОТ ОБЩИХ ГРАДИЕНТОВ САЙТА */}
      <div 
        className="absolute -top-20 -right-20 pointer-events-none select-none z-10 opacity-[0.035] group-hover/hero:opacity-[0.065] transition-all duration-1000"
        style={{
          // Железный хак: диск мягко растворяется по краям внутри своего слоя, не создавая конфликтов и полос
          maskImage: 'linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%)',
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%)'
        }}
      >
        {/* Бесконечное ультра-медленное вращение */}
        <div className="animate-[spin_140s_linear_infinite] transform-gpu">
          <Disc size={380} strokeWidth={0.6} className="text-white" />
        </div>
      </div>

      {/* ОСНОВНОЙ КОНТЕНТ (На самом верхнем слое z-20, полностью в безопасности) */}
      <div className="flex items-center gap-8 z-20 relative">
        
        {/* АВАТАРКА */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-52 h-52 bg-black rounded-sm overflow-hidden flex-shrink-0 cursor-pointer shadow-[0_25px_60px_rgba(0,0,0,0.9)]"
        >
          <img src="/my-avatar.jpg" alt="NORDOSIK" className="w-full h-full object-cover transform-gpu" />
        </motion.div>

        {/* ТЕКСТ */}
        <motion.div 
          whileHover={{ scale: 1.01, x: 6 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex flex-col justify-center cursor-default transform-gpu"
        >
          <span className="text-[13px] font-bold uppercase tracking-[0.4em] text-zinc-400 opacity-80">
            {isMounted ? t.artistProfile : "ПРОФИЛЬ АРТИСТА"}
          </span>
          <h1 className="text-8xl font-black tracking-tighter leading-[1.0] my-1.5 select-none uppercase text-white">
            NORDOSIK
          </h1>
          <p className="text-zinc-500 font-medium text-lg mt-1">
            N.Musics <span className="mx-2 opacity-20">•</span> {isMounted ? t.personalDiscography : "Личная дискография"}
          </p>
        </motion.div>
      </div>

    </div>
  )
}
