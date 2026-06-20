import type {
  FriendChannel,
  WatchTimeSnapshot,
  ReciprocitySettings,
  RankingResult,
  Platform,
} from "../types/reciprocity";

const FRIENDS_KEY = "kickerino.reciprocity.friends";
const SNAPSHOTS_KEY = "kickerino.reciprocity.snapshots";
const SETTINGS_KEY = "kickerino.reciprocity.settings";

export const defaultReciprocitySettings: ReciprocitySettings = {
  pollingIntervalMinutes: 60,
  defaultWindow: "7d",
  messageBonusWeight: 2,
  messageDampingType: "sqrt",
  activeThresholdMinutes: 60, // Active threshold for 7 days
  droppingThresholdMinutes: 15, // Dropping threshold for 7 days
};

// --- Storage Actions ---

export function loadFriendChannels(): FriendChannel[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFriendChannels(channels: FriendChannel[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(channels));
}

export function loadSnapshots(): WatchTimeSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: WatchTimeSnapshot[]): void {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

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

// --- Snapshot Pruning ---

export function pruneSnapshots(snapshots: WatchTimeSnapshot[]): WatchTimeSnapshot[] {
  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
  const cutoffTime = thirtyOneDaysAgo.getTime();

  // We want to keep:
  // 1. The very first snapshot for each friend (baseline for all-time)
  // 2. All snapshots newer than 31 days
  const earliestMap = new Map<string, WatchTimeSnapshot>();
  for (const snap of snapshots) {
    const existing = earliestMap.get(snap.friendChannelId);
    if (!existing || new Date(snap.capturedAt).getTime() < new Date(existing.capturedAt).getTime()) {
      earliestMap.set(snap.friendChannelId, snap);
    }
  }

  return snapshots.filter((snap) => {
    const isEarliest = earliestMap.get(snap.friendChannelId)?.id === snap.id;
    const isRecent = new Date(snap.capturedAt).getTime() >= cutoffTime;
    return isEarliest || isRecent;
  });
}

// --- Ranking Calculations ---

export function calculateScore(
  watchTime: number,
  messages: number,
  settings: ReciprocitySettings
): number {
  let dampedMessages = messages;
  if (settings.messageDampingType === "sqrt") {
    dampedMessages = Math.sqrt(messages);
  } else if (settings.messageDampingType === "capped") {
    dampedMessages = Math.min(messages, 100);
  }
  return watchTime + dampedMessages * settings.messageBonusWeight;
}

export function getWindowDurationMs(window: "24h" | "7d" | "30d" | "all"): number {
  switch (window) {
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "all":
      return Infinity;
  }
}

export function getWindowScale(window: "24h" | "7d" | "30d" | "all"): number {
  switch (window) {
    case "24h":
      return 1 / 7;
    case "7d":
      return 1;
    case "30d":
      return 30 / 7;
    case "all":
      return 10; // baseline scale for all-time threshold
  }
}

/**
 * Helper to calculate stats (watchTime, messageCount, score) for a friend channel at a specific reference time.
 */
function getStatsAtTime(
  friendId: string,
  friendSnapshots: WatchTimeSnapshot[],
  referenceTimeMs: number,
  window: "24h" | "7d" | "30d" | "all",
  settings: ReciprocitySettings
) {
  // Filter snapshots up to the reference time
  const snapsBeforeRef = friendSnapshots
    .filter((s) => new Date(s.capturedAt).getTime() <= referenceTimeMs)
    .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());

  if (snapsBeforeRef.length === 0) {
    return null;
  }

  const latestSnap = snapsBeforeRef[snapsBeforeRef.length - 1];
  const windowDurationMs = getWindowDurationMs(window);

  // Find start snapshot (closest to cutoff)
  let startSnap = snapsBeforeRef[0];
  if (windowDurationMs !== Infinity) {
    const cutoffTimeMs = referenceTimeMs - windowDurationMs;
    // Find the snapshot closest to cutoffTimeMs
    let bestDiff = Infinity;
    for (const snap of snapsBeforeRef) {
      const diff = Math.abs(new Date(snap.capturedAt).getTime() - cutoffTimeMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        startSnap = snap;
      }
    }
  }

  const watchTimeMinutes = Math.max(0, latestSnap.watchTimeMinutes - startSnap.watchTimeMinutes);
  const messageCount = Math.max(0, latestSnap.messageCount - startSnap.messageCount);
  const score = calculateScore(watchTimeMinutes, messageCount, settings);

  const durationTrackedMs = new Date(latestSnap.capturedAt).getTime() - new Date(snapsBeforeRef[0].capturedAt).getTime();
  const isNew = snapsBeforeRef.length < 2 || durationTrackedMs < 20 * 60 * 60 * 1000; // less than 20 hours of data

  return {
    watchTimeMinutes,
    messageCount,
    score,
    isNew,
    lastChecked: latestSnap.capturedAt,
  };
}

export function calculateRankings(
  channels: FriendChannel[],
  snapshots: WatchTimeSnapshot[],
  window: "24h" | "7d" | "30d" | "all",
  settings: ReciprocitySettings,
  now = new Date()
): RankingResult[] {
  const enabledChannels = channels.filter((c) => c.enabled);
  const nowMs = now.getTime();

  // 1. Calculate current stats and scores
  const currentResults = enabledChannels.map((channel) => {
    const friendSnaps = snapshots.filter((s) => s.friendChannelId === channel.id);
    const stats = getStatsAtTime(channel.id, friendSnaps, nowMs, window, settings);

    return {
      channel,
      stats,
    };
  });

  // 2. Rank channels by score (descending)
  // Channels without stats go to the bottom
  const rankedCurrent = [...currentResults]
    .filter((r) => r.stats !== null)
    .sort((a, b) => (b.stats?.score ?? 0) - (a.stats?.score ?? 0));

  // 3. Calculate previous stats to determine previous ranking (for trend calculation)
  // We look at the state 1 sync interval ago (default 1 hour, or pollingIntervalMinutes)
  const prevTimeMs = nowMs - settings.pollingIntervalMinutes * 60 * 1000;
  const prevResults = enabledChannels.map((channel) => {
    const friendSnaps = snapshots.filter((s) => s.friendChannelId === channel.id);
    const stats = getStatsAtTime(channel.id, friendSnaps, prevTimeMs, window, settings);
    return {
      channelId: channel.id,
      stats,
    };
  });

  const rankedPrev = prevResults
    .filter((r) => r.stats !== null)
    .sort((a, b) => (b.stats?.score ?? 0) - (a.stats?.score ?? 0));

  const prevRankMap = new Map<string, number>();
  rankedPrev.forEach((item, index) => {
    prevRankMap.set(item.channelId, index + 1);
  });

  // 4. Build final results
  const scale = getWindowScale(window);
  const windowActiveThreshold = settings.activeThresholdMinutes * scale;
  const windowDroppingThreshold = settings.droppingThresholdMinutes * scale;

  return currentResults.map((item) => {
    const channel = item.channel;
    const stats = item.stats;

    if (!stats) {
      return {
        friendChannelId: channel.id,
        displayName: channel.displayName,
        platform: channel.platform,
        username: channel.username,
        watchTimeMinutes: 0,
        messageCount: 0,
        score: 0,
        rank: 999,
        status: "New" as const,
        trendDirection: "stable" as const,
        lastChecked: channel.createdAt,
      };
    }

    // Determine current rank
    const currentRank = rankedCurrent.findIndex((r) => r.channel.id === channel.id) + 1;

    // Determine trend direction
    const prevRank = prevRankMap.get(channel.id);
    let trendDirection: "up" | "down" | "stable" = "stable";
    if (prevRank !== undefined && currentRank > 0) {
      if (currentRank < prevRank) {
        trendDirection = "up";
      } else if (currentRank > prevRank) {
        trendDirection = "down";
      }
    }

    // Determine status label
    let status: "Active" | "Dropping" | "Inactive" | "New" = "Inactive";
    if (stats.isNew) {
      status = "New";
    } else if (stats.watchTimeMinutes >= windowActiveThreshold) {
      status = "Active";
    } else if (stats.watchTimeMinutes > windowDroppingThreshold) {
      status = "Dropping";
    } else if (stats.watchTimeMinutes === 0) {
      status = "Inactive";
    } else {
      status = "Dropping";
    }

    return {
      friendChannelId: channel.id,
      displayName: channel.displayName,
      platform: channel.platform,
      username: channel.username,
      watchTimeMinutes: stats.watchTimeMinutes,
      messageCount: stats.messageCount,
      score: Math.round(stats.score * 10) / 10, // round to 1 decimal
      rank: currentRank,
      status,
      trendDirection,
      lastChecked: stats.lastChecked,
    };
  });
}
