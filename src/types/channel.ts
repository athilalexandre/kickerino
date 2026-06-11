export type ChannelStatus = "live" | "offline" | "unknown" | "error";

export type KickChannel = {
  slug: string;
  username?: string;
  avatarUrl?: string;
  status: ChannelStatus;
  title?: string;
  category?: string;
  viewers?: number;
  chatroomId?: number;
  lastCheckedAt?: number;
  lastWentLiveAt?: number;
  errorMessage?: string;
  supportOffline?: boolean;
  supportEnabled?: boolean;
};
