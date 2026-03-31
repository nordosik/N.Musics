'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, Plus } from 'lucide-react'

export default function UploadModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!audioFile || !title) return alert('Название и аудио обязательны!')
    setLoading(true)

    try {
      // 1. Грузим аудио
      const audioPath = `tracks/${Date.now()}_${audioFile.name}`
      await supabase.storage.from('media').upload(audioPath, audioFile)
      const { data: { publicUrl: audioUrl } } = supabase.storage.from('media').getPublicUrl(audioPath)

      // 2. Грузим обложку (если есть)
      let coverUrl = null
      if (coverFile) {
        const coverPath = `covers/${Date.now()}_${coverFile.name}`
        await supabase.storage.from('media').upload(coverPath, coverFile)
        coverUrl = supabase.storage.from('media').getPublicUrl(coverPath).data.publicUrl
      }

      // 3. Сохраняем в базу (ПРОВЕРЬ, ЧТО ИМЕНА КОЛОНОК СОВПАДАЮТ)
      const { error } = await supabase.from('releases').insert([{ 
        title, 
        audio_url: audioUrl, 
        cover_url: coverUrl,
        lyrics: lyrics 
      }])

      if (error) throw error
      alert('Релиз опубликован!')
      setIsOpen(false)
      window.location.reload()
    } catch (e: any) {
      console.error("ПОЛНАЯ ОШИБКА:", e); // Это выведет детали в консоль браузера
      alert(`Ошибка: ${e.message || 'Неизвестная ошибка'}`); 
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full font-bold hover:scale-105 transition shadow-lg">
      <Plus size={18} /> Add Release
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md p-8 rounded-2xl relative shadow-2xl">
        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X /></button>
        <h2 className="text-2xl font-bold mb-6 tracking-tighter">NEW RELEASE</h2>
        
        <div className="space-y-4">
          <input type="text" placeholder="Track Title" className="w-full bg-black border border-zinc-800 p-3 rounded-lg focus:border-white outline-none transition" onChange={e => setTitle(e.target.value)} />
          
          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 ml-1">Audio File (.mp3)</label>
            <input type="file" accept="audio/*" className="text-sm file:bg-zinc-800 file:text-white file:border-none file:rounded-md file:px-3 file:py-1 cursor-pointer" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 ml-1">Cover Image (Optional)</label>
            <input type="file" accept="image/*" className="text-sm file:bg-zinc-800 file:text-white file:border-none file:rounded-md file:px-3 file:py-1 cursor-pointer" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
          </div>

          <textarea placeholder="Lyrics..." rows={3} className="w-full bg-black border border-zinc-800 p-3 rounded-lg focus:border-white outline-none transition text-sm" onChange={e => setLyrics(e.target.value)} />
          
          <button onClick={handleUpload} disabled={loading} className="w-full bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
            {loading ? 'Publishing...' : 'Publish Release'}
          </button>
        </div>
      </div>
    </div>
  )
}