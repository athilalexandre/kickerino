export type Platform = "Kick" | "Twitch" | "YouTube" | "TikTok";

export interface ChannelReciprocity {
  username: string;
  displayName: string;
  avatarUrl?: string;
  chatted: boolean;      // has sent at least one message in chat (message_count > 0)
  following: boolean;    // follows the streamer
  subscriber: boolean;   // subbed to the streamer
  lastChecked?: number;
}

export interface ReciprocitySettings {
  pollingIntervalMinutes: number;
}
