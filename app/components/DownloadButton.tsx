"use client";

import { Download } from "lucide-react";
import { useState } from "react";

interface DownloadButtonProps {
  url: string;
  fileName: string;
  isMini?: boolean; // Добавили флаг для отображения в списке треков
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ url, fileName, isMini }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    // Останавливаем всплытие, чтобы не сработал клик по строке списка
    e.stopPropagation();

    if (!url) return alert("Ссылка на файл не найдена");
    setIsDownloading(true);

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
    } catch (error) {
      console.error("Ошибка загрузки:", error);
      // Запасной вариант: просто открываем в новой вкладке
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  // Если кнопка используется внутри списка альбома
  if (isMini) {
    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="
      flex items-center justify-center
      w-8 h-8 
      bg-white/5 hover:bg-white/10 
      rounded-full transition-all 
      text-zinc-400 hover:text-white
      border border-transparent hover:border-white/10
      disabled:opacity-50
    "
      >
        {isDownloading ? (
          <div className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
        ) : (
          <Download size={14} />
        )}
      </button>
    );
  }

  // Стандартная большая кнопка-капсула
  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="group flex items-center gap-2 px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50"
    >
      {isDownloading ? (
        <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
      ) : (
        <Download size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
      )}
      <span className="text-[12px] font-black uppercase tracking-widest">
        {isDownloading ? "Загрузка..." : "Download"}
      </span>
    </button>
  );
};

export default DownloadButton;