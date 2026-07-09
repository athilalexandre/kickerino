import type {
  ChannelReciprocity,
  ReciprocitySettings,
} from "../types/reciprocity";

const SETTINGS_KEY = "kickerino.reciprocity.settings";
const RECIPROCITY_DATA_KEY = "kickerino.reciprocity.channels_data";

export const defaultReciprocitySettings: ReciprocitySettings = {
  pollingIntervalMinutes: 60,
};

export function loadReciprocitySettings(): ReciprocitySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultReciprocitySettings, ...JSON.parse(raw) } : defaultReciprocitySettings;
  } catch {
    return defaultReciprocitySettings;
  }
}

export function saveReciprocitySettings(settings: ReciprocitySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadReciprocityData(): ChannelReciprocity[] {
  try {
    const raw = localStorage.getItem(RECIPROCITY_DATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReciprocityData(data: ChannelReciprocity[]): void {
  localStorage.setItem(RECIPROCITY_DATA_KEY, JSON.stringify(data));
}
