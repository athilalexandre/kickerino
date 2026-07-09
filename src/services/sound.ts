import { invoke } from "@tauri-apps/api/core";

export function playLiveAlert() {
  // Chamamos o comando de áudio nativo do Rust para contornar as restrições de autoplay da webview
  playSound(40);
}

export function playDefaultTimerAlert(volume: number) {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  let context: AudioContext | null = null;
  try {
    context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    gain.connect(context.destination);

    const playNote = (freq: number, start: number, duration: number) => {
      if (!context) return;
      const osc = context.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(context.currentTime + start);
      osc.stop(context.currentTime + start + duration);
    };

    playNote(523.25, 0.0, 0.15);
    playNote(659.25, 0.1, 0.15);
    playNote(783.99, 0.2, 0.15);
    playNote(1046.50, 0.3, 0.3);

    const ctx = context;
    window.setTimeout(() => {
      ctx.close().catch((err) => console.error("Error closing AudioContext:", err));
    }, 1000);
  } catch (err) {
    console.error("Error playing default timer alert:", err);
    if (context) {
      context.close().catch(() => {});
    }
  }
}

export function playSound(volumePercent: number, soundFilePath?: string) {
  invoke("play_sound_rust", { path: soundFilePath || null, volumePercent })
    .catch((err) => console.error("Error playing sound in Rust:", err));
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
