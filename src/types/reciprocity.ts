export type Platform = "Kick" | "Twitch" | "YouTube" | "TikTok";

export interface ViewerStats {
  userId?: string;
  username: string;
  displayName: string;
  platform: Platform;
  watchTimeMinutes: number;
  messageCount: number;
}

export interface WeekViewerPoints {
  username: string;
  displayName: string;
  platform: Platform;
  points: number;
  watchTimeMinutes: number;
  messageCount: number;
}

export interface ClosedWeekRecord {
  weekMonday: string; // YYYY-MM-DD
  viewerPoints: {
    [userKey: string]: WeekViewerPoints; // userKey is "platform:username"
  };
}

export interface ReciprocitySettings {
  pollingIntervalMinutes: number;
  minutesPerPoint: number; // e.g. 60 (1 hour = 1 point)
}

export interface RankingResult {
  username: string;
  displayName: string;
  platform: Platform;
  watchTimeMinutes: number;
  messageCount: number;
  points: number;
  rank: number;
  status: "Active" | "Dropping" | "Inactive" | "New";
  trendDirection: "up" | "down" | "stable";
}
