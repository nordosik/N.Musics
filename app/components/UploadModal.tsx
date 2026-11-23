'use client'
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { X, Plus, Image as ImageIcon, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePlayer } from '../lib/usePlayer'
import { locales } from '../lib/locales'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { obsideoClient } from '../lib/obsideo'

interface UploadTrack {
  id: string
  title: string
  file: File | null
  duration: number | null
  collaborators: string
}

export default function UploadModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [releaseCollaborators, setReleaseCollaborators] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [isScheduledVisible, setIsScheduledVisible] = useState(false)

  const language = usePlayer(state => state.language)
  const $t = locales[language as 'ru' | 'en'] || locales.en
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [tracks, setTracks] = useState<UploadTrack[]>([
    { id: '1', title: '', file: null, duration: null, collaborators: '' }
  ])

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

  const getOrCreateArtistId = async (artistName: string): Promise<number | null> => {
    const cleanName = artistName.trim();
    if (!cleanName || cleanName.toUpperCase() === 'NORDOSIK') return null;

    const { data: existing } = await supabase
      .from('artists')
      .select('id')
      .ilike('name', cleanName)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newArtist, error } = await supabase
      .from('artists')
      .insert([{ name: cleanName }])
      .select('id')
      .single();

    if (error) {
      console.error("Ошибка при создании артиста:", error);
      return null;
    }
    return newArtist.id;
  };

  const releaseType = useMemo(() => {
    const validTracks = tracks.filter(t => t.file !== null)
    const trackCount = validTracks.length
    const totalDurationSec = validTracks.reduce((sum, t) => sum + (t.duration || 0), 0)
    const totalDurationMin = totalDurationSec / 60
    const hasLongTrack = validTracks.some(t => (t.duration || 0) > 600)

    if (trackCount >= 7) return 'album'
    if (trackCount > 0 && totalDurationMin > 30) return 'album'
    if (trackCount >= 4 && trackCount <= 6 && totalDurationMin <= 30) return 'ep'
    if (trackCount >= 1 && trackCount <= 3 && hasLongTrack && totalDurationMin <= 30) return 'ep'
    return 'single'
  }, [tracks])

  const handleUpload = async () => {
    if (!title.trim()) return alert($t.errSpecifyTitle)
    const invalidTrack = tracks.find(t => !t.title.trim() || !t.file)
    if (invalidTrack) return alert($t.errFillAllTracks)

    const filledTracks = tracks
    setLoading(true)

    try {
      // 3. Загрузка обложки в Obsideo
      let coverUrl = null
      if (coverFile) {
        const coverKey = `covers/${Date.now()}_${coverFile.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const formData = new FormData();
        formData.append('file', coverFile);
        formData.append('key', coverKey);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Cover upload failed');

        coverUrl = `/api/media?key=${encodeURIComponent(coverKey)}`;
      }

      // 4. Загрузка аудиофайлов через API-роут
      let uploadedTracksInfo = []
      for (const [index, t] of filledTracks.entries()) {
        if (!t.file) continue;

        // Вычисляем длительность (если еще не вычислена)
        const duration = t.duration || await getDuration(t.file);

        const trackKey = `tracks/${Date.now()}_${t.file.name.replace(/[^a-z0-9.]/gi, '_')}`;
        const formData = new FormData();
        formData.append('file', t.file);
        formData.append('key', trackKey);

        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`Track "${t.title}" upload failed`);

        uploadedTracksInfo.push({
          title: t.title,
          audio_url: `/api/media?key=${encodeURIComponent(trackKey)}`,
          position: index + 1,
          duration: duration,
          collaborators: t.collaborators || null
        })
      }

      const totalDurationSec = uploadedTracksInfo.reduce((sum, t) => sum + t.duration, 0)
      const finalAudioUrl = uploadedTracksInfo.length === 1 ? uploadedTracksInfo[0].audio_url : null

      // 5. Создаём запись в таблице releases (Supabase)
      const { data: newRelease, error: relError } = await supabase
        .from('releases')
        .insert([{
          title,
          collaborators: releaseCollaborators || null,
          audio_url: finalAudioUrl,
          duration: totalDurationSec,
          cover_url: coverUrl,
          lyrics: lyrics,
          release_type: releaseType,
          tracks_count: uploadedTracksInfo.length,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          is_scheduled_visible: isScheduledVisible
        }])
        .select('id')
        .single()

      if (relError || !newRelease) throw relError || new Error('Не удалось создать релиз')
      const newReleaseId = newRelease.id

      // 6. Артисты релиза
      if (releaseCollaborators.trim()) {
        const releaseArtistsList = releaseCollaborators.split(',').map(n => n.trim()).filter(Boolean);
        for (const artistName of releaseArtistsList) {
          const artistId = await getOrCreateArtistId(artistName);
          if (artistId) {
            await supabase.from('release_collaborators').insert([{
              release_title: title,
              artist_name: artistName,
              role: 'featured'
            }]);
          }
        }
      }

      // 7. Связываем треки с релизом
      for (let index = 0; index < uploadedTracksInfo.length; index++) {
        const trackItem = uploadedTracksInfo[index];

        const { data: existingTrack } = await supabase
          .from('tracks')
          .select('id')
          .ilike('title', trackItem.title.trim())
          .maybeSingle();

        let targetTrackId = existingTrack?.id;

        if (!targetTrackId) {
          const { data: insertedTrack, error: trackErr } = await supabase
            .from('tracks')
            .insert([{
              title: trackItem.title.trim(),
              audio_url: trackItem.audio_url,
              duration: trackItem.duration,
              collaborators: trackItem.collaborators,
              position: trackItem.position,
              release_id: newReleaseId
            }])
            .select('id')
            .single();

          if (trackErr || !insertedTrack) throw trackErr || new Error(`Ошибка сохранения трека "${trackItem.title}"`);
          targetTrackId = insertedTrack.id;
        } else {
          await supabase.from('tracks').update({ release_id: newReleaseId }).eq('id', targetTrackId);
        }

        const { error: relTrackErr } = await supabase
          .from('release_tracks')
          .insert([{
            release_id: newReleaseId,
            track_id: targetTrackId,
            track_number: index + 1
          }]);

        if (relTrackErr) throw relTrackErr;

        if (trackItem.collaborators && trackItem.collaborators.trim()) {
          const trackArtistsList = trackItem.collaborators.split(',').map(n => n.trim()).filter(Boolean);
          for (const artistName of trackArtistsList) {
            const artistId = await getOrCreateArtistId(artistName);
            if (artistId) {
              await supabase.from('track_collaborators').insert([{
                track_id: targetTrackId,
                artist_name: artistName,
                role: 'featured'
              }]);
            }
          }
        }
      }

      setIsOpen(false)
      window.location.reload()
    } catch (e: any) {
      alert(`${$t.uploadErrorAlert || 'Error:'} ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-full font-black text-[11px] uppercase tracking-widest transition-all active:scale-95"
      >
        <Plus size={14} strokeWidth={3} />
        {isMounted ? $t.addRelease : (language === 'en' ? "ADD RELEASE" : "ДОБАВИТЬ РЕЛИЗ")}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[420px] max-h-[92vh] bg-[#0c0c0c] border border-white/10 p-5 rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden z-10"
            >
              <motion.button
                onClick={() => setIsOpen(false)}
                whileHover={{ scale: 1.2, rotate: 90, color: "#ef4444" }}
                whileTap={{ scale: 0.85 }}
                className="absolute top-5 right-5 text-zinc-500 transition-colors text-xl font-mono select-none"
              >
                <X />
              </motion.button>

              <h2 className="text-xl font-black tracking-tighter uppercase text-white mb-3">
                {$t.newReleaseTitle || "NEW RELEASE"}
              </h2>

              <div className="space-y-3.5 overflow-y-auto pr-1 custom-scrollbar max-h-[calc(92vh-110px)]">
                <div className="flex bg-black p-2.5 rounded-xl border border-white/5 items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    {$t.detectedType || "DETECTED TYPE:"}
                  </span>
                  <span className="px-3 py-1 bg-white text-black rounded-md text-[11px] font-black uppercase tracking-widest animate-pulse">
                    {releaseType === 'album' && ($t.album || "ALBUM")}
                    {releaseType === 'ep' && ($t.ep || "EP")}
                    {releaseType === 'single' && ($t.single || "SINGLE")}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">
                    {$t.releaseTitleLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={$t.enterTitlePlaceholder}
                    className="w-full bg-black border border-white/5 p-2.5 rounded-xl focus:border-white/20 outline-none transition text-xs font-bold tracking-tight text-white placeholder:text-zinc-600"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">
                    {$t.releaseArtistsLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={$t.collaboratorsPlaceholder}
                    className="w-full bg-black border border-white/5 p-2.5 rounded-xl focus:border-white/20 outline-none transition text-xs font-medium tracking-tight text-white placeholder:text-zinc-600"
                    value={releaseCollaborators}
                    onChange={e => setReleaseCollaborators(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">
                    {$t.tracksLabel}
                  </label>
                  <div className="max-h-[160px] overflow-y-auto pr-1 custom-scrollbar flex flex-col gap-y-2">
                    {tracks.map((track, index) => (
                      <div key={track.id} className="flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/5 group">
                        <span className="text-[11px] font-mono font-bold text-zinc-600 w-4 text-center">
                          {index + 1}
                        </span>
                        <div className="flex-1 flex flex-col gap-0.5">
                          <input
                            placeholder={$t.trackTitlePlaceholder}
                            className="bg-transparent w-full outline-none text-xs font-bold tracking-tight text-white placeholder:text-zinc-600"
                            value={track.title}
                            onChange={(e) => {
                              const newTracks = [...tracks]
                              newTracks[index].title = e.target.value
                              setTracks(newTracks)
                            }}
                          />
                          <input
                            placeholder={$t.collaboratorsPlaceholder}
                            className="bg-transparent w-full outline-none text-[10px] font-medium tracking-tight text-zinc-500 focus:text-zinc-300 transition-colors placeholder:text-zinc-700"
                            value={track.collaborators || ''}
                            onChange={(e) => {
                              const newTracks = [...tracks]
                              newTracks[index].collaborators = e.target.value
                              setTracks(newTracks)
                            }}
                          />
                        </div>

                        <label className="cursor-pointer p-1.5 hover:bg-white/5 rounded-lg transition flex-shrink-0">
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0] || null
                              const newTracks = [...tracks]
                              newTracks[index].file = file
                              if (file) {
                                newTracks[index].duration = await getDuration(file)
                              } else {
                                newTracks[index].duration = null
                              }
                              setTracks(newTracks)
                            }}
                          />
                          {track.file ? <Check size={14} className="text-white" /> : <Plus size={14} className="text-zinc-500" />}
                        </label>

                        {tracks.length > 1 && (
                          <button
                            onClick={() => removeTrack(track.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10 flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      onClick={() => setTracks([...tracks, { id: `track-upload-id-${Date.now()}`, title: '', file: null, duration: null, collaborators: '' }])}
                      className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      {$t.addTrackBtn}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">
                    {$t.coverImageLabel}
                  </label>
                  <label className={`flex items-center justify-between p-2.5 bg-black border rounded-xl cursor-pointer transition-all ${coverFile ? 'border-white/20' : 'border-white/5 hover:border-white/10'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                    <span className="text-xs font-bold text-zinc-400">
                      {coverFile ? coverFile.name : $t.selectFilePlaceholder}
                    </span>
                    {coverFile ? <Check size={14} className="text-white" /> : <ImageIcon size={14} className="text-zinc-600" />}
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 ml-1">
                    {$t.publishDateLabel}
                  </label>

                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="w-full bg-black border border-white/5 p-2.5 rounded-xl focus:border-white/20 outline-none transition text-xs font-bold tracking-tight text-white placeholder:text-zinc-600 appearance-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  {scheduledAt && (
                    <label className="flex items-center gap-3 mt-2 cursor-pointer group px-1">
                      <div className="relative flex items-center justify-center w-4 h-4 border border-white/20 rounded-sm bg-black group-hover:border-white/40 transition-colors">
                        <input
                          type="checkbox"
                          checked={isScheduledVisible}
                          onChange={(e) => setIsScheduledVisible(e.target.checked)}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {isScheduledVisible && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isScheduledVisible ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                        {language === 'ru' ? 'Показывать в плашке (прогрев)' : 'Show in banner (teaser)'}
                      </span>
                    </label>
                  )}
                </div>

                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="w-full bg-white text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all active:scale-[0.98] mt-2 shadow-xl disabled:opacity-50 flex-shrink-0"
                >
                  {loading ? $t.processing : $t.publishRelease}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}