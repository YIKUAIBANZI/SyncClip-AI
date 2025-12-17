export enum ClipType {
  TEXT = 'TEXT',
  URL = 'URL',
  CODE = 'CODE',
  EMAIL = 'EMAIL',
  IMAGE = 'IMAGE'
}

export enum DeviceType {
  MAC = 'MacBook Pro',
  WINDOWS = 'Windows PC',
  IPHONE = 'iPhone',
  ANDROID = 'Pixel'
}

export interface ClipItem {
  id: string;
  content: string; // Text content or Base64 Data URL for images
  type: ClipType;
  timestamp: number;
  deviceId: string;
  deviceName: string;
  summary?: string; // AI Generated
  tags?: string[]; // AI Generated
  isFavorite: boolean;
  expiresAt?: number; // For ephemeral messages (timestamp)
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