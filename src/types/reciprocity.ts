export type Platform = 'Kick' | 'Twitch' | 'YouTube' | 'TikTok';

export interface FriendChannel {
  id: string;
  displayName: string;
  platform: Platform;
  username: string;
  notes?: string;
  enabled: boolean;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface WatchTimeSnapshot {
  id: string;
  friendChannelId: string;
  platform: Platform;
  username: string;
  watchTimeMinutes: number;
  messageCount: number;
  capturedAt: string; // ISO timestamp
}

export type MessageDampingType = 'none' | 'sqrt' | 'capped';

export interface ReciprocitySettings {
  pollingIntervalMinutes: number;
  defaultWindow: '24h' | '7d' | '30d' | 'all';
  messageBonusWeight: number;
  messageDampingType: MessageDampingType;
  activeThresholdMinutes: number; // For the default 7d window, will be scaled for other windows
  droppingThresholdMinutes: number; // For the default 7d window, will be scaled for other windows
}

export interface RankingResult {
  friendChannelId: string;
  displayName: string;
  platform: Platform;
  username: string;
  watchTimeMinutes: number;
  messageCount: number;
  score: number;
  rank: number;
  status: 'Active' | 'Dropping' | 'Inactive' | 'New';
  trendDirection: 'up' | 'down' | 'stable';
  lastChecked: string;
}
