import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

const CHANNELS_KEY = "kickerino.channels";
const SETTINGS_KEY = "kickerino.settings";

export const defaultSettings: AppSettings = {
  soundEnabled: true,
  notificationsEnabled: true,
  checkIntervalSeconds: 60,
  openLiveOnDoubleClick: true,
  supportBotEnabled: false,
  supportIntervalMinutes: 10,
  supportMessagesText: "crisjuliano:: No apoio\nsche:: much fish, takes love!",
  supportPreferredQuality: "160p",
  supportQualityCheckSeconds: 60,
  supportOfflineChannels: false,
};


export function loadChannels(): KickChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (!raw) {
      return [];
    }

    const channels = JSON.parse(raw) as KickChannel[];
    return channels.map((channel) => {
      const supportEnabled = channel.supportEnabled ?? (channel.supportOffline !== undefined ? channel.supportOffline : false);
      return {
        ...channel,
        status: channel.status ?? "unknown",
        supportEnabled,
      };
    });
  } catch {
    return [];
  }
}

export function saveChannels(channels: KickChannel[]) {
  localStorage.setItem(CHANNELS_KEY, JSON.stringify(channels));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
