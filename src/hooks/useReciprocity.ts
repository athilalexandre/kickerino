import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ChannelReciprocity, ReciprocitySettings } from "../types/reciprocity";
import type { KickChannel } from "../types/channel";
import {
  loadReciprocitySettings,
  saveReciprocitySettings,
  loadReciprocityData,
  saveReciprocityData,
} from "../services/reciprocityStorage";

interface UseReciprocityParams {
  channels: KickChannel[];
  kickUsername: string | null;
  kickLoginStatus: string;
}

export function useReciprocity({ channels, kickUsername, kickLoginStatus }: UseReciprocityParams) {
  const [reciprocityData, setReciprocityData] = useState<ChannelReciprocity[]>([]);
  const [settings, setSettings] = useState<ReciprocitySettings>(loadReciprocitySettings());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
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

  // Load and align with channels list on mount & when channels changes
  useEffect(() => {
    const stored = loadReciprocityData();
    const aligned = channels.map((c) => {
      const existing = stored.find((s) => s.username.toLowerCase() === c.slug.toLowerCase());
      if (existing) {
        return {
          ...existing,
          displayName: c.username || c.slug,
          avatarUrl: c.avatarUrl,
        };
      }
      return {
        username: c.slug,
        displayName: c.username || c.slug,
        avatarUrl: c.avatarUrl,
        chatted: false,
        following: false,
        subscriber: false,
      };
    });
    setReciprocityData(aligned);
    saveReciprocityData(aligned);
    void checkApiKeyStatus();
  }, [channels, checkApiKeyStatus]);

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

  const syncOne = useCallback(async (slug: string) => {
    if (!kickUsername || kickLoginStatus !== "connected") {
      setSyncError("É necessário estar conectado à sua conta da Kick para verificar.");
      return;
    }
    setSyncError(null);

    const target = channels.find((c) => c.slug.toLowerCase() === slug.toLowerCase());
    if (!target) return;

    // 1. Fetch chatted (messageCount) from MissXss
    let chatted = false;
    try {
      const missxssRes = await invoke<any>("fetch_missxss_watch_time", {
        platform: "Kick",
        username: target.slug,
      });
      if (missxssRes) {
        const msgCount = Number(missxssRes.message_count ?? missxssRes.messageCount ?? missxssRes.messages ?? 0);
        chatted = msgCount > 0;
      }
    } catch (e) {
      console.warn(`[Reciprocity] Erro ao buscar dados na MissXss para ${slug}:`, e);
    }

    // 2. Fetch following/subscriber from Kick internal API
    let following = false;
    let subscriber = false;
    try {
      const kickRelations = await invoke<any[]>("check_kick_relationships", {
        ourChannel: kickUsername,
        theirChannels: [target.slug],
      });
      if (kickRelations && kickRelations.length > 0) {
        following = kickRelations[0].following;
        subscriber = kickRelations[0].subscriber;
      }
    } catch (e) {
      console.warn(`[Reciprocity] Erro ao buscar relacionamentos na Kick para ${slug}:`, e);
    }

    setReciprocityData((prev) => {
      const updated = prev.map((item) => {
        if (item.username.toLowerCase() === slug.toLowerCase()) {
          return {
            ...item,
            chatted,
            following,
            subscriber,
            lastChecked: Date.now(),
          };
        }
        return item;
      });
      saveReciprocityData(updated);
      return updated;
    });
  }, [channels, kickUsername, kickLoginStatus]);

  const syncAll = useCallback(async () => {
    if (!kickUsername || kickLoginStatus !== "connected") {
      setSyncError("É necessário estar conectado à sua conta da Kick para verificar.");
      return;
    }
    setIsSyncing(true);
    setSyncError(null);

    try {
      const slugs = channels.map((c) => c.slug);
      if (slugs.length === 0) {
        setIsSyncing(false);
        return;
      }

      // 1. Fetch chat statuses from MissXss (parallel, each is a fast individual call)
      const chattedMap: Record<string, boolean> = {};
      await Promise.all(
        channels.map(async (c) => {
          try {
            const missxssRes = await invoke<any>("fetch_missxss_watch_time", {
              platform: "Kick",
              username: c.slug,
            });
            if (missxssRes) {
              const msgCount = Number(missxssRes.message_count ?? missxssRes.messageCount ?? missxssRes.messages ?? 0);
              chattedMap[c.slug.toLowerCase()] = msgCount > 0;
            }
          } catch (e) {
            console.warn(`[Reciprocity] Erro MissXss para ${c.slug}:`, e);
          }
        })
      );

      // 2. Fetch relationship statuses from Kick in batches of 10
      const BATCH_SIZE = 10;
      const relationMap: Record<string, { following: boolean; subscriber: boolean }> = {};

      for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
        const batch = slugs.slice(i, i + BATCH_SIZE);
        try {
          const kickRelations = await invoke<any[]>("check_kick_relationships", {
            ourChannel: kickUsername,
            theirChannels: batch,
          });
          if (kickRelations) {
            for (const rel of kickRelations) {
              relationMap[rel.username.toLowerCase()] = {
                following: rel.following,
                subscriber: rel.subscriber,
              };
            }
          }
        } catch (e) {
          console.error(`[Reciprocity] Erro ao buscar relacionamentos (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, e);
          // Continue with next batch instead of failing entirely
        }
      }

      // 3. Merge and update
      setReciprocityData((prev) => {
        const updated = prev.map((item) => {
          const lowerUser = item.username.toLowerCase();
          const chatted = chattedMap[lowerUser] ?? item.chatted;
          const rel = relationMap[lowerUser];
          return {
            ...item,
            chatted,
            following: rel ? rel.following : item.following,
            subscriber: rel ? rel.subscriber : item.subscriber,
            lastChecked: Date.now(),
          };
        });
        saveReciprocityData(updated);
        return updated;
      });
    } catch (err: any) {
      console.error("[Reciprocity] Erro durante o sincronismo:", err);
      setSyncError(String(err) || "Falha na sincronização.");
    } finally {
      setIsSyncing(false);
    }
  }, [channels, kickUsername, kickLoginStatus]);

  return {
    reciprocityData,
    settings,
    isSyncing,
    syncError,
    syncOne,
    syncAll,
    hasApiKey,
    saveApiKey,
    deleteApiKey,
    checkApiKeyStatus,
    updateSettings,
  };
}
