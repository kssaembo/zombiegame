// One context per open introduction; all nodes and pending playback are owned here.
let context: AudioContext | null = null;
let generation = 0;
const playing = new Set<() => void>();

async function withContext(play: (ctx: AudioContext) => void) {
  const token = generation;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!context || context.state === 'closed') context = new AudioCtx();
    const ctx = context;
    if (ctx.state === 'suspended') await ctx.resume();
    // Closing/muting while resume is pending must not start a late sound.
    if (token !== generation || ctx !== context || ctx.state === 'closed') return;
    play(ctx);
  } catch { /* Audio is optional; autoplay restrictions never block the game. */ }
}

function tone(ctx: AudioContext, duration: number, volume: number, shape: OscillatorType, configure: (param: AudioParam, now: number) => void) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = shape;
  configure(osc.frequency, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.01, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  const disconnect = () => { osc.disconnect(); gain.disconnect(); playing.delete(stop); };
  const stop = () => { osc.onended = null; try { osc.stop(); } catch {} disconnect(); };
  osc.onended = disconnect;
  playing.add(stop);
  osc.start(now);
  osc.stop(now + duration);
}

export type SoundType = 'type' | 'select' | 'confirm' | 'alert' | 'next' | 'siren';

export function playSound(type: SoundType) {
  if (type === 'siren') { playSynthSiren(); return; }
  void withContext(ctx => {
    const duration = { type: 0.04, select: 0.07, confirm: 0.25, alert: 0.35, next: 0.12 }[type];
    const volume = { type: 0.015, select: 0.035, confirm: 0.1, alert: 0.12, next: 0.08 }[type];
    tone(ctx, duration, volume, type === 'type' || type === 'select' ? 'triangle' : type === 'alert' ? 'sawtooth' : 'sine', (frequency, now) => {
      if (type === 'type') frequency.setValueAtTime(440 + Math.random() * 200, now);
      if (type === 'select') { frequency.setValueAtTime(720, now); frequency.linearRampToValueAtTime(880, now + duration); }
      if (type === 'confirm') { frequency.setValueAtTime(523.25, now); frequency.exponentialRampToValueAtTime(1046.5, now + 0.2); }
      if (type === 'alert') { frequency.setValueAtTime(880, now); frequency.setValueAtTime(440, now + 0.15); }
      if (type === 'next') frequency.setValueAtTime(659.25, now);
    });
  });
}

export function playSynthSiren(durationMs = 5000) {
  void withContext(ctx => {
    const duration = durationMs / 1000;
    for (const offset of [0, 4]) {
      tone(ctx, duration, 0.09, offset ? 'square' : 'sawtooth', (frequency, now) => {
        frequency.setValueAtTime(550 + offset, now);
        for (let t = 0.4, up = true; t < duration; t += 0.4, up = !up) {
          frequency.linearRampToValueAtTime((up ? 980 : 550) + offset, now + t);
        }
      });
    }
  });
}

export function stopSounds() {
  generation++;
  for (const stop of [...playing]) stop();
}

export function disposeAudio() {
  stopSounds();
  const old = context;
  context = null;
  if (old && old.state !== 'closed') void old.close().catch(() => {});
}
