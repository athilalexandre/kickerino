export function playLiveAlert() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  let context: AudioContext | null = null;
  try {
    context = new AudioContextClass();
    const gain = context.createGain();
    const first = context.createOscillator();
    const second = context.createOscillator();

    first.type = "sine";
    first.frequency.value = 740;
    second.type = "sine";
    second.frequency.value = 980;
    gain.gain.value = 0.08;

    first.connect(gain);
    second.connect(gain);
    gain.connect(context.destination);

    first.start();
    second.start(context.currentTime + 0.16);
    first.stop(context.currentTime + 0.16);
    second.stop(context.currentTime + 0.34);

    const ctx = context;
    window.setTimeout(() => {
      ctx.close().catch((err) => console.error("Error closing AudioContext:", err));
    }, 600);
  } catch (err) {
    console.error("Error playing live alert sound:", err);
    if (context) {
      context.close().catch(() => {});
    }
  }
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

export function playSound(volumePercent: number, soundDataUrl?: string) {
  const volume = volumePercent / 100;
  if (soundDataUrl) {
    try {
      const audio = new Audio(soundDataUrl);
      audio.volume = volume;
      audio.play().catch((err) => {
        console.error("Error playing custom sound:", err);
        playDefaultTimerAlert(volume);
      });
    } catch (err) {
      console.error("Error creating audio element for custom sound:", err);
      playDefaultTimerAlert(volume);
    }
  } else {
    playDefaultTimerAlert(volume);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
