import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

const CHANNELS_KEY = "kickerino.channels";
const SETTINGS_KEY = "kickerino.settings";

export const defaultSettings: AppSettings = {
  soundEnabled: true,
  notificationsEnabled: true,
  checkIntervalSeconds: 60,
  openLiveOnDoubleClick: true,
};

export function loadChannels(): KickChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (!raw) {
      return [];
    }

    const channels = JSON.parse(raw) as KickChannel[];
    return channels.map((channel) => ({
      ...channel,
      status: channel.status ?? "unknown",
    }));
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
