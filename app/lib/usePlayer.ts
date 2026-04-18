import { create } from 'zustand'

// Описываем, как выглядит наш трек в базе
interface Track {
  id: string | number;
  title: string;
  audio_url: string;
  cover_url?: string;
  is_album?: boolean;
  release_id?: string;
}
interface PlayerStore {
  activeTrack: Track | null
  isPlaying: boolean
  queue: Track[]
  currentIndex: number
  setActiveTrack: (track: Track) => void
  setQueue: (tracks: Track[], index?: number) => void
  playNext: () => void
  playPrevious: () => void
  setIsPlaying: (playing: boolean) => void
  togglePlay: () => void
}

export const usePlayer = create<PlayerStore>((set, get) => ({
  activeTrack: null,
  isPlaying: false,
  queue: [],
  currentIndex: 0,

  // Для одиночных треков
  setActiveTrack: (track: Track) => set({ 
    activeTrack: track, 
    isPlaying: true, 
    queue: [track], 
    currentIndex: 0 
  }),

  // Для альбомов: загружаем все песни и играем с нужного индекса
  setQueue: (tracks: Track[], index = 0) => set({
    queue: tracks,
    currentIndex: index,
    activeTrack: tracks[index],
    isPlaying: true
  }),

  // Логика переключения
  playNext: () => {
    const { queue, currentIndex } = get();
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      set({
        currentIndex: nextIndex,
        activeTrack: queue[nextIndex],
        isPlaying: true
      });
    } else {
      // Если песни кончились
      set({ isPlaying: false });
    }
  },
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),

  playPrevious: () => {
    const { queue, currentIndex } = get();
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      set({ currentIndex: nextIndex, activeTrack: queue[nextIndex], isPlaying: true });
    }
  },

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
}))
