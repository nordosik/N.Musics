'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Plus, Music, Image as ImageIcon, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UploadModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAlbum, setIsAlbum] = useState(false);
  const [tracks, setTracks] = useState<{id: string, title: string, file: File | null}[]>([{ id: '1', title: '', file: null }]);

  const getDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(Math.round(audio.duration));
      };
    });
  };

  const handleUpload = async () => {
    if (!title || (!isAlbum && !audioFile)) return alert('Required fields: Title and Audio File');
    setLoading(true);
    try {
      let coverUrl = null;
      if (coverFile) {
        const coverPath = `covers/${Date.now()}_${coverFile.name.replace(/[^a-z0-9.]/gi, '_')}`;
        await supabase.storage.from('media').upload(coverPath, coverFile);
        coverUrl = supabase.storage.from('media').getPublicUrl(coverPath).data.publicUrl;
      }

      let finalAudioUrl = null;
      let finalDuration = null;
      let albumTracksData = [];

      if (!isAlbum && audioFile) {
        finalDuration = await getDuration(audioFile);
        const audioPath = `tracks/${Date.now()}_${audioFile.name.replace(/[^a-z0-9.]/gi, '_')}`;
        await supabase.storage.from('media').upload(audioPath, audioFile);
        finalAudioUrl = supabase.storage.from('media').getPublicUrl(audioPath).data.publicUrl;
      } else {
        for (const [index, t] of tracks.entries()) {
          if (!t.file || !t.title) continue;
          const duration = await getDuration(t.file);
          const tPath = `tracks/${Date.now()}_${t.file.name.replace(/[^a-z0-9.]/gi, '_')}`;
          await supabase.storage.from('media').upload(tPath, t.file);
          const { data: { publicUrl: tUrl } } = supabase.storage.from('media').getPublicUrl(tPath);
          albumTracksData.push({ title: t.title, audio_url: tUrl, position: index, duration: duration });
        }
      }

      const { data: newRelease, error: relError } = await supabase
        .from('releases')
        .insert([{ 
          title, 
          audio_url: finalAudioUrl, 
          duration: finalDuration,
          cover_url: coverUrl, 
          lyrics: lyrics, 
          is_album: isAlbum 
        }]).select().single();

      if (relError) throw relError;

      if (isAlbum && albumTracksData.length > 0) {
        const tracksWithId = albumTracksData.map(track => ({ ...track, release_id: title }));
        const { error: tracksError } = await supabase.from('tracks').insert(tracksWithId);
        if (tracksError) throw tracksError;
      }

      setIsOpen(false);
      window.location.reload();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Блокировка скролла при открытии модалки
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const removeTrack = (id: string) => {
    // Не даем удалить последний трек, если он один
    if (tracks.length <= 1) return;
    setTracks(tracks.filter(track => track.id !== id));
  };

  const moveTrack = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = tracks[dragIndex];
    const remainingItems = tracks.filter((_, index) => index !== dragIndex);
    const reorderedItems = [
      ...remainingItems.slice(0, hoverIndex),
      draggedItem,
      ...remainingItems.slice(hoverIndex),
    ];
    setTracks(reorderedItems);
  };

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
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[420px] bg-[#0c0c0c] border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col gap-6"
            >
              <button onClick={() => setIsOpen(false)} className="absolute top-5 right-5 text-zinc-600 hover:text-white transition">
                <X size={20}/>
              </button>
              
              <h2 className="text-2xl font-black tracking-tighter uppercase text-white">New Release</h2>
              
              <div className="flex bg-black p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setIsAlbum(false)} 
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isAlbum ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                >Single</button>
                <button 
                  onClick={() => setIsAlbum(true)} 
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isAlbum ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                >Album</button>
              </div>

              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Release Title</label>
                  <input 
                    type="text" 
                    placeholder="ENTER TITLE..." 
                    className="w-full bg-black border border-white/5 p-3 rounded-xl focus:border-white/20 outline-none transition text-sm font-bold uppercase tracking-tighter text-white" 
                    onChange={e => setTitle(e.target.value)} 
                  />
                </div>

                {!isAlbum ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Audio File</label>
                    <label className={`flex items-center justify-between p-3 bg-black border rounded-xl cursor-pointer transition-all ${audioFile ? 'border-white/20' : 'border-white/5 hover:border-white/10'}`}>
                      <input type="file" accept="audio/*" className="hidden" onChange={e => setAudioFile(e.target.files?.[0] || null)} />
                      <span className="text-[11px] font-bold text-zinc-500 truncate max-w-[200px] uppercase">
                        {audioFile ? audioFile.name : 'Select track'}
                      </span>
                      {audioFile ? <Check size={14} className="text-white" /> : <Music size={14} className="text-zinc-700" />}
                    </label>
                  </div>
                ) : (
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                     {tracks.map((track, index) => (
                        <div 
                          key={track.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('index', index.toString())}
                          onDragOver={(e) => e.preventDefault()} // Обязательно для разрешения drop
                          onDrop={(e) => {
                            const dragIndex = parseInt(e.dataTransfer.getData('index'));
                            moveTrack(dragIndex, index);
                          }}
                          className="flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/5">
                            {/* Иконка "захвата" для подсказки юзеру */}
                            <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
                              <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://w3.org">
                                <path d="M5 4C5 4.55228 4.55228 5 4 5C3.44772 5 3 4.55228 3 4C3 3.44772 3.44772 3 4 3C4.55228 3 5 3.44772 5 4ZM5 7.5C5 8.05228 4.55228 8.5 4 8.5C3.44772 8.5 3 8.05228 3 7.5C3 6.94772 3.44772 6.5 4 6.5C4.55228 6.5 5 6.94772 5 7.5ZM4 12C4.55228 12 5 11.5523 5 11C5 10.4477 4.55228 10 4 10C3.44772 10 3 10.4477 3 11C3 11.5523 3.44772 12 4 12ZM11 5C11.5523 5 12 4.55228 12 4C12 3.44772 11.5523 3 11 3C10.4477 3 10 3.44772 10 4C10 4.55228 10.4477 5 11 5ZM12 7.5C12 8.05228 11.5523 8.5 11 8.5C10.4477 8.5 10 8.05228 10 7.5C10 6.94772 10.4477 6.5 11 6.5C11.5523 6.5 12 6.94772 12 7.5ZM11 12C11.5523 12 12 11.5523 12 11C12 10.4477 11.5523 10 11 10C10.4477 10 10 10.4477 10 11C10 11.5523 10.4477 12 11 12Z" fill="currentColor" />
                              </svg>
                            </div>
                           <span className="text-[10px] font-mono text-zinc-700 w-4 text-center">{index+1}</span>
                           <input 
                              placeholder="TRACK TITLE" 
                              className="bg-transparent flex-1 outline-none text-[11px] font-bold uppercase tracking-tighter text-white"
                              value={track.title}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const newTracks = [...tracks];
                                newTracks[index].title = e.target.value;
                                setTracks(newTracks);
                              }}
                           />
                           <label className="cursor-pointer p-2 hover:bg-white/5 rounded-lg transition" onMouseDown={(e) => e.stopPropagation()}>
                              <input type="file" className="hidden" onChange={e => {
                                const newTracks = [...tracks];
                                newTracks[index].file = e.target.files?.[0] || null;
                                setTracks(newTracks);
                              }} />
                              {track.file ? <Check size={12} className="text-white" /> : <Plus size={12} className="text-zinc-600" />}
                           </label>

                           {/* КНОПКА УДАЛЕНИЯ (показывается при наведении или если треков > 1) */}
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
                     <button onClick={() => setTracks([...tracks, { id: Math.random().toString(), title: '', file: null }])} className="w-full py-2 border border-dashed border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors">+ Add track</button>
                  </div>
                )}

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
  );
}