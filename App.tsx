
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Peer } from 'peerjs';
import { ClipItem, ClipType, DeviceType, PeerMessage } from './types';
import { analyzeClipboardContent } from './services/geminiService';
import ClipCard from './components/ClipCard';
import ClipDetail from './components/ClipDetail';
import ConnectionModal from './components/ConnectionModal';
import Toast from './components/Toast';
import { Clipboard, Plus, RefreshCw, Zap, Cast, Wifi, QrCode, Bomb, ImageIcon } from './components/Icon';

const LOCAL_STORAGE_KEY = 'syncclip_history';

// Platform detection for hints
const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const modifierKey = isMac ? '⌘' : 'Ctrl';

// Refined Nano Banana Style Logo
const AppLogo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shadow-xl shadow-yellow-500/10 rounded-xl shrink-0">
    <rect width="40" height="40" rx="10" fill="url(#banana_gradient)"/>
    <path d="M12 14C12 14 14 10 20 10C26 10 28 14 28 14C28 14 30 20 28 26C26 32 20 32 20 32C20 32 14 32 12 26C10 20 12 14 12 14Z" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M20 10V7" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="20" cy="21" r="4" fill="white" fillOpacity="0.2" />
    <path d="M18 21H22M20 19V23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="banana_gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDE047"/>
        <stop offset="0.6" stopColor="#EAB308"/>
        <stop offset="1" stopColor="#6366F1"/>
      </linearGradient>
    </defs>
  </svg>
);

