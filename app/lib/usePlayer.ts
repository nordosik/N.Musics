import { create } from 'zustand'

// Описываем, как выглядит наш трек в базе
interface Track {
  id: string | number
  title: string
  audio_url: string
  cover_url?: string
}

interface PlayerStore {
  activeTrack: Track | null
  isPlaying: boolean
  setActiveTrack: (track: Track) => void
  setIsPlaying: (playing: boolean) => void
}

export const usePlayer = create<PlayerStore>((set) => ({
  activeTrack: null,
  isPlaying: false,
  setActiveTrack: (track: Track) => set({ activeTrack: track, isPlaying: true }),
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
}))
