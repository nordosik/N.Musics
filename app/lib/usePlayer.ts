import { create } from 'zustand'

export type RepeatMode = 'off' | 'one' | 'all';

interface Track {
  id: string | number;
  title: string;
  audio_url: string;
  cover_url?: string;
  release_type?: 'single' | 'ep' | 'album'; 
  release_id?: string;
  duration: number;
  lyrics?: string;
}

interface PlayerStore {
  activeTrack: Track | null
  isPlaying: boolean
  queue: Track[]
  originalQueue: Track[]
  currentIndex: number
  isLyricsOpen: boolean
  repeatMode: RepeatMode
  isShuffle: boolean
  
  // Состояния громкости
  volume: number
  prevVolume: number
  
  // Кэш скролла текстов
  lyricsScrollPositions: Record<string | number, number>

  // Экшены управления интерфейсом
  setIsLyricsOpen: (open: boolean) => void
  setActiveTrack: (track: Track) => void
  setQueue: (tracks: Track[], index?: number) => void
  setIsPlaying: (playing: boolean) => void
  
  // Экшены громкости
  setVolume: (value: number) => void
  setPrevVolume: (value: number) => void
  toggleMute: () => void

  // Экшены кэша скролла
  setLyricsScrollPosition: (trackId: string | number, position: number) => void
  
  // Логика воспроизведения
  playNext: (isAutoEnded?: boolean) => void
  playPrevious: () => void
  togglePlay: () => void
  toggleRepeat: () => void
  toggleShuffle: () => void
}

// Вспомогательная функция для честного перемешивания массива (Фишер-Йетс)
const shuffleArray = (array: Track[], excludeTrackId: string | number): Track[] => {
  const filtered = array.filter(t => t.id !== excludeTrackId);
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  return filtered;
};

export const usePlayer = create<PlayerStore>((set, get) => ({
  activeTrack: null,
  isPlaying: false,
  queue: [],
  originalQueue: [],
  currentIndex: 0,
  isLyricsOpen: false,
  repeatMode: 'off',
  isShuffle: false,
  
  // Дефолтные значения громкости
  volume: 1,
  prevVolume: 1,
  
  // Дефолтный кэш скролла
  lyricsScrollPositions: {},

  setIsLyricsOpen: (open) => set({ isLyricsOpen: open }),
  
  setActiveTrack: (track: Track) => set({
    activeTrack: track,
    isPlaying: true,
    queue: [track],
    originalQueue: [track],
    currentIndex: 0
  }),

  setVolume: (value) => set({ volume: value }),
  setPrevVolume: (value) => set({ prevVolume: value }),
  
  toggleMute: () => {
    const { volume, prevVolume, setVolume } = get();
    if (volume > 0) {
      set({ prevVolume: volume });
      setVolume(0);
    } else {
      setVolume(prevVolume > 0 ? prevVolume : 1);
    }
  },

  setLyricsScrollPosition: (trackId, position) => set((state) => ({
    lyricsScrollPositions: {
      ...state.lyricsScrollPositions,
      [trackId]: position
    }
  })),

  setQueue: (tracks: Track[], index = 0) => {
    const { isShuffle } = get();
    const selectedTrack = tracks[index];
    if (isShuffle && tracks.length > 1) {
      const shuffledRemaining = shuffleArray(tracks, selectedTrack.id);
      set({
        originalQueue: tracks,
        queue: [selectedTrack, ...shuffledRemaining],
        currentIndex: 0,
        activeTrack: selectedTrack,
        isPlaying: true
      });
    } else {
      set({
        originalQueue: tracks,
        queue: tracks,
        currentIndex: index,
        activeTrack: tracks[index],
        isPlaying: true
      });
    }
  },

  playNext: (isAutoEnded = false) => {
    const { queue, originalQueue, activeTrack, currentIndex, repeatMode, isShuffle } = get();
    
    if (isAutoEnded && repeatMode === 'one') {
      return;
    }
    
    if (!isAutoEnded && repeatMode === 'one' && queue.length === 1) {
      const current = activeTrack;
      set({ activeTrack: null, isPlaying: false });
      setTimeout(() => set({ activeTrack: current, isPlaying: true }), 30);
      return;
    }
    
    const isLastTrack = currentIndex === queue.length - 1;
    if (!isLastTrack) {
      const nextIndex = currentIndex + 1;
      set({
        currentIndex: nextIndex,
        activeTrack: queue[nextIndex],
        isPlaying: true
      });
    } else {
      if (repeatMode === 'all') {
        if (queue.length === 1) {
          const current = activeTrack;
          set({ activeTrack: null, isPlaying: false });
          setTimeout(() => set({ activeTrack: current, isPlaying: true }), 30);
        } else if (isShuffle) {
          const currentTrack = queue[currentIndex];
          const freshlyShuffled = shuffleArray(originalQueue, currentTrack.id);
          const newQueue = [currentTrack, ...freshlyShuffled];
          set({
            queue: newQueue,
            currentIndex: 1,
            activeTrack: newQueue[1],
            isPlaying: true
          });
        } else {
          set({
            currentIndex: 0,
            activeTrack: queue[0],
            isPlaying: true
          });
        }
      } else {
        set({ isPlaying: false });
      }
    }
  },

  playPrevious: () => {
    const { queue, currentIndex } = get();
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      set({
        currentIndex: nextIndex,
        activeTrack: queue[nextIndex],
        isPlaying: true
      });
    } else {
      const current = queue[0];
      set({ activeTrack: null, isPlaying: false });
      setTimeout(() => set({ activeTrack: current, isPlaying: true }), 30);
    }
  },

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  toggleRepeat: () => set((state) => {
    const nextModes: Record<RepeatMode, RepeatMode> = { off: 'one', one: 'all', all: 'off' };
    const nextMode = nextModes[state.repeatMode];
    if (nextMode === 'one' && state.isShuffle) {
      const currentTrack = state.activeTrack;
      const originalIdx = state.originalQueue.findIndex(t => t.id === currentTrack?.id);
      return {
        repeatMode: nextMode,
        isShuffle: false,
        queue: state.originalQueue.length ? state.originalQueue : state.queue,
        currentIndex: originalIdx !== -1 ? originalIdx : 0
      };
    }
    return { repeatMode: nextMode };
  }),

  toggleShuffle: () => set((state) => {
    if (state.repeatMode === 'one') {
      return {};
    }
    const nextShuffle = !state.isShuffle;
    if (nextShuffle) {
      if (!state.activeTrack || state.queue.length <= 1) {
        return { isShuffle: nextShuffle };
      }
      const currentTrack = state.activeTrack;
      const baseTracks = state.originalQueue.length ? state.originalQueue : state.queue;
      const shuffledRemaining = shuffleArray(baseTracks, currentTrack.id);
      return {
        isShuffle: nextShuffle,
        originalQueue: baseTracks,
        queue: [currentTrack, ...shuffledRemaining],
        currentIndex: 0
      };
    } else {
      if (!state.activeTrack || !state.originalQueue.length) {
        return { isShuffle: nextShuffle };
      }
      const currentTrack = state.activeTrack;
      const originalIdx = state.originalQueue.findIndex(t => t.id === currentTrack.id);
      return {
        isShuffle: nextShuffle,
        queue: state.originalQueue,
        currentIndex: originalIdx !== -1 ? originalIdx : 0
      };
    }
  }),
}))