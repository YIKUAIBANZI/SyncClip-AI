import React, { useEffect } from 'react';
import { Share2 } from './Icon';

interface ToastProps {
  message: string;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
      <div className="bg-slate-800 text-white border border-slate-600 shadow-xl rounded-lg px-4 py-3 flex items-center gap-3">
        <div className="bg-indigo-500/20 p-2 rounded-full">
           <Share2 className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
           <p className="text-sm font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default Toast;