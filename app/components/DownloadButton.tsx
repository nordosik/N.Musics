"use client";

import { Download, Check } from "lucide-react";
import { useState, useEffect, memo } from "react";
import { usePlayer } from "../lib/usePlayer";
import { locales } from "../lib/locales";

interface DownloadButtonProps {
  url: string;
  fileName: string;
  isMini?: boolean; // Флаг для отображения в списке треков
  isHot?: boolean;  // Добавили пропс, чтобы поддержать огненный неон, если трек "горячий"
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ url, fileName, isMini, isHot }) => {
  const [status, setStatus] = useState<"idle" | "downloading" | "success">("idle");

  // Достаем текущий язык из Zustand
  const language = usePlayer(state => state.language);
  const t = locales[(language as 'ru' | 'en') || 'en'];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (status === "success") {
      timeoutId = setTimeout(() => {
        setStatus("idle");
      }, 2000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [status]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!url) return alert(t.noUrlAlert);
    if (status !== "idle") return;

    setStatus("downloading");

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${fileName}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      // UX: Включаем статус успеха на 2 секунды
      setStatus("success");
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      // Запасной вариант
      window.open(url, '_blank');
      setStatus("idle");
    }
  };

  const isDownloading = status === "downloading";
  const isSuccess = status === "success";

  // Динамические неоновые тени под стиль N.Musics
  const neonShadowClass = isHot
    ? "shadow-[0_0_15px_rgba(239,68,68,0.5)] border-red-500/50 text-red-400" // Алый неон для HOT
    : "shadow-[0_0_15px_rgba(16,185,129,0.5)] border-emerald-500/50 text-emerald-400"; // Изумрудный для обычных

  // 1. ВАРИАНТ ДЛЯ СПИСКА ТРЕКОВ (isMini)
  if (isMini) {
    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`
          flex items-center justify-center
          w-8 h-8 rounded-full transition-all duration-300
          disabled:opacity-50 min-w-[32px]
          ${isDownloading ? `bg-white/5 animate-pulse border ${neonShadowClass}` : ''}
          ${isSuccess ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 scale-105' : ''}
          ${status === "idle" ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-transparent hover:border-white/10 active:scale-90' : ''}
        `}
      >
        {isDownloading && (
          <div className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${isHot ? 'border-red-500' : 'border-emerald-500'}`} />
        )}
        {isSuccess && <Check size={14} className="animate-bounce" />}
        {status === "idle" && <Download size={14} />}
      </button>
    );
  }

  // 2. СТАНДАРТНАЯ БОЛЬШАЯ КНОПКА-КАПСУЛА
  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className={`
        group flex items-center gap-2 px-5 py-2 rounded-full transition-all duration-300 text-[12px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-70 border
        ${isDownloading ? `bg-white/5 animate-pulse ${neonShadowClass}` : ''}
        ${isSuccess ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : ''}
        ${status === "idle" ? 'bg-white/5 hover:bg-white/10 text-white border-white/10 hover:border-white/20' : ''}
      `}
    >
      {isDownloading && (
        <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${isHot ? 'border-red-500' : 'border-emerald-500'}`} />
      )}
      {isSuccess && <Check size={16} className="text-emerald-400 animate-bounce" />}
      {status === "idle" && (
        <Download size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
      )}

      <span>
        {isDownloading && (t.downloading || "Загрузка...")}
        {isSuccess && (t.downloadSuccess || "Готово!")}
        {status === "idle" && t.downloadBtn}
      </span>
    </button>
  );
};

export default memo(DownloadButton);