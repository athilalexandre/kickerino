import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { FriendChannel, WatchTimeSnapshot, ReciprocitySettings } from "../types/reciprocity";
import {
  loadFriendChannels,
  saveFriendChannels,
  loadSnapshots,
  saveSnapshots,
  loadReciprocitySettings,
  saveReciprocitySettings,
  pruneSnapshots,
  calculateRankings,
} from "../services/reciprocityStorage";

export function useReciprocity() {
  const [friends, setFriends] = useState<FriendChannel[]>([]);
  const [snapshots, setSnapshots] = useState<WatchTimeSnapshot[]>([]);
  const [settings, setSettings] = useState<ReciprocitySettings>(loadReciprocitySettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<"24h" | "7d" | "30d" | "all">("7d");
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
    setFriends(loadFriendChannels());
    setSnapshots(loadSnapshots());
    
    const storedSettings = loadReciprocitySettings();
    setSettings(storedSettings);
    setSelectedWindow(storedSettings.defaultWindow);
    
    void checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  // Update rankings calculated from state
  const rankings = calculateRankings(friends, snapshots, selectedWindow, settings);

  const addFriend = (
    displayName: string,
    platform: "Kick" | "Twitch" | "YouTube" | "TikTok",
    username: string,
    notes?: string
  ) => {
    const newFriend: FriendChannel = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      displayName: displayName.trim(),
      platform,
      username: username.trim(),
      notes: notes?.trim(),
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...friends, newFriend];
    setFriends(updated);
    saveFriendChannels(updated);
    return newFriend;
  };

  const updateFriend = (
    id: string,
    updates: Partial<Omit<FriendChannel, "id" | "createdAt" | "updatedAt">>
  ) => {
    const updated = friends.map((f) => {
      if (f.id === id) {
        return {
          ...f,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return f;
    });
    setFriends(updated);
    saveFriendChannels(updated);
  };

  const removeFriend = (id: string) => {
    const updated = friends.filter((f) => f.id !== id);
    setFriends(updated);
    saveFriendChannels(updated);

    // Also clean up snapshots for this friend
    const remainingSnaps = snapshots.filter((s) => s.friendChannelId !== id);
    setSnapshots(remainingSnaps);
    saveSnapshots(remainingSnaps);
  };

  const toggleFriendEnabled = (id: string) => {
    const updated = friends.map((f) => {
      if (f.id === id) {
        return { ...f, enabled: !f.enabled, updatedAt: new Date().toISOString() };
      }
      return f;
    });
    setFriends(updated);
    saveFriendChannels(updated);
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
    // Rely on fresh state values
    const currentFriends = loadFriendChannels();
    const enabledFriends = currentFriends.filter((f) => f.enabled);
    if (enabledFriends.length === 0) {
      setSyncError("Nenhum canal amigo ativo cadastrado. Adicione canais ativados para sincronizar.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    const newSnapshots: WatchTimeSnapshot[] = [];
    const timestamp = new Date().toISOString();
    let hasApiKeyError = false;
    let errorMessage = "";

    // Sync each friend channel sequentially to respect rate limits safely
    for (const friend of enabledFriends) {
      try {
        const response: any = await invoke("fetch_missxss_watch_time", {
          platform: friend.platform,
          username: friend.username,
        });

        // Map responses (case insensitive support for api keys)
        const watchTime = response.watch_time ?? response.watchTime ?? 0;
        const messageCount = response.message_count ?? response.messageCount ?? 0;

        newSnapshots.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          friendChannelId: friend.id,
          platform: friend.platform,
          username: friend.username,
          watchTimeMinutes: Number(watchTime) || 0,
          messageCount: Number(messageCount) || 0,
          capturedAt: timestamp,
        });
      } catch (err: any) {
        const errStr = String(err);
        console.error(`[Reciprocity] Error syncing watch time for ${friend.displayName}:`, errStr);

        // Check for specific API Key or authorization error
        if (
          errStr.includes("Key") ||
          errStr.includes("MISSXSS_API_KEY") ||
          errStr.includes("autorizada") ||
          errStr.includes("Unauthorized") ||
          errStr.includes("inválida")
        ) {
          hasApiKeyError = true;
          errorMessage = errStr;
          break;
        }

        // If it's another error (e.g. user not found), write 0 watch time to keep delta-intervals moving
        newSnapshots.push({
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          friendChannelId: friend.id,
          platform: friend.platform,
          username: friend.username,
          watchTimeMinutes: 0,
          messageCount: 0,
          capturedAt: timestamp,
        });
      }
    }

    if (hasApiKeyError) {
      setSyncError(errorMessage || "A chave MISSXSS_API_KEY não foi encontrada ou é inválida no ambiente Rust.");
      setIsSyncing(false);
      return;
    }

    // Append, prune, and save
    const currentSnapshots = loadSnapshots();
    const allSnapshots = [...currentSnapshots, ...newSnapshots];
    const pruned = pruneSnapshots(allSnapshots);
    setSnapshots(pruned);
    saveSnapshots(pruned);
    setIsSyncing(false);
    void checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  // Setup auto polling interval
  useEffect(() => {
    const storedFriends = loadFriendChannels();
    if (storedFriends.length === 0) return;

    const intervalMs = settings.pollingIntervalMinutes * 60 * 1000;
    const timer = setInterval(() => {
      void syncWatchTime();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [friends.length, settings.pollingIntervalMinutes, syncWatchTime]);

  return {
    friends,
    snapshots,
    settings,
    rankings,
    isSyncing,
    syncError,
    selectedWindow,
    setSelectedWindow,
    addFriend,
    updateFriend,
    removeFriend,
    toggleFriendEnabled,
    updateSettings,
    syncWatchTime,
    hasApiKey,
    saveApiKey,
    deleteApiKey,
    checkApiKeyStatus,
  };
}
