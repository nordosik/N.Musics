import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Твои настройки картинок */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lygdcjfgowgsgkghlgjw.supabase.co' // Проверь, чтобы тут был полный хост
      }
    ]
  },

  devIndicators: false
};

export default nextConfig;