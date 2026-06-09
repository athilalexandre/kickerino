export function playLiveAlert() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
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

  window.setTimeout(() => void context.close(), 600);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
