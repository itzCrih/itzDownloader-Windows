/**
 * Plays a soft melodic completion chime using the Web Audio API.
 * A single AudioContext is reused: Chromium caps the number of live contexts,
 * so creating one per chime silently broke the sound after a few downloads.
 */
let sharedContext = null;
let lastPlayedAt = 0;

function getContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedContext || sharedContext.state === 'closed') sharedContext = new Ctx();
  return sharedContext;
}

export function playCompletionChime() {
  try {
    // Avoid a cacophony when several playlist items finish at once
    const now = Date.now();
    if (now - lastPlayedAt < 400) return;
    lastPlayedAt = now;

    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, index) => {
      const t = startTime + index * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });
  } catch (e) {
    // AudioContext blocked or not supported
  }
}
