export interface SoundTimer {
  id: string;
  name: string;
  type: "hourly" | "interval" | "hourly_minute" | "specific_time";
  intervalMinutes: number;
  minuteOfHour?: number; // for "hourly_minute"
  specificTime?: string; // for "specific_time" (format "HH:MM")
  volume: number; // 0 to 100
  soundFilePath?: string; // local absolute file path on user's PC
  soundFileName?: string; // original attached file name
  isEnabled: boolean;
  lastTriggeredAt?: number;
  createdAt: number;
}
