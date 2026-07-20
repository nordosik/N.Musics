import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Player from './components/Player'
import LyricsOverlay from './components/LyricsOverlay'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "N.Musics",
  description: "Слушай треки от NORDOSIK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru" // Меняем дефолтный язык на "ru", так как Nordosik пишет треки на русском и это основная аудитория
      suppressHydrationWarning // Железная защита Next.js от ворнингов гидратации при переключении языков в localStorage
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#050505]`} // Добавили дефолтный цвет фона, чтобы при загрузке не было белой вспышки
    >
      <body className="min-h-full flex flex-col">{children}
        <LyricsOverlay />
        <Player />
      </body>
    </html>
  );
}
