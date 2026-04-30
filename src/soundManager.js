/**
 * SoundManager — Web Audio API sound effects for Qui Paie?
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(frequency, type, duration, volume = 0.3, startOffset = 0) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + startOffset);
  gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.05);
}

export function playSpinTick() {
  playTone(880, 'square', 0.04, 0.08);
}

export function playSpinLoop(onStop) {
  const ctx = getCtx();
  let running = true;
  let interval = 80;
  let count = 0;
  const totalTicks = 35;

  function tick() {
    if (!running) return;
    playSpinTick();
    count++;
    // speed ramp: slow down towards the end
    const progress = count / totalTicks;
    interval = 80 + progress * progress * 350;
    if (count < totalTicks) {
      setTimeout(tick, interval);
    } else {
      onStop && onStop();
    }
  }
  tick();
  return () => { running = false; };
}

export function playWinnerFanfare() {
  const ctx = getCtx();
  // Sad trombone vibe (minor descending chord then buzzer)
  const notes = [
    { f: 523, d: 0.25, off: 0 },      // C5
    { f: 466, d: 0.25, off: 0.2 },    // Bb4
    { f: 415, d: 0.25, off: 0.4 },    // Ab4
    { f: 349, d: 0.5, off: 0.65 },    // F4
  ];
  notes.forEach(n => playTone(n.f, 'sawtooth', n.d, 0.18, n.off));
  // Final buzz
  playTone(200, 'square', 0.4, 0.12, 1.2);
}

export function playExcludeSound() {
  playTone(330, 'square', 0.1, 0.12, 0);
  playTone(220, 'square', 0.15, 0.1, 0.1);
}

export function playAddSound() {
  playTone(660, 'sine', 0.12, 0.15, 0);
  playTone(880, 'sine', 0.1, 0.12, 0.1);
}

export function playReplaySound() {
  playTone(440, 'sine', 0.08, 0.15, 0);
  playTone(550, 'sine', 0.08, 0.15, 0.08);
  playTone(660, 'sine', 0.1, 0.15, 0.16);
}
