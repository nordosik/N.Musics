'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Plus, Music, Image as ImageIcon, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Описываем интерфейс трека с локальной длительностью для валидатора
interface UploadTrack {
  id: string
  title: string
  file: File | null
  duration: number | null // Важно для мгновенного пересчета типа релиза
}

export default function UploadModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  // Храним все треки в единой очереди (начинаем с одного пустого)
  const [tracks, setTracks] = useState<UploadTrack[]>([
    { id: '1', title: '', file: null, duration: null }
  ])

  // Вспомогательная функция замера длины аудио (в секундах)
  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      audio.src = URL.createObjectURL(file)
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src)
        resolve(Math.round(audio.duration))
      }
    })
  }

  /**
   * 📐 Автоматический валидатор типа релиза по правилам площадок
   */
  const getReleaseType = (): 'single' | 'ep' | 'album' => {
    const validTracks = tracks.filter(t => t.file !== null)
    const trackCount = validTracks.length

    // Считаем общую длительность только тех треков, которые уже загружены в инпуты
    const totalDurationSec = validTracks.reduce((sum, t) => sum + (t.duration || 0), 0)
    const totalDurationMin = totalDurationSec / 60

    // Проверяем, есть ли хоть один трек длиннее 10 минут (600 секунд)
    const hasLongTrack = validTracks.some(t => (t.duration || 0) > 600)

    // 1. АЛЬБОМ (LP)
    if (trackCount >= 7) return 'album'
    if (trackCount > 0 && totalDurationMin > 30) return 'album'

    // 2. EP (Мини-альбом)
    if (trackCount >= 4 && trackCount <= 6 && totalDurationMin <= 30) return 'ep'
    if (trackCount >= 1 && trackCount <= 3 && hasLongTrack && totalDurationMin <= 30) return 'ep'

    // 3. СИНГЛ (Single)
    return 'single'
  }

  const releaseType = getReleaseType()

  const handleUpload = async () => {
    // Валидация: название релиза и хотя бы один заполненный трек
    const filledTracks = tracks.filter(t => t.title && t.file)
    if (!title || filledTracks.length === 0) {
      return alert('Required fields: Release Title and at least one Track with File')
    }

    setLoading(true)
    try {
      // 1. Загрузка обложки релиза
      let coverUrl = null
      if (coverFile) {
        const coverPath = `covers/${Date.now()}_${coverFile.name.replace(/[^a-z0-9.]/gi, '_')}`
        await supabase.storage.from('media').upload(coverPath, coverFile)
        coverUrl = supabase.storage.from('media').getPublicUrl(coverPath).data.publicUrl
      }

      // 2. Последовательный аплоад всех валидных треков в Storage
      let albumTracksData = []
      for (const [index, t] of filledTracks.entries()) {
        if (!t.file) continue

        // Длительность у нас уже посчитана в стейте, берем ее или перепроверяем
        const duration = t.duration || await getDuration(t.file)
        const tPath = `tracks/${Date.now()}_${t.file.name.replace(/[^a-z0-9.]/gi, '_')}`

        await supabase.storage.from('media').upload(tPath, t.file)
        const { data: { publicUrl: tUrl } } = supabase.storage.from('media').getPublicUrl(tPath)

        albumTracksData.push({
          title: t.title,
          audio_url: tUrl,
          position: index,
          duration: duration
        })
      }

      // Считаем финальные метаданные для записи релиза
      const totalDurationSec = albumTracksData.reduce((sum, t) => sum + t.duration, 0)

      // Для совместимости: если трек один, кладем его прямую ссылку в релиз
      const finalAudioUrl = albumTracksData.length === 1 ? albumTracksData[0].audio_url : null

      // 3. Запись в таблицу 'releases'
      const { data: newRelease, error: relError } = await supabase
        .from('releases')
        .insert([{
          title,
          audio_url: finalAudioUrl,
          duration: totalDurationSec, // сохраняем общую длину релиза
          cover_url: coverUrl,
          lyrics: lyrics,
          release_type: releaseType // Вместо is_album пишем 'single' | 'ep' | 'album'
        }]).select().single()

      if (relError) throw relError

      // 4. Запись дочерних треков в таблицу 'tracks'
      if (albumTracksData.length > 0) {
        // Рекомендуется связывать по ID релиза (newRelease.id), но сохраняем твою логику связи по title
        const tracksWithId = albumTracksData.map(track => ({
          ...track,
          release_id: title
        }))
        const { error: tracksError } = await supabase.from('tracks').insert(tracksWithId)
        if (tracksError) throw tracksError
      }

      setIsOpen(false)
      window.location.reload()
    } catch (e: any) {
      alert(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Блокировка скролла при открытии модалки
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const removeTrack = (id: string) => {
    if (tracks.length <= 1) return
    setTracks(tracks.filter(track => track.id !== id))
  }

  const moveTrack = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = tracks[dragIndex]
    const remainingItems = tracks.filter((_, index) => index !== dragIndex)
    const reorderedItems = [
      ...remainingItems.slice(0, hoverIndex),
      draggedItem,
      ...remainingItems.slice(hoverIndex),
    ]
    setTracks(reorderedItems)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
      >
        <Plus size={14} strokeWidth={3} /> Add Release
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[420px] max-h-[90vh] bg-[#0c0c0c] border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              <button onClick={() => setIsOpen(false)} className="absolute top-5 right-5 text-zinc-600 hover:text-white transition">
                <X size={20} />
              </button>

              <h2 className="text-2xl font-black tracking-tighter uppercase text-white">New Release</h2>

              {/* Автоматический интерактивный индикатор формата релиза */}
              <div className="flex bg-black p-3 rounded-xl border border-white/5 items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Detected Type:</span>
                <span className="px-3 py-1 bg-white text-black rounded-md text-[10px] font-black uppercase tracking-widest animate-pulse">
                  {releaseType}
                </span>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Release Title</label>
                  <input
                    type="text"
                    placeholder="ENTER TITLE..."
                    className="w-full bg-black border border-white/5 p-3 rounded-xl focus:border-white/20 outline-none transition text-sm font-bold uppercase tracking-tighter text-white"
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                {/* Треклист (Универсальный список) */}
                <div className="max-h-[180px] overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-y-2 snap-y">
                  {tracks.map((track, index) => (
                    <div
                      key={track.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('index', index.toString())}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        const dragIndex = parseInt(e.dataTransfer.getData('index'))
                        moveTrack(dragIndex, index)
                      }}
                      className="flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/5 group"
                    >
                      <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors cursor-grab">
                        <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                          <path d="M5 4C5 4.55228 4.55228 5 4 5C3.44772 5 3 4.55228 3 4C3 3.44772 3.44772 3 4 3C4.55228 3 5 3.44772 5 4ZM5 7.5C5 8.05228 4.55228 8.5 4 8.5C3.44772 8.5 3 8.05228 3 7.5C3 6.94772 3.44772 6.5 4 6.5C4.55228 6.5 5 6.94772 5 7.5ZM4 12C4.55228 12 5 11.5523 5 11C5 10.4477 4.55228 10 4 10C3.44772 10 3 10.4477 3 11C3 11.5523 3.44772 12 4 12ZM11 5C11.5523 5 12 4.55228 12 4C12 3.44772 11.5523 3 11 3C10.4477 3 10 3.44772 10 4C10 4.55228 10.4477 5 11 5ZM12 7.5C12 8.05228 11.5523 8.5 11 8.5C10.4477 8.5 10 8.05228 10 7.5C10 6.94772 10.4477 6.5 11 6.5C11.5523 6.5 12 6.94772 12 7.5ZM11 12C11.5523 12 12 11.5523 12 11C12 10.4477 11.5523 10 11 10C10.4477 10 10 10.4477 10 11C10 11.5523 10.4477 12 11 12Z" fill="currentColor" />
                        </svg>
                      </div>

                      <span className="text-[10px] font-mono text-zinc-700 w-4 text-center">{index + 1}</span>

                      <input
                        placeholder="TRACK TITLE"
                        className="bg-transparent flex-1 outline-none text-[11px] font-bold uppercase tracking-tighter text-white"
                        value={track.title}
                        onMouseDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newTracks = [...tracks]
                          newTracks[index].title = e.target.value
                          setTracks(newTracks)
                        }}
                      />

                      {/* Инпут аудиофайла с мгновенным триггером замера длительности */}
                      <label className="cursor-pointer p-2 hover:bg-white/5 rounded-lg transition" onMouseDown={(e) => e.stopPropagation()}>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0] || null
                            const newTracks = [...tracks]
                            newTracks[index].file = file

                            if (file) {
                              // Снимаем тайминги "на лету" до публикации
                              const trackDuration = await getDuration(file)
                              newTracks[index].duration = trackDuration
                            } else {
                              newTracks[index].duration = null
                            }
                            setTracks(newTracks)
                          }}
                        />
                        {track.file ? <Check size={12} className="text-white" /> : <Plus size={12} className="text-zinc-600" />}
                      </label>

                      {tracks.length > 1 && (
                        <button
                          onClick={() => removeTrack(track.id)}
                          className="p-2 text-zinc-700 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                          title="Remove track"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setTracks([...tracks, { id: Math.random().toString(), title: '', file: null, duration: null }])}
                    className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    + Add track
                  </button>
                </div>

                {/* Cover Artwork */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Cover Image</label>
                  <label className={`flex items-center justify-between p-3 bg-black border rounded-xl cursor-pointer transition-all ${coverFile ? 'border-white/20' : 'border-white/5 hover:border-white/10'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                    <span className="text-[11px] font-bold text-zinc-500 uppercase">
                      {coverFile ? 'Image Ready' : 'Select Artwork'}
                    </span>
                    {coverFile ? <Check size={14} className="text-white" /> : <ImageIcon size={14} className="text-zinc-700" />}
                  </label>
                </div>

                {/* Submit */}
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-zinc-200 transition-all active:scale-[0.98] mt-4 shadow-xl"
                >
                  {loading ? 'Processing...' : 'Publish Release'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
