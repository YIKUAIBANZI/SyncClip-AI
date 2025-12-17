export enum ClipType {
  TEXT = 'TEXT',
  URL = 'URL',
  CODE = 'CODE',
  EMAIL = 'EMAIL',
  IMAGE = 'IMAGE' // Placeholder for future
}

export enum DeviceType {
  MAC = 'MacBook Pro',
  WINDOWS = 'Windows PC',
  IPHONE = 'iPhone',
  ANDROID = 'Pixel'
}

export interface ClipItem {
  id: string;
  content: string;
  type: ClipType;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  summary?: string; // AI Generated
  tags?: string[]; // AI Generated
  isFavorite: boolean;
}

export interface AiAnalysisResult {
  type: ClipType;
  summary: string;
  tags: string[];
}

export interface PeerMessage {
  type: 'NEW_CLIP' | 'DELETE_CLIP';
  payload: any;
}