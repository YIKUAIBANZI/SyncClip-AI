import React, { useState, useEffect } from 'react';
import { ClipItem, ClipType } from '../types';
import { ClipTypeIcon, DeviceIcon, Copy, Trash2, Star, Zap, Bomb, ImageIcon } from './Icon';

interface ClipCardProps {
  clip: ClipItem;
  isSelected: boolean;
  onSelect: (clip: ClipItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const ClipCard: React.FC<ClipCardProps> = ({ clip, isSelected, onSelect, onDelete, onToggleFavorite }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Countdown timer for ephemeral clips
  useEffect(() => {
    if (!clip.expiresAt) return;

    const updateTimer = () => {
        const remaining = Math.max(0, Math.ceil((clip.expiresAt! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
            // It will be removed by App.tsx logic
        }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [clip.expiresAt]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clip.type === ClipType.IMAGE) {
        // For images, we need to convert base64 back to blob to write to clipboard
        try {
            const fetchRes = await fetch(clip.content);
            const blob = await fetchRes.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
        } catch (err) {
            console.error("Failed to copy image", err);
        }
    } else {
        navigator.clipboard.writeText(clip.content);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(clip.id);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(clip.id);
  };

  const getBorderColor = (type: ClipType) => {
    if (clip.expiresAt) return 'border-l-red-500'; // Override for ephemeral
    switch (type) {
      case ClipType.CODE: return 'border-l-pink-500';
      case ClipType.URL: return 'border-l-blue-500';
      case ClipType.EMAIL: return 'border-l-green-500';
      case ClipType.IMAGE: return 'border-l-orange-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div 
      onClick={() => onSelect(clip)}
      className={`
        relative group p-4 mb-3 rounded-lg border cursor-pointer transition-all duration-200
        border-l-4 ${getBorderColor(clip.type)}
        ${isSelected ? 'ring-2 ring-primary bg-slate-800 border-slate-600' : 'bg-surface border-slate-700 hover:bg-slate-700'}
        ${clip.expiresAt ? 'bg-red-900/10' : ''}
      `}
    >
      {/* Background progress bar for ephemeral items */}
      {clip.expiresAt && timeLeft !== null && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-red-500/30 transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 60) * 100}%` }}
          />
      )}

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <DeviceIcon name={clip.deviceName} className="w-3 h-3" />
          <span>{clip.deviceName}</span>
          
          {clip.expiresAt ? (
             <span className="flex items-center gap-1 text-red-400 font-bold ml-1">
                 <Bomb className="w-3 h-3" />
                 {timeLeft}s
             </span>
          ) : (
            <>
                <span>•</span>
                <span>{new Date(clip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           {!clip.expiresAt && (
             <button onClick={handleFavorite} className={`p-1.5 rounded hover:bg-slate-600 ${clip.isFavorite ? 'text-yellow-400' : 'text-slate-400'}`}>
                <Star className="w-3.5 h-3.5" fill={clip.isFavorite ? "currentColor" : "none"} />
             </button>
           )}
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Preview */}
      <div className="mb-2">
        {clip.type === ClipType.IMAGE ? (
            <div className="relative w-full h-32 rounded-md overflow-hidden bg-black/20 border border-slate-700 flex items-center justify-center">
                 <img src={clip.content} alt="Clipboard content" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition-opacity">
                    <ImageIcon className="text-white w-6 h-6 drop-shadow-md" />
                 </div>
            </div>
        ) : (
            <p className="text-sm text-slate-200 font-mono line-clamp-3 break-all leading-relaxed">
                {clip.content}
            </p>
        )}
      </div>
      
      {/* AI Summary as Secondary Info */}
      {clip.summary && clip.summary !== clip.content && (
        <div className="flex items-center gap-1.5 mb-2 text-xs text-indigo-300/80 bg-indigo-500/5 px-2 py-1 rounded w-fit max-w-full">
            <Zap className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{clip.summary}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`
          text-[10px] uppercase font-bold px-1.5 py-0.5 rounded
          ${clip.type === ClipType.CODE ? 'bg-pink-500/10 text-pink-400' : ''}
          ${clip.type === ClipType.URL ? 'bg-blue-500/10 text-blue-400' : ''}
          ${clip.type === ClipType.TEXT ? 'bg-gray-500/10 text-gray-400' : ''}
          ${clip.type === ClipType.EMAIL ? 'bg-green-500/10 text-green-400' : ''}
          ${clip.type === ClipType.IMAGE ? 'bg-orange-500/10 text-orange-400' : ''}
        `}>
          {clip.type}
        </span>
        {clip.tags?.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ClipCard;