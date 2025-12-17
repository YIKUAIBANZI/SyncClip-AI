import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Peer } from 'peerjs';
import { ClipItem, ClipType, DeviceType, PeerMessage } from './types';
import { analyzeClipboardContent } from './services/geminiService';
import ClipCard from './components/ClipCard';
import ClipDetail from './components/ClipDetail';
import ConnectionModal from './components/ConnectionModal';
import Toast from './components/Toast';
import { Clipboard, Plus, RefreshCw, SmartphoneNfc, Zap, ZapOff, Cast, Wifi, QrCode } from './components/Icon';

const LOCAL_STORAGE_KEY = 'syncclip_history';

function App() {
  const [history, setHistory] = useState<ClipItem[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [activeDevice, setActiveDevice] = useState<string>(DeviceType.MAC);
  const [autoPasteEnabled, setAutoPasteEnabled] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // PeerJS State
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const peerInstance = useRef<Peer | null>(null);

  // Load history on mount
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
            content: 'Welcome to SyncClip AI! Use the "Connect" button or scan the QR code to sync devices.',
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

  // Save history on change
  useEffect(() => {
    if (history.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

  // Initialize PeerJS
  useEffect(() => {
    let peer: Peer;

    const initPeer = async () => {
        try {
            // Import map in index.html handles the resolution of 'peerjs'
            // We use standard dynamic import here if top level fails, but top level import { Peer } should work via ESM.
            // However, to be absolutely safe with various buildless environments:
            const PeerModule = await import('peerjs');
            const PeerClass = PeerModule.Peer || PeerModule.default || (window as any).Peer;
            
            peer = new PeerClass();
            
            peer.on('open', (id) => {
                console.log('My Peer ID is: ' + id);
                setMyPeerId(id);
                
                // Check for auto-connect URL param
                const urlParams = new URLSearchParams(window.location.search);
                const targetPeerId = urlParams.get('connect');
                if (targetPeerId && targetPeerId !== id) {
                    console.log("Auto-connecting to:", targetPeerId);
                    // Slight delay to ensure peer is ready
                    setTimeout(() => connectToPeer(targetPeerId), 500);
                    setToastMessage(`Linking to ${targetPeerId.substring(0,5)}...`);
                    // Clean URL
                    window.history.replaceState({}, document.title, "/");
                }
            });

            peer.on('connection', (conn) => {
                console.log('Incoming connection from: ', conn.peer);
                setupConnection(conn);
                setToastMessage(`New connection from ${conn.peer.substring(0, 5)}...`);
            });

            peer.on('error', (err) => {
                console.error('PeerJS Error:', err);
            });

            peerInstance.current = peer;
        } catch (e) {
            console.error("Failed to load PeerJS", e);
        }
    };
    initPeer();

    return () => {
        if (peerInstance.current) {
            peerInstance.current.destroy();
        }
    };
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
            setToastMessage(`Received new clip from ${newItem.deviceName}`);
        }
    });

    conn.on('close', () => {
        setConnections(prev => prev.filter(c => c.peer !== conn.peer));
    });
  };

  const connectToPeer = (peerId: string) => {
      if (!peerInstance.current) return;
      // Prevent self-connect
      if (peerId === myPeerId) return;
      
      const conn = peerInstance.current.connect(peerId);
      setupConnection(conn);
  };

  const broadcastClip = (clip: ClipItem) => {
      connections.forEach(conn => {
          if (conn.open) {
              conn.send({ type: 'NEW_CLIP', payload: clip });
          }
      });
  };

  const handleAddClip = async (content: string, device: string = activeDevice, isIncomingSync: boolean = false) => {
    if (!content.trim()) return;
    
    if (history.length > 0 && history[0].content === content) return;

    setIsAnalyzing(true);
    setCurrentInput('');

    try {
      const analysis = await analyzeClipboardContent(content);

      const newItem: ClipItem = {
        id: uuidv4(),
        content: content,
        timestamp: Date.now(),
        deviceId: isIncomingSync ? 'mobile-sim' : (myPeerId ? myPeerId.substring(0, 5) : 'local'),
        deviceName: isIncomingSync ? DeviceType.IPHONE : activeDevice,
        isFavorite: false,
        ...analysis
      };

      setHistory(prev => [newItem, ...prev]);
      setSelectedClipId(newItem.id);
      
      broadcastClip(newItem);

    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-paste logic
  useEffect(() => {
    const handleFocus = async () => {
      if (!autoPasteEnabled) return;
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().length > 0) {
           if (history.length === 0 || history[0].content !== text) {
             handleAddClip(text);
           }
        }
      } catch (err) {
        // console.log("Auto-paste failed:", err);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [autoPasteEnabled, history]);

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  };

  const handleToggleFavorite = (id: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const simulateIncomingSync = () => {
    const mobileClips = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "Meeting at 3PM at Starbase 10.",
    ];
    const randomContent = mobileClips[Math.floor(Math.random() * mobileClips.length)];
    handleAddClip(randomContent, DeviceType.IPHONE, true);
    setToastMessage("Simulated sync received!");
  };

  const selectedClip = history.find(c => c.id === selectedClipId) || null;

  return (
    <div className="flex flex-col h-screen bg-background text-slate-100 overflow-hidden relative">
      
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <ConnectionModal 
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        myPeerId={myPeerId}
        onConnect={connectToPeer}
        connectedPeers={connections.map(c => c.peer)}
      />

      {/* Header */}
      <header className="h-16 border-b border-slate-700 bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Clipboard className="text-white w-5 h-5" />
          </div>
          <h1 className="font-bold text-xl tracking-tight hidden sm:block">SyncClip <span className="text-indigo-400 font-light">AI</span></h1>
        </div>

        <div className="flex items-center gap-3">
          
          <button
            onClick={() => setAutoPasteEnabled(!autoPasteEnabled)}
            className={`
              flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-colors border
              ${autoPasteEnabled 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/50 hover:bg-amber-500/20' 
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}
            `}
            title={autoPasteEnabled ? "Auto-capture active" : "Enable auto-capture"}
          >
            {autoPasteEnabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{autoPasteEnabled ? 'Auto On' : 'Auto Off'}</span>
          </button>

          <button 
            onClick={() => setIsConnectionModalOpen(true)}
            className={`
                flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-colors border
                ${connections.length > 0 
                    ? 'bg-green-500/10 text-green-400 border-green-500/50' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}
            `}
          >
            {connections.length > 0 ? <Wifi className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            <span className="hidden sm:inline">
                {connections.length > 0 ? `${connections.length} Device(s)` : 'Connect'}
            </span>
          </button>
          
          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block"></div>
          
          <button 
            onClick={simulateIncomingSync}
            className="flex items-center gap-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-md transition-colors"
          >
            <SmartphoneNfc className="w-4 h-4" />
            <span className="hidden sm:inline">Simulate</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar (History & Input) */}
        <div className={`
           w-full md:w-96 flex flex-col border-r border-slate-700 bg-surface/30
           ${selectedClipId && window.innerWidth < 768 ? 'hidden' : 'flex'}
        `}>
          {/* Input Area */}
          <div className="p-4 border-b border-slate-700 bg-surface/50">
            <div className="relative">
              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Paste text to sync & analyze..."
                className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none placeholder:text-slate-600"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddClip(currentInput);
                  }
                }}
              />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.readText().then(text => setCurrentInput(text)).catch(err => alert("Clipboard empty or denied"))}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                >
                    <Clipboard className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleAddClip(currentInput)}
                  disabled={!currentInput.trim() || isAnalyzing}
                  className="bg-primary hover:bg-indigo-600 text-white p-1.5 rounded disabled:opacity-50 transition-colors flex items-center gap-1 text-xs px-2"
                >
                  {isAnalyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isAnalyzing ? 'Syncing...' : 'Add'}
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center text-slate-500 mt-10">
                <p>No clips yet.</p>
              </div>
            ) : (
              history.map(item => (
                <ClipCard 
                  key={item.id} 
                  clip={item} 
                  isSelected={selectedClipId === item.id}
                  onSelect={(clip) => setSelectedClipId(clip.id)}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className={`
          flex-1 bg-slate-900/50 p-6 md:p-8 overflow-hidden
          ${!selectedClipId && window.innerWidth < 768 ? 'hidden' : 'block'}
        `}>
          {window.innerWidth < 768 && selectedClipId && (
            <button 
              onClick={() => setSelectedClipId(null)}
              className="mb-4 text-slate-400 hover:text-white text-sm flex items-center gap-1"
            >
              ← Back to list
            </button>
          )}
          <ClipDetail clip={selectedClip} />
        </div>

      </main>

      {/* Footer */}
      <footer className="h-8 bg-surface border-t border-slate-700 flex items-center px-4 text-[10px] text-slate-500 justify-between shrink-0">
         <div className="flex gap-4">
           {connections.length > 0 ? (
               <span className="flex items-center gap-1 text-green-400"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> P2P Sync Active ({connections.length})</span>
           ) : (
               <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span> Offline Mode</span>
           )}
           <span>ID: {myPeerId ? myPeerId.substring(0,6) + '...' : '...'}</span>
         </div>
      </footer>
    </div>
  );
}

export default App;