import React from 'react';
import { 
  Clipboard, 
  Code, 
  Link, 
  Mail, 
  FileText, 
  Smartphone, 
  Laptop, 
  Monitor,
  Copy,
  Trash2,
  Star,
  Share2,
  Zap,
  ZapOff,
  Plus,
  RefreshCw,
  SmartphoneNfc,
  Cast,
  Wifi,
  X,
  QrCode,
  Check
} from 'lucide-react';
import { ClipType, DeviceType } from '../types';

export const ClipTypeIcon = ({ type, className }: { type: ClipType, className?: string }) => {
  switch (type) {
    case ClipType.CODE: return <Code className={className} />;
    case ClipType.URL: return <Link className={className} />;
    case ClipType.EMAIL: return <Mail className={className} />;
    default: return <FileText className={className} />;
  }
};

export const DeviceIcon = ({ name, className }: { name: string, className?: string }) => {
  if (name.includes('iPhone') || name.includes('Pixel') || name.includes('Mobile')) {
    return <Smartphone className={className} />;
  }
  if (name.includes('MacBook') || name.includes('Laptop')) {
    return <Laptop className={className} />;
  }
  return <Monitor className={className} />;
};

export { Copy, Trash2, Star, Clipboard, Share2, Zap, ZapOff, Plus, RefreshCw, SmartphoneNfc, Cast, Wifi, X, QrCode, Check, Link };