import type {
  ViewerStats,
  ClosedWeekRecord,
  ReciprocitySettings,
  RankingResult,
  Platform,
} from "../types/reciprocity";

const BLOCKED_KEY = "kickerino.reciprocity.blocked";
const CLOSED_WEEKS_KEY = "kickerino.reciprocity.closed_weeks";
const MONDAY_KEY = "kickerino.reciprocity.current_week_monday";
const CURRENT_DATA_KEY = "kickerino.reciprocity.current_week_data";
const SETTINGS_KEY = "kickerino.reciprocity.settings";
const PREV_RANKS_KEY = "kickerino.reciprocity.previous_ranks";

export const defaultReciprocitySettings: ReciprocitySettings = {
  pollingIntervalMinutes: 60,
  minutesPerPoint: 60, // 60 minutes = 1 point
};

// --- Storage Actions ---

export function loadBlockedUsers(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBlockedUsers(users: string[]): void {
  localStorage.setItem(BLOCKED_KEY, JSON.stringify(users));
}

export function loadClosedWeeks(): ClosedWeekRecord[] {
  try {
    const raw = localStorage.getItem(CLOSED_WEEKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveClosedWeeks(weeks: ClosedWeekRecord[]): void {
  localStorage.setItem(CLOSED_WEEKS_KEY, JSON.stringify(weeks));
}

export function loadCurrentWeekMonday(): string | null {
  return localStorage.getItem(MONDAY_KEY);
}

export function saveCurrentWeekMonday(mondayStr: string): void {
  localStorage.setItem(MONDAY_KEY, mondayStr);
}

export function loadCurrentWeekData(): ViewerStats[] {
  try {
    const raw = localStorage.getItem(CURRENT_DATA_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCurrentWeekData(data: ViewerStats[]): void {
  localStorage.setItem(CURRENT_DATA_KEY, JSON.stringify(data));
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

export function loadPreviousRanks(): { [key: string]: number } {
  try {
    const raw = localStorage.getItem(PREV_RANKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePreviousRanks(ranks: { [key: string]: number }): void {
  localStorage.setItem(PREV_RANKS_KEY, JSON.stringify(ranks));
}

// --- Date Helpers ---

export function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekMonday(now = new Date()): Date {
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getWeekDateRange(monday: Date) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: getLocalDateString(monday),
    end: getLocalDateString(sunday),
  };
}

export function getWeekRangeFromMondayStr(mondayStr: string) {
  const date = new Date(mondayStr + "T00:00:00");
  return getWeekDateRange(date);
}

// --- Ranking Calculations ---

export function calculateRankings(
  currentWeekData: ViewerStats[],
  closedWeeks: ClosedWeekRecord[],
  blockedUsers: string[],
  mode: "week" | "eternal" | string, // mode can be "week", "eternal", or a specific YYYY-MM-DD Monday string
  settings: ReciprocitySettings,
  previousRanks: { [key: string]: number } = {}
): RankingResult[] {
  const lowerBlocked = blockedUsers.map((u) => u.toLowerCase());

  const isBlocked = (platform: Platform, username: string) => {
    const key = `${platform.toLowerCase()}:${username.toLowerCase()}`;
    return lowerBlocked.includes(key);
  };

  if (mode === "week") {
    // 1. Weekly Ranking (Este Week)
    const filtered = currentWeekData.filter((v) => !isBlocked(v.platform, v.username));
    
    const results = filtered.map((v) => {
      const points = Math.floor(v.watchTimeMinutes / settings.minutesPerPoint);
      // Status rules: Active if points >= 7 (approx 1h per day), Dropping if 1-6 points, Inactive if 0.
      let status: "Active" | "Dropping" | "Inactive" | "New" = "Inactive";
      if (points >= 7) {
        status = "Active";
      } else if (points > 0) {
        status = "Dropping";
      }

      return {
        username: v.username,
        displayName: v.displayName,
        platform: v.platform,
        watchTimeMinutes: v.watchTimeMinutes,
        messageCount: v.messageCount,
        points,
        status,
      };
    });

    // Sort by watchTimeMinutes descending (and messages for tie break)
    const sorted = results.sort((a, b) => b.watchTimeMinutes - a.watchTimeMinutes || b.messageCount - a.messageCount);

    return sorted.map((item, idx) => {
      const rank = idx + 1;
      const key = `${item.platform.toLowerCase()}:${item.username.toLowerCase()}`;
      const prevRank = previousRanks[key];

      let trendDirection: "up" | "down" | "stable" = "stable";
      if (prevRank !== undefined) {
        if (rank < prevRank) trendDirection = "up";
        else if (rank > prevRank) trendDirection = "down";
      }

      return {
        ...item,
        rank,
        trendDirection,
      };
    });

  } else if (mode === "eternal") {
    // 2. Eternal Ranking (Acumulado)
    // Sum points across all closed weeks + current week
    const eternalMap = new Map<
      string,
      {
        username: string;
        displayName: string;
        platform: Platform;
        points: number;
        watchTimeMinutes: number;
        messageCount: number;
        currentWeekPoints: number;
      }
    >();

    const getOrInit = (platform: Platform, username: string, displayName: string) => {
      const key = `${platform.toLowerCase()}:${username.toLowerCase()}`;
      let item = eternalMap.get(key);
      if (!item) {
        item = {
          username,
          displayName,
          platform,
          points: 0,
          watchTimeMinutes: 0,
          messageCount: 0,
          currentWeekPoints: 0,
        };
        eternalMap.set(key, item);
      }
      return item;
    };

    // Add closed weeks points
    for (const week of closedWeeks) {
      for (const key in week.viewerPoints) {
        const vp = week.viewerPoints[key];
        if (isBlocked(vp.platform, vp.username)) continue;

        const item = getOrInit(vp.platform, vp.username, vp.displayName);
        item.points += vp.points;
        item.watchTimeMinutes += vp.watchTimeMinutes;
        item.messageCount += vp.messageCount;
      }
    }

    // Add current week points
    for (const v of currentWeekData) {
      if (isBlocked(v.platform, v.username)) continue;

      const item = getOrInit(v.platform, v.username, v.displayName);
      const points = Math.floor(v.watchTimeMinutes / settings.minutesPerPoint);
      item.points += points;
      item.currentWeekPoints = points;
      item.watchTimeMinutes += v.watchTimeMinutes;
      item.messageCount += v.messageCount;
    }

    const results = Array.from(eternalMap.values()).map((item) => {
      // Current week status applies: Active if points earned this week >= 7
      let status: "Active" | "Dropping" | "Inactive" | "New" = "Inactive";
      if (item.currentWeekPoints >= 7) {
        status = "Active";
      } else if (item.currentWeekPoints > 0) {
        status = "Dropping";
      }

      return {
        username: item.username,
        displayName: item.displayName,
        platform: item.platform,
        watchTimeMinutes: item.watchTimeMinutes,
        messageCount: item.messageCount,
        points: item.points,
        status,
      };
    });

    // Sort by eternal points descending
    const sorted = results.sort((a, b) => b.points - a.points || b.watchTimeMinutes - a.watchTimeMinutes);

    return sorted.map((item, idx) => {
      const rank = idx + 1;
      const key = `${item.platform.toLowerCase()}:${item.username.toLowerCase()}`;
      const prevRank = previousRanks[key];

      let trendDirection: "up" | "down" | "stable" = "stable";
      if (prevRank !== undefined) {
        if (rank < prevRank) trendDirection = "up";
        else if (rank > prevRank) trendDirection = "down";
      }

      return {
        ...item,
        rank,
        trendDirection,
      };
    });

  } else {
    // 3. Historical Closed Week View
    const targetWeek = closedWeeks.find((w) => w.weekMonday === mode);
    if (!targetWeek) {
      return [];
    }

    const results = Object.values(targetWeek.viewerPoints)
      .filter((v) => !isBlocked(v.platform, v.username))
      .map((v) => {
        return {
          username: v.username,
          displayName: v.displayName,
          platform: v.platform,
          watchTimeMinutes: v.watchTimeMinutes,
          messageCount: v.messageCount,
          points: v.points,
          status: "Inactive" as const, // Past weeks are inactive by definition
          trendDirection: "stable" as const,
        };
      });

    // Sort by points descending
    const sorted = results.sort((a, b) => b.points - a.points || b.watchTimeMinutes - a.watchTimeMinutes);

    return sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }
}
