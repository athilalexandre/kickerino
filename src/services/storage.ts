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
};


function getMessagesFromGlobalText(slug: string, text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const specific: string[] = [];
  const general: string[] = [];

  for (const line of lines) {
    const sep = line.indexOf("::");
    if (sep !== -1) {
      const lineSlug = line.slice(0, sep).trim().toLowerCase();
      const msg = line.slice(sep + 2).trim();
      if (lineSlug === slug.toLowerCase() && msg) {
        specific.push(msg);
      }
    } else {
      if (line) {
        general.push(line);
      }
    }
  }

  return specific.length > 0 ? specific : general;
}

function hasSpecificGlobalMessage(slug: string, text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const sep = line.indexOf("::");
    if (sep !== -1) {
      const lineSlug = line.slice(0, sep).trim().toLowerCase();
      if (lineSlug === slug.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
}

export function loadChannels(): KickChannel[] {
  try {
    const raw = localStorage.getItem(CHANNELS_KEY);
    if (!raw) {
      return [];
    }

    const settings = loadSettings();
    const channels = JSON.parse(raw) as KickChannel[];
    return channels.map((channel) => {
      const legacySupportOffline = (channel as any).supportOffline;
      const supportEnabled = channel.supportEnabled ?? (legacySupportOffline !== undefined ? legacySupportOffline : false);
      
      let supportConfig = channel.supportConfig;
      if (!supportConfig) {
        const hasSpecific = hasSpecificGlobalMessage(channel.slug, settings.supportMessagesText);
        const globalMsgs = getMessagesFromGlobalText(channel.slug, settings.supportMessagesText);
        
        supportConfig = {
          messages: hasSpecific && globalMsgs.length > 0 ? globalMsgs : ["No apoio"],
          nextMessageIndex: 0,
        };
      }

      return {
        ...channel,
        status: channel.status ?? "unknown",
        supportEnabled,
        supportConfig,
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
