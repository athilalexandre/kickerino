import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ViewerStats, ClosedWeekRecord, ReciprocitySettings } from "../types/reciprocity";
import {
  loadBlockedUsers,
  saveBlockedUsers,
  loadClosedWeeks,
  saveClosedWeeks,
  loadCurrentWeekMonday,
  saveCurrentWeekMonday,
  loadCurrentWeekData,
  saveCurrentWeekData,
  loadReciprocitySettings,
  saveReciprocitySettings,
  loadPreviousRanks,
  savePreviousRanks,
  getCurrentWeekMonday,
  getLocalDateString,
  getWeekDateRange,
  calculateRankings,
} from "../services/reciprocityStorage";

function extractArray(response: any): any[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object") {
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (Array.isArray(response.list)) {
      return response.list;
    }
    if (Array.isArray(response.users)) {
      return response.users;
    }
    if (Array.isArray(response.results)) {
      return response.results;
    }
  }
  return [];
}

export function useReciprocity() {
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [closedWeeks, setClosedWeeks] = useState<ClosedWeekRecord[]>([]);
  const [currentWeekMondayStr, setCurrentWeekMondayStr] = useState<string>("");
  const [currentWeekData, setCurrentWeekData] = useState<ViewerStats[]>([]);
  const [settings, setSettings] = useState<ReciprocitySettings>(loadReciprocitySettings());
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"week" | "eternal" | string>("week"); // "week", "eternal", or YYYY-MM-DD
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check if API key is configured
  const checkApiKeyStatus = useCallback(async () => {
    try {
      const status = await invoke<boolean>("has_missxss_api_key");
      setHasApiKey(status);
    } catch (e) {
      console.error("[Reciprocity] Falha ao checar status da chave API:", e);
      setHasApiKey(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    setBlockedUsers(loadBlockedUsers());
    setClosedWeeks(loadClosedWeeks());
    setCurrentWeekData(loadCurrentWeekData());
    
    const storedSettings = loadReciprocitySettings();
    setSettings(storedSettings);

    const realMonday = getCurrentWeekMonday();
    const realMondayStr = getLocalDateString(realMonday);
    
    const storedMonday = loadCurrentWeekMonday();
    if (storedMonday) {
      setCurrentWeekMondayStr(storedMonday);
    } else {
      setCurrentWeekMondayStr(realMondayStr);
      saveCurrentWeekMonday(realMondayStr);
    }

    void checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  // Compute rankings
  const previousRanks = loadPreviousRanks();
  const rankings = calculateRankings(
    currentWeekData,
    closedWeeks,
    blockedUsers,
    selectedMode,
    settings,
    previousRanks
  );

  const blockUser = (platform: string, username: string) => {
    const key = `${platform.toLowerCase()}:${username.toLowerCase()}`;
    if (!blockedUsers.includes(key)) {
      const updated = [...blockedUsers, key];
      setBlockedUsers(updated);
      saveBlockedUsers(updated);
    }
  };

  const unblockUser = (key: string) => {
    const updated = blockedUsers.filter((u) => u.toLowerCase() !== key.toLowerCase());
    setBlockedUsers(updated);
    saveBlockedUsers(updated);
  };

  const updateSettings = (newSettings: ReciprocitySettings) => {
    setSettings(newSettings);
    saveReciprocitySettings(newSettings);
  };

  const saveApiKey = async (apiKey: string) => {
    try {
      await invoke("save_missxss_api_key", { apiKey });
      setHasApiKey(true);
      setSyncError(null);
    } catch (e: any) {
      throw new Error(String(e) || "Erro ao salvar a chave API no disco.");
    }
  };

  const deleteApiKey = async () => {
    try {
      await invoke("delete_missxss_api_key");
      setHasApiKey(false);
    } catch (e: any) {
      throw new Error(String(e) || "Erro ao deletar a chave API do disco.");
    }
  };

  const syncWatchTime = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const isKeySet = await invoke<boolean>("has_missxss_api_key");
      if (!isKeySet) {
        setSyncError("Chave API MissXss não configurada. Defina nas Configurações.");
        setIsSyncing(false);
        return;
      }

      const realMonday = getCurrentWeekMonday();
      const realMondayStr = getLocalDateString(realMonday);
      
      let storedMondayStr = loadCurrentWeekMonday();
      if (!storedMondayStr) {
        storedMondayStr = realMondayStr;
        saveCurrentWeekMonday(realMondayStr);
        setCurrentWeekMondayStr(realMondayStr);
      }

      // --- 1. Catchup Closed Weeks if Monday shifted ---
      if (storedMondayStr !== realMondayStr) {
        console.log(`[Reciprocity] Nova semana detectada. Fechando semana anterior: ${storedMondayStr}`);
        
        let loopMonday = new Date(storedMondayStr + "T00:00:00");
        const closedWeeksList = loadClosedWeeks();

        // Process all weeks that have passed since the app last ran
        while (getLocalDateString(loopMonday) !== realMondayStr) {
          const weekMondayStr = getLocalDateString(loopMonday);
          const range = getWeekDateRange(loopMonday);
          
          console.log(`[Reciprocity] Fechando dados para a semana: ${weekMondayStr} (${range.start} a ${range.end})`);
          
          try {
            // Fetch final top list for that specific historical week
            const response: any = await invoke("fetch_missxss_top_watch_time", {
              limit: 100,
              platform: "Kick",
              dateFrom: range.start,
              dateTo: range.end,
            });

            const rawList = extractArray(response);
            const viewerPoints: { [key: string]: any } = {};

            for (const v of rawList) {
              const watchTime = Number(v.watch_time ?? v.watchTime ?? 0);
              const messageCount = Number(v.message_count ?? v.messageCount ?? 0);
              const points = Math.floor(watchTime / settings.minutesPerPoint);
              
              if (points > 0) {
                const username = v.username || "";
                const platform = v.platform || "Kick";
                const userKey = `${platform.toLowerCase()}:${username.toLowerCase()}`;
                
                viewerPoints[userKey] = {
                  username,
                  displayName: v.displayname || v.displayName || username,
                  platform,
                  points,
                  watchTimeMinutes: watchTime,
                  messageCount,
                };
              }
            }

            // Save closed week
            if (Object.keys(viewerPoints).length > 0) {
              closedWeeksList.push({
                weekMonday: weekMondayStr,
                viewerPoints,
              });
            }
          } catch (err) {
            console.error(`[Reciprocity] Falha ao fechar histórico para a semana ${weekMondayStr}:`, err);
          }

          // Advance loopMonday by 7 days
          loopMonday.setDate(loopMonday.getDate() + 7);
        }

        saveClosedWeeks(closedWeeksList);
        setClosedWeeks(closedWeeksList);

        // Update Monday baseline
        saveCurrentWeekMonday(realMondayStr);
        setCurrentWeekMondayStr(realMondayStr);
      }

      // --- 2. Fetch Current Week Leaderboard ---
      const todayStr = getLocalDateString(new Date());
      const range = getWeekDateRange(realMonday);

      console.log(`[Reciprocity] Sincronizando semana atual: ${realMondayStr} (${range.start} a ${todayStr})`);

      const response: any = await invoke("fetch_missxss_top_watch_time", {
        limit: 100,
        platform: "Kick",
        dateFrom: range.start,
        dateTo: todayStr, // Fetch up to today
      });

      const rawList = extractArray(response);
      const currentData: ViewerStats[] = rawList.map((v: any) => ({
        username: v.username || "",
        displayName: v.displayname || v.displayName || v.username || "",
        platform: v.platform || "Kick",
        watchTimeMinutes: Number(v.watch_time ?? v.watchTime ?? 0),
        messageCount: Number(v.message_count ?? v.messageCount ?? 0),
      }));

      // Cache ranks before saving new stats to determine trends on the next tick
      const currentRanks: { [key: string]: number } = {};
      rankings.forEach((r) => {
        const key = `${r.platform.toLowerCase()}:${r.username.toLowerCase()}`;
        currentRanks[key] = r.rank;
      });
      savePreviousRanks(currentRanks);

      setCurrentWeekData(currentData);
      saveCurrentWeekData(currentData);
      setSyncError(null);
    } catch (err: any) {
      console.error("[Reciprocity] Erro durante o sincronismo:", err);
      setSyncError(String(err) || "Falha na sincronização com MissXss API.");
    } finally {
      setIsSyncing(false);
      void checkApiKeyStatus();
    }
  }, [rankings, settings.minutesPerPoint, checkApiKeyStatus]);

  // Setup auto polling interval
  useEffect(() => {
    const intervalMs = settings.pollingIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      void syncWatchTime();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.pollingIntervalMinutes, syncWatchTime]);

  return {
    blockedUsers,
    closedWeeks,
    currentWeekMondayStr,
    currentWeekData,
    settings,
    rankings,
    isSyncing,
    syncError,
    selectedMode,
    setSelectedMode,
    blockUser,
    unblockUser,
    updateSettings,
    syncWatchTime,
    hasApiKey,
    saveApiKey,
    deleteApiKey,
    checkApiKeyStatus,
  };
}
