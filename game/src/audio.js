// Tiny WebAudio blips, synthesized on the spot — no sound files to ship.
// Every call is guarded: audio only starts after a user gesture, and a missing
// AudioContext never breaks the game.
let context = null;

function audio() {
  if (context) return context;
  try {
    const Ctor = window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  } catch {
    return null;
  }
  return context;
}

function tone(freq, dur, type, gain, when = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur);
  } catch {
    // Sound is garnish; the game plays on without it.
  }
}

export const sfx = {
  play() { tone(520, 0.12, 'triangle', 0.12); tone(780, 0.1, 'triangle', 0.08, 0.05); },
  attack() { tone(180, 0.14, 'sawtooth', 0.1); tone(90, 0.18, 'square', 0.07, 0.03); },
  hurt() { tone(140, 0.25, 'sawtooth', 0.1); },
  heal() { tone(660, 0.16, 'sine', 0.1); tone(880, 0.2, 'sine', 0.08, 0.08); },
  turn() { tone(440, 0.09, 'triangle', 0.09); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.12)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.14)); },
  error() { tone(110, 0.12, 'square', 0.06); },
};
