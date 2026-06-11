import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { checkManyLiveStatuses } from "../services/kickApi";
import { notifyLive } from "../services/notifications";
import { playLiveAlert } from "../services/sound";
import type { KickChannel } from "../types/channel";
import type { AppSettings } from "../types/settings";

export type AppToast = {
  id: number;
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

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const liveCount = useMemo(
    () => channels.filter((channel) => channel.status === "live").length,
    [channels],
  );

  const pushToast = useCallback((message: string) => {
    const id = Date.now();
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

        if (previous.status === "offline" && next.status === "live") {
          liveTransitions.push(next);
        }

        return next;
      });

      setChannels(merged);

      for (const channel of liveTransitions) {
        pushToast(`${channel.username ?? channel.slug} entrou ao vivo`);
        if (settings.soundEnabled) {
          playLiveAlert();
        }
        if (settings.notificationsEnabled) {
          void notifyLive(channel);
        }
      }
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, [pushToast, setChannels, settings.notificationsEnabled, settings.soundEnabled]);

  useEffect(() => {
    const intervalMs = Math.max(settings.checkIntervalSeconds, 15) * 1000;
    const handle = window.setInterval(() => {
      void refreshAll();
    }, intervalMs);

    return () => window.clearInterval(handle);
  }, [refreshAll, settings.checkIntervalSeconds]);

  useEffect(() => {
    void refreshAll();
  }, [channels.length, refreshAll]);

  return {
    isChecking,
    liveCount,
    refreshAll,
    toasts,
  };
}
