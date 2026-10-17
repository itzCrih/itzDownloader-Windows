/**
 * Plays a soft, professional melodic completion chime using Web Audio API.
 * Zero external audio files required.
 */
export function playCompletionChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const startTime = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + index * 0.08);

      gain.gain.setValueAtTime(0, startTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.08, startTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + index * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + index * 0.08);
      osc.stop(startTime + index * 0.08 + 0.36);
    });
  } catch (e) {
    // AudioContext blocked or not supported
  }
}