function App() {
  const [history, setHistory] = useState<ClipItem[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [activeDevice, setActiveDevice] = useState<string>(isMac ? DeviceType.MAC : DeviceType.WINDOWS);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // PeerJS State
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const peerInstance = useRef<Peer | null>(null);

  const selectedClip = history.find(item => item.id === selectedClipId) || null;

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    } else {
        const welcome: ClipItem = {
            id: 'welcome-1',
            content: 'Welcome to SyncClip AI! Support for Text, URLs, Code, and Images.',
            type: ClipType.TEXT,
            timestamp: Date.now(),
            deviceId: 'system',
            deviceName: 'System',
            summary: 'Welcome Message',
            tags: ['guide', 'start'],
            isFavorite: false
        };
        setHistory([welcome]);
        setSelectedClipId('welcome-1');
    }
  }, []);

  useEffect(() => {
    if (history.length > 0) {
        try {
           localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
           console.error("Storage limit reached?", e);
        }
    }
  }, [history]);

  useEffect(() => {
    const interval = setInterval(() => {
        setHistory(prev => {
            const now = Date.now();
            const validHistory = prev.filter(item => !item.expiresAt || item.expiresAt > now);
            if (validHistory.length !== prev.length) {
                if (selectedClipId && !validHistory.find(i => i.id === selectedClipId)) {
                    setSelectedClipId(null);
                }
                return validHistory;
            }
            return prev;
        });
    }, 5000); 
    return () => clearInterval(interval);
  }, [selectedClipId]);

  useEffect(() => {
    let peer: Peer;
    const initPeer = async () => {
        try {
            const PeerModule = await import('peerjs');
            const PeerClass = PeerModule.Peer || PeerModule.default || (window as any).Peer;
            peer = new PeerClass();
            peer.on('open', (id) => {
                setMyPeerId(id);
                const urlParams = new URLSearchParams(window.location.search);
                const targetPeerId = urlParams.get('connect');
                if (targetPeerId && targetPeerId !== id) {
                    setTimeout(() => connectToPeer(targetPeerId), 500);
                    setToastMessage(`Linking device...`);
                    window.history.replaceState({}, document.title, "/");
                }
            });
            peer.on('connection', (conn) => {
                setupConnection(conn);
                setToastMessage(`New device connected!`);
            });
            peerInstance.current = peer;
        } catch (e) {
            console.error("Failed to load PeerJS", e);
        }
    };
    initPeer();
    return () => { if (peerInstance.current) peerInstance.current.destroy(); };
  }, []);

  const setupConnection = (conn: any) => {
    conn.on('open', () => {
        setConnections(prev => {
            if (prev.find(c => c.peer === conn.peer)) return prev;
            return [...prev, conn];
        });
    });
    conn.on('data', (data: PeerMessage) => {
        if (data.type === 'NEW_CLIP') {
            const newItem = data.payload as ClipItem;
            setHistory(prev => {
                if (prev.some(item => item.id === newItem.id)) return prev;
                return [newItem, ...prev];
            });
            if (!newItem.summary) {
                performBackgroundAnalysis(newItem.id, newItem.content, newItem.type);
            }
            const msg = newItem.expiresAt ? `Received Private Clip!` : `Received from ${newItem.deviceName}`;
            setToastMessage(msg);
        }
    });
    conn.on('close', () => { setConnections(prev => prev.filter(c => c.peer !== conn.peer)); });
  };

  const connectToPeer = (peerId: string) => {
      if (!peerInstance.current || peerId === myPeerId) return;
      const conn = peerInstance.current.connect(peerId);
      setupConnection(conn);
  };

  const broadcastClip = (clip: ClipItem) => {
      connections.forEach(conn => { if (conn.open) conn.send({ type: 'NEW_CLIP', payload: clip }); });
  };

  const performBackgroundAnalysis = async (id: string, content: string, type: ClipType) => {
    try {
        const analysis = await analyzeClipboardContent(content, type);
        setHistory(prev => prev.map(item => 
            item.id === id ? { ...item, ...analysis } : item
        ));
    } catch (err) {
        console.error("Background AI Analysis failed:", err);
    }
  };

  const handleAddClip = (contentOrData: string, type: ClipType = ClipType.TEXT, isIncomingSync: boolean = false) => {
    if (!contentOrData.trim()) return;
    if (type === ClipType.TEXT && history.length > 0 && history[0].content === contentOrData) return;

    const ephemeral = isEphemeral;
    setIsEphemeral(false);
    setCurrentInput('');

    const newItem: ClipItem = {
      id: uuidv4(),
      content: contentOrData,
      timestamp: Date.now(),
      deviceId: isIncomingSync ? 'mobile-sim' : (myPeerId ? myPeerId.substring(0, 5) : 'local'),
      deviceName: isIncomingSync ? DeviceType.IPHONE : activeDevice,
      type: type,
      isFavorite: false,
      expiresAt: ephemeral ? Date.now() + 60000 : undefined,
      summary: type === ClipType.IMAGE ? "Analyzing Image..." : "Analyzing Text...",
      tags: []
    };

    setHistory(prev => [newItem, ...prev]);
    setSelectedClipId(newItem.id);
    broadcastClip(newItem);
    performBackgroundAnalysis(newItem.id, contentOrData, type);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  };

  const handlePasteButtonClick = async () => {
      try {
          // Attempt to use modern Clipboard API
          const items = await navigator.clipboard.read();
          for (const item of items) {
              if (item.types.some(t => t.startsWith('image/'))) {
                  const type = item.types.find(t => t.startsWith('image/'))!;
                  const blob = await item.getType(type);
                  const base64 = await blobToBase64(blob);
                  handleAddClip(base64, ClipType.IMAGE);
                  return;
              } else if (item.types.includes('text/plain')) {
                  const blob = await item.getType('text/plain');
                  const text = await blob.text();
                  if (text.trim()) {
                    handleAddClip(text, ClipType.TEXT);
                    setToastMessage("Pasted from clipboard");
                    return;
                  }
              }
          }
      } catch (err) {
          // Fallback to simpler string read if permission fails or API not supported
          try {
              const text = await navigator.clipboard.readText();
              if (text) {
                  handleAddClip(text, ClipType.TEXT);
                  setToastMessage("Pasted from clipboard");
              } else {
                  setToastMessage("Clipboard is empty");
              }
          } catch (e) {
              setToastMessage(`Permission denied! Click the 🔒 icon in the address bar and select 'Allow' for Clipboard.`);
          }
      }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-slate-100 overflow-hidden relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      <ConnectionModal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} myPeerId={myPeerId} onConnect={connectToPeer} connectedPeers={connections.map(c => c.peer)} />

      <header className="h-20 border-b border-slate-700 bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <AppLogo />
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none">SyncClip <span className="text-yellow-400 font-light">AI</span></h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">Nano Banana Powered</p>
          </div>
        </div>
        <button onClick={() => setIsConnectionModalOpen(true)} className={`flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl transition-all border ${connections.length > 0 ? 'bg-green-500/10 text-green-400 border-green-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500 shadow-lg'}`}>
            {connections.length > 0 ? <Wifi className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            <span className="hidden sm:inline font-semibold">{connections.length > 0 ? `${connections.length} Connected` : 'Pair Devices'}</span>
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`w-full md:w-[400px] flex flex-col border-r border-slate-700 bg-surface/30 ${selectedClipId && window.innerWidth < 768 ? 'hidden' : 'flex'}`}>
          <div className="p-5 border-b border-slate-700 bg-surface/50">
            <div className="relative group">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={isEphemeral ? "Secure message (1 min)..." : `Type or use ${modifierKey} V to paste...`}
                className={`w-full h-28 bg-slate-900/80 border rounded-2xl p-4 text-sm text-slate-200 focus:ring-2 focus:border-transparent outline-none resize-none transition-all duration-300 ${isEphemeral ? 'border-red-500/50 focus:ring-red-500' : 'border-slate-700 focus:ring-primary group-hover:border-slate-600'}`}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddClip(currentInput); } }}
                onPaste={(e) => {
                    if (e.clipboardData.files.length > 0) {
                        e.preventDefault();
                        const file = e.clipboardData.files[0];
                        if (file.type.startsWith('image/')) { blobToBase64(file).then(base64 => handleAddClip(base64, ClipType.IMAGE)); }
                    }
                }}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button onClick={() => setIsEphemeral(!isEphemeral)} className={`p-2 rounded-xl transition-all ${isEphemeral ? 'bg-red-500 text-white shadow-lg shadow-red-500/20 scale-110' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`} title="Self-Destruct (1 min)">
                    <Bomb className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-slate-700 mx-1"></div>
                
                <button onClick={handlePasteButtonClick} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700 transition-all active:scale-95 group/paste relative" title={`Smart Paste (${modifierKey} V)`}>
                    <Clipboard className="w-4 h-4" />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-1 rounded opacity-0 group-hover/paste:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none">Click to Capture</span>
                </button>

                <button onClick={() => handleAddClip(currentInput)} disabled={!currentInput.trim()} className={`${isEphemeral ? 'bg-red-600 hover:bg-red-500' : 'bg-primary hover:bg-indigo-600'} text-white p-2 rounded-xl disabled:opacity-50 transition-all flex items-center gap-2 text-xs px-4 font-bold shadow-lg shadow-indigo-500/10`}>
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                <Clipboard className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm italic">Nothing synced yet</p>
              </div>
            ) : (
              history.map(item => (
                <ClipCard key={item.id} clip={item} isSelected={selectedClipId === item.id} onSelect={(clip) => setSelectedClipId(clip.id)} onDelete={(id) => setHistory(prev => prev.filter(i => i.id !== id))} onToggleFavorite={(id) => setHistory(prev => prev.map(i => i.id === id ? { ...i, isFavorite: !i.isFavorite } : i))} />
              ))
            )}
          </div>
        </div>

        <div className={`flex-1 bg-slate-900/50 p-6 md:p-10 overflow-hidden ${!selectedClipId && window.innerWidth < 768 ? 'hidden' : 'block'}`}>
          {window.innerWidth < 768 && selectedClipId && (
            <button onClick={() => setSelectedClipId(null)} className="mb-6 text-slate-400 hover:text-white text-sm flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 transition-all">
              ← Back to list
            </button>
          )}
          <ClipDetail clip={selectedClip} />
        </div>
      </main>

      <footer className="h-10 bg-surface border-t border-slate-700 flex items-center px-6 text-[10px] text-slate-500 justify-between shrink-0">
         <div className="flex gap-6 font-medium">
           {connections.length > 0 ? (
               <span className="flex items-center gap-2 text-green-400"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></span> SYNC ACTIVE</span>
           ) : (
               <span className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-600 rounded-full"></span> OFFLINE</span>
           )}
           <span className="uppercase tracking-widest">DEVICE ID: {myPeerId ? myPeerId.substring(0,8).toUpperCase() : 'INIT...'}</span>
           <span className="text-slate-600">MODIFIER: {modifierKey}</span>
         </div>
         <div className="hidden sm:block opacity-50">v2.6 Nano Banana Edition</div>
      </footer>
    </div>
  );
}

export default App;
