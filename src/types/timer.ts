export interface SoundTimer {
  id: string;
  name: string;
  type: "hourly" | "interval";
  intervalMinutes: number;
  volume: number; // 0 to 100
  soundDataUrl?: string; // base64 data URL
  soundFileName?: string; // original uploaded file name
  isEnabled: boolean;
  lastTriggeredAt?: number;
  createdAt: number;
}
