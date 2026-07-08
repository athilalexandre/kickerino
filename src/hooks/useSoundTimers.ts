import { useEffect, useState } from "react";
import type { SoundTimer } from "../types/timer";
import { playSound } from "../services/sound";
import { notifyTimerTriggered } from "../services/notifications";

const TIMERS_STORAGE_KEY = "kickerino.sound_timers";

export function useSoundTimers() {
  const [timers, setTimers] = useState<SoundTimer[]>(() => {
    try {
      const raw = localStorage.getItem(TIMERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage whenever timers change
  useEffect(() => {
    localStorage.setItem(TIMERS_STORAGE_KEY, JSON.stringify(timers));
  }, [timers]);

  const addTimer = (newTimer: Omit<SoundTimer, "id" | "createdAt" | "isEnabled">) => {
    const timer: SoundTimer = {
      ...newTimer,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      isEnabled: true,
      createdAt: Date.now(),
    };
    setTimers((current) => [...current, timer]);
  };

  const deleteTimer = (id: string) => {
    setTimers((current) => current.filter((t) => t.id !== id));
  };

  const updateTimer = (id: string, updates: Partial<Omit<SoundTimer, "id" | "createdAt">>) => {
    setTimers((current) =>
      current.map((t) => {
        if (t.id === id) {
          // If enabled is toggled, or type/interval is changed, reset baseline
          let lastTriggeredAt = t.lastTriggeredAt;
          if (updates.isEnabled === true && !t.isEnabled) {
            lastTriggeredAt = undefined;
          }
          if (updates.intervalMinutes !== undefined && updates.intervalMinutes !== t.intervalMinutes) {
            lastTriggeredAt = undefined;
          }
          if (updates.type !== undefined && updates.type !== t.type) {
            lastTriggeredAt = undefined;
          }
          if (updates.minuteOfHour !== undefined && updates.minuteOfHour !== t.minuteOfHour) {
            lastTriggeredAt = undefined;
          }
          if (updates.specificTime !== undefined && updates.specificTime !== t.specificTime) {
            lastTriggeredAt = undefined;
          }
          return {
            ...t,
            ...updates,
            lastTriggeredAt,
          };
        }
        return t;
      })
    );
  };

  // Run the checker interval in background
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      let hasChanges = false;

      setTimers((currentTimers) => {
        const nextTimers = currentTimers.map((t) => {
          if (!t.isEnabled) {
            return t;
          }

          let shouldTrigger = false;

          if (t.type === "interval") {
            const intervalMs = t.intervalMinutes * 60 * 1000;
            const baseline = t.lastTriggeredAt || t.createdAt;
            if (now - baseline >= intervalMs) {
              shouldTrigger = true;
            }
          } else if (t.type === "hourly") {
            const currentDate = new Date(now);
            const currentHourStart = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              currentDate.getDate(),
              currentDate.getHours(),
              0,
              0,
              0
            ).getTime();

            const baseline = t.lastTriggeredAt || t.createdAt;
            const baselineDate = new Date(baseline);
            const baselineHourStart = new Date(
              baselineDate.getFullYear(),
              baselineDate.getMonth(),
              baselineDate.getDate(),
              baselineDate.getHours(),
              0,
              0,
              0
            ).getTime();

            if (currentHourStart > baselineHourStart) {
              shouldTrigger = true;
            }
          } else if (t.type === "hourly_minute") {
            const currentDate = new Date(now);
            const targetMinute = t.minuteOfHour ?? 0;
            let targetTime = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              currentDate.getDate(),
              currentDate.getHours(),
              targetMinute,
              0,
              0
            ).getTime();

            if (targetTime > now) {
              targetTime = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
                currentDate.getHours() - 1,
                targetMinute,
                0,
                0
              ).getTime();
            }

            const baseline = t.lastTriggeredAt || t.createdAt;
            if (now >= targetTime && baseline < targetTime) {
              shouldTrigger = true;
            }
          } else if (t.type === "specific_time") {
            const [hoursStr, minutesStr] = (t.specificTime || "00:00").split(":");
            const targetHours = parseInt(hoursStr, 10) || 0;
            const targetMinutes = parseInt(minutesStr, 10) || 0;
            const currentDate = new Date(now);
            let targetTime = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              currentDate.getDate(),
              targetHours,
              targetMinutes,
              0,
              0
            ).getTime();

            if (targetTime > now) {
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              targetTime = new Date(
                yesterday.getFullYear(),
                yesterday.getMonth(),
                yesterday.getDate(),
                targetHours,
                targetMinutes,
                0,
                0
              ).getTime();
            }

            const baseline = t.lastTriggeredAt || t.createdAt;
            if (now >= targetTime && baseline < targetTime) {
              shouldTrigger = true;
            }
          }

          if (shouldTrigger) {
            hasChanges = true;
            
            // Trigger sound & notification
            playSound(t.volume, t.soundFilePath);
            void notifyTimerTriggered(t.name);

            return {
              ...t,
              lastTriggeredAt: now,
            };
          }

          return t;
        });

        return hasChanges ? nextTimers : currentTimers;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return {
    timers,
    addTimer,
    deleteTimer,
    updateTimer,
  };
}
