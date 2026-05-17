import { create } from 'zustand'

export type RepeatMode = 'off' | 'one' | 'all';

interface Track {
  id: string | number;
  title: string;
  audio_url: string;
  cover_url?: string;
  is_album?: boolean;
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
  setIsLyricsOpen: (open: boolean) => void
  setActiveTrack: (track: Track) => void
  setQueue: (tracks: Track[], index?: number) => void
  playNext: (isAutoEnded?: boolean) => void
  playPrevious: () => void
  setIsPlaying: (playing: boolean) => void
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
  setIsLyricsOpen: (open) => set({ isLyricsOpen: open }),

  setActiveTrack: (track: Track) => set({
    activeTrack: track,
    isPlaying: true,
    queue: [track],
    originalQueue: [track],
    currentIndex: 0
  }),

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

    // 1. ПРИОРИТЕТ ДЛЯ REPEAT ONE: Если трек кончился сам — нативный loop в Player.tsx зациклит его. 
    // Если это шаффл + repeat_one — функция просто прерывается, не давая переключить трек.
    if (isAutoEnded && repeatMode === 'one') {
      return;
    }

    // Если нажат ручной клик "Вперед" при Repeat One на сингле — просто перезапускаем его
    if (!isAutoEnded && repeatMode === 'one' && queue.length === 1) {
      const current = activeTrack;
      set({ activeTrack: null, isPlaying: false });
      setTimeout(() => set({ activeTrack: current, isPlaying: true }), 30);
      return;
    }

    // 2. ЛОГИКА ДЛЯ СИНГЛОВ ИЛИ ПОСЛЕДНИХ ТРЕКОВ
    const isLastTrack = currentIndex === queue.length - 1;

    if (!isLastTrack) {
      // Обычный переход к следующему треку в текущей очереди
      const nextIndex = currentIndex + 1;
      set({
        currentIndex: nextIndex,
        activeTrack: queue[nextIndex],
        isPlaying: true
      });
    } else {
      // Мы дошли до конца очереди (или это единственный трек в сингле)
      if (repeatMode === 'all') {
        if (queue.length === 1) {
          // ЖЕСТКИЙ ФИКС СИНГЛА: сбрасываем и играем заново без зависаний
          const current = activeTrack;
          set({ activeTrack: null, isPlaying: false });
          setTimeout(() => set({ activeTrack: current, isPlaying: true }), 30);
        } else if (isShuffle) {
          // ЧЕСТНЫЙ СЛУЧАЙНЫЙ ПОВТОР АЛЬБОМА: пересобираем очередь заново случайным образом!
          const currentTrack = queue[currentIndex]; // Последний игравший трек
          // Перемешиваем оригинальный список, исключая текущий трек, чтобы он не повторился дважды подряд
          const freshlyShuffled = shuffleArray(originalQueue, currentTrack.id);
          const newQueue = [currentTrack, ...freshlyShuffled];

          // Сразу шагаем на второй трек в новой случайной очереди
          set({
            queue: newQueue,
            currentIndex: 1,
            activeTrack: newQueue[1],
            isPlaying: true
          });
        } else {
          // Обычный повтор альбома без шаффла: прыгаем строго на первый трек
          set({
            currentIndex: 0,
            activeTrack: queue[0],
            isPlaying: true
          });
        }
      } else {
        // Повтор выключен — аккуратно тушим плеер в конце трека
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
      // Если мы в самом начале очереди — сбрасываем текущую песню на 0:00
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

    // ЖЕСТКОЕ УСЛОВИЕ: Если переключились на повтор ОДНОГО трека ('one')
    if (nextMode === 'one' && state.isShuffle) {
      // Отключаем шаффл и возвращаем оригинальную очередь, чтобы ничего не перемешивалось
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
    // ЖЕСТКОЕ УСЛОВИЕ: Если СЕЙЧАС включен повтор ОДНОГО трека, то клик по кнопке перемешивания просто ИГНОРИРУЕТСЯ
    if (state.repeatMode === 'one') {
      return {}; // Ничего не меняем в стейте, блокируем клик
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