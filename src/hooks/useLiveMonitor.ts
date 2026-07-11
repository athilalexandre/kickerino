import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { checkManyLiveStatuses } from "../services/kickApi";
import { notifyLive } from "../services/notifications";
import { playLiveAlert } from "../services/sound";
import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

export type AppToast = {
  id: string;
  message: string;
};

type LiveMonitorParams = {
  channels: KickChannel[];
  setChannels: Dispatch<SetStateAction<KickChannel[]>>;
  settings: AppSettings;
};

export function useLiveMonitor({
  channels,
  setChannels,
  settings,
}: LiveMonitorParams) {
  const [isChecking, setIsChecking] = useState(false);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const channelsRef = useRef(channels);
  const checkingRef = useRef(false);
  const settingsRef = useRef(settings);
  const notifiedLiveSlugsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const liveCount = useMemo(
    () => channels.filter((channel) => channel.status === "live").length,
    [channels],
  );

  const pushToast = useCallback((message: string) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const refreshAll = useCallback(async () => {
    if (checkingRef.current) {
      return;
    }
    const currentChannels = channelsRef.current;
    if (currentChannels.length === 0) {
      return;
    }

    checkingRef.current = true;
    setIsChecking(true);
    try {
      const results = await checkManyLiveStatuses(
        currentChannels.map((channel) => channel.slug),
      );

      const resultBySlug = new Map(results.map((channel) => [channel.slug, channel]));
      const liveTransitions: KickChannel[] = [];
      const merged = currentChannels.map((previous) => {
        const result = resultBySlug.get(previous.slug);
        if (!result) {
          return previous;
        }

        const lastWentLiveAt =
          result.status === "live"
            ? previous.status === "live"
              ? previous.lastWentLiveAt
              : result.lastWentLiveAt
            : undefined;

        const next = {
          ...previous,
          ...result,
          lastWentLiveAt,
        };

        // Transition from offline or unknown to live, and make sure we haven't already notified for this live session
        if (
          (previous.status === "offline" || previous.status === "unknown") &&
          next.status === "live"
        ) {
          if (!notifiedLiveSlugsRef.current.has(next.slug)) {
            liveTransitions.push(next);
            notifiedLiveSlugsRef.current.add(next.slug);
          }
          // Se o robô geral estiver ligado, ativa o apoio individual deste canal automaticamente
          if (settingsRef.current.supportBotEnabled) {
            next.supportEnabled = true;
          }
        } else if (next.status === "offline") {
          // If offline, remove from notified set so we can notify again when they go live next time
          notifiedLiveSlugsRef.current.delete(next.slug);
        }

        return next;
      });

      setChannels(merged);

      const currentSettings = settingsRef.current;
      for (const channel of liveTransitions) {
        pushToast(`${channel.username ?? channel.slug} entrou ao vivo`);
        if (currentSettings.soundEnabled) {
          playLiveAlert();
        }
        if (currentSettings.notificationsEnabled) {
          void notifyLive(channel);
        }
      }
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [pushToast, setChannels]);

  // Keep a ref of refreshAll to break dependency chain in useEffect
  const refreshAllRef = useRef(refreshAll);
  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

  useEffect(() => {
    const intervalMs = Math.max(settings.checkIntervalSeconds, 15) * 1000;
    const handle = window.setInterval(() => {
      void refreshAllRef.current();
    }, intervalMs);

    return () => window.clearInterval(handle);
  }, [settings.checkIntervalSeconds]);

  // Only trigger refresh when channel list length changes, using ref to avoid loop
  const prevLengthRef = useRef(channels.length);
  useEffect(() => {
    if (channels.length !== prevLengthRef.current) {
      prevLengthRef.current = channels.length;
      void refreshAllRef.current();
    }
  }, [channels.length]);

  // Initial fetch
  useEffect(() => {
    void refreshAllRef.current();
  }, []);

  return {
    isChecking,
    liveCount,
    refreshAll,
    toasts,
  };
}
