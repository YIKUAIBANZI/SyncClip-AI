import React from 'react';
import { ClipItem, ClipType } from '../types';
import { ClipTypeIcon, Copy, Share2 } from './Icon';

interface ClipDetailProps {
  clip: ClipItem | null;
}

const ClipDetail: React.FC<ClipDetailProps> = ({ clip }) => {
  if (!clip) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
          <Copy className="w-8 h-8 opacity-50" />
        </div>
        <p>Select a clip to view details</p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (clip.type === ClipType.IMAGE) {
        try {
            const fetchRes = await fetch(clip.content);
            const blob = await fetchRes.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            // Optional: alert('Image copied');
        } catch (err) {
            console.error("Failed to copy image", err);
        }
    } else {
        navigator.clipboard.writeText(clip.content);
    }
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${
             clip.type === ClipType.CODE ? 'bg-pink-500/20 text-pink-400' : 
             clip.type === ClipType.URL ? 'bg-blue-500/20 text-blue-400' : 
             clip.type === ClipType.IMAGE ? 'bg-orange-500/20 text-orange-400' :
             'bg-slate-700 text-slate-300'
          }`}>
            <ClipTypeIcon type={clip.type} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{clip.type} Clip</h2>
            <p className="text-xs text-slate-400">Captured from {clip.deviceName}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={handleCopy}
             className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors"
           >
             <Copy className="w-4 h-4" /> Copy
           </button>
           <button className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md transition-colors">
             <Share2 className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-black/30 rounded-lg border border-slate-700 p-4 flex justify-center">
          {clip.type === ClipType.URL ? (
            <a href={clip.content} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline break-all">
              {clip.content}
            </a>
          ) : clip.type === ClipType.IMAGE ? (
             <img src={clip.content} alt="Full Clip" className="max-w-full max-h-[60vh] object-contain rounded" />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 break-words w-full">
              {clip.content}
            </pre>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">AI Analysis</h3>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="mb-3">
              <span className="text-xs text-slate-500 block mb-1">Summary</span>
              <p className="text-slate-200">{clip.summary}</p>
            </div>
             <div>
              <span className="text-xs text-slate-500 block mb-1">Detected Tags</span>
              <div className="flex flex-wrap gap-2">
                {clip.tags?.map((tag, idx) => (
                   <span key={idx} className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">
                     #{tag}
                   </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClipDetail;