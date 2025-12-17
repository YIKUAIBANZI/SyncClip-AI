import React from 'react';
import { ClipItem, ClipType } from '../types';
import { ClipTypeIcon, DeviceIcon, Copy, Trash2, Star, Zap } from './Icon';

interface ClipCardProps {
  clip: ClipItem;
  isSelected: boolean;
  onSelect: (clip: ClipItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

const ClipCard: React.FC<ClipCardProps> = ({ clip, isSelected, onSelect, onDelete, onToggleFavorite }) => {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(clip.content);
    // Could add a toast notification here
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
    switch (type) {
      case ClipType.CODE: return 'border-l-pink-500';
      case ClipType.URL: return 'border-l-blue-500';
      case ClipType.EMAIL: return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <div 
      onClick={() => onSelect(clip)}
      className={`
        relative group p-4 mb-3 rounded-lg border border-slate-700 bg-surface cursor-pointer transition-all duration-200
        border-l-4 ${getBorderColor(clip.type)}
        ${isSelected ? 'ring-2 ring-primary bg-slate-800' : 'hover:bg-slate-700'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <DeviceIcon name={clip.deviceName} className="w-3 h-3" />
          <span>{clip.deviceName}</span>
          <span>•</span>
          <span>{new Date(clip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={handleFavorite} className={`p-1.5 rounded hover:bg-slate-600 ${clip.isFavorite ? 'text-yellow-400' : 'text-slate-400'}`}>
            <Star className="w-3.5 h-3.5" fill={clip.isFavorite ? "currentColor" : "none"} />
          </button>
          <button onClick={handleCopy} className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-900/30 text-slate-400 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Preview - Shows actual text now */}
      <div className="mb-2">
        <p className="text-sm text-slate-200 font-mono line-clamp-3 break-all leading-relaxed">
            {clip.content}
        </p>
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