import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
import { Copy, Wifi, X, Cast, QrCode, Check, Link, Camera } from './Icon';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPeerId: string | null;
  onConnect: (peerId: string) => void;
  connectedPeers: string[];
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose, myPeerId, onConnect, connectedPeers }) => {
  const [targetId, setTargetId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Generate a shareable link that will auto-connect the other device
  const getShareLink = () => {
    if (!myPeerId) return '';
    const url = new URL(window.location.href);
    url.searchParams.set('connect', myPeerId);
    return url.toString();
  };

  const handleCopyLink = () => {
    const link = getShareLink();
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnect = () => {
    if (targetId.trim()) {
      onConnect(targetId.trim());
      setTargetId('');
      handleStopScan(); 
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    // Allow UI to update first
    setTimeout(() => {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        html5QrCode.start(
            { facingMode: "environment" }, 
            config, 
            (decodedText) => {
                // Success callback
                console.log("QR Code scanned:", decodedText);
                try {
                    // Check if it's a URL with 'connect' param
                    const url = new URL(decodedText);
                    const connectId = url.searchParams.get('connect');
                    if (connectId) {
                        onConnect(connectId);
                        handleStopScan();
                    } else {
                        // Assume raw ID
                        setTargetId(decodedText);
                        onConnect(decodedText);
                        handleStopScan();
                    }
                } catch (e) {
                    // Not a URL, try as raw ID
                    setTargetId(decodedText);
                }
            },
            (errorMessage) => {
                // parse error, ignore loop
            }
        ).catch(err => {
            console.error("Error starting scanner", err);
            setIsScanning(false);
        });
    }, 100);
  };

  const handleStopScan = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
            setIsScanning(false);
        }).catch(err => console.error(err));
    } else {
        setIsScanning(false);
    }
  };

  // Cleanup on close
  useEffect(() => {
      if (!isOpen) {
          handleStopScan();
      }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Cast className="w-5 h-5 text-indigo-400" />
            Connect Devices
          </h2>
          <button onClick={() => { handleStopScan(); onClose(); }} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          
          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-4">
            {isScanning ? (
                <div className="w-full">
                    <div id="reader" className="w-full h-64 bg-black rounded-lg overflow-hidden"></div>
                    <button 
                        onClick={handleStopScan}
                        className="mt-4 text-sm text-red-400 hover:text-red-300 w-full text-center"
                    >
                        Stop Camera
                    </button>
                </div>
            ) : (
                <>
                    <div className="bg-white p-3 rounded-xl shadow-lg relative group">
                    {myPeerId ? (
                        <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(getShareLink())}`}
                        alt="Scan to Connect"
                        className="w-40 h-40"
                        />
                    ) : (
                        <div className="w-40 h-40 bg-slate-200 animate-pulse rounded"></div>
                    )}
                    </div>
                    <div className="flex gap-2">
                         <button 
                            onClick={startScanning}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Camera className="w-4 h-4" />
                            Scan Partner's QR
                        </button>
                    </div>
                </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px bg-slate-700 flex-1"></div>
            <span className="text-xs text-slate-500 font-medium">OR MANUAL</span>
            <div className="h-px bg-slate-700 flex-1"></div>
          </div>

          {/* Connect Section */}
          <div className="space-y-2">
             <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Manual Connection</label>
             <div className="flex gap-2">
               <input 
                 type="text"
                 value={targetId}
                 onChange={(e) => setTargetId(e.target.value)}
                 placeholder="Enter ID (e.g. 7f3a9...)"
                 className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
               />
               <button 
                 onClick={handleConnect}
                 disabled={!targetId.trim()}
                 className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
               >
                 Link
               </button>
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Your Device ID</label>
                {myPeerId && (
                    <button onClick={handleCopyLink} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        {copied ? <Check className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                )}
            </div>
            <div className="flex gap-2">
              <code className="flex-1 bg-black/30 p-2 rounded border border-slate-700 text-indigo-300 font-mono text-xs break-all">
                {myPeerId || 'Initializing...'}
              </code>
            </div>
          </div>

          {/* Connected Peers List */}
          {connectedPeers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Connections</label>
              <ul className="space-y-2">
                {connectedPeers.map((peer, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-green-400 bg-green-900/10 px-3 py-2 rounded border border-green-900/30">
                    <Wifi className="w-4 h-4" />
                    <span className="truncate">{peer}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionModal;