// Zvuky kasina generované přímo v prohlížeči (Web Audio), bez zvukových souborů.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem("herna-mute") === "1"; } catch (e) {}

export function unlock() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch (e) {}
}
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem("herna-mute", m ? "1" : "0"); } catch (e) {}
  if (music && ctx) music.g.gain.setTargetAtTime(m ? 0 : MUSIC_VOL, ctx.currentTime, 0.1);
}

// Podkresová hudba: smyčka v rytmu lounge kasina (bas, akordy, činely, melodie).
const MUSIC_VOL = 0.55;
let music = null, noise = null;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CHORDS = [[57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65], [52, 56, 59, 62]];
const SCALE = [69, 72, 74, 76, 79, 81, 84];
export const musicOn = () => !!music;
export function startMusic() {
  if (!ctx || music) return;
  const g = ctx.createGain();
  g.gain.value = muted ? 0 : MUSIC_VOL;
  g.connect(ctx.destination);
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.06), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const step = 60 / 116 / 2;
  let i = 0, next = ctx.currentTime + 0.15, lastNote = 69;
  const play = (f, t, dur, type, vol) => {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = type; o.frequency.value = f;
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e).connect(g); o.start(t); o.stop(t + dur + 0.05);
  };
  const hat = (t, vol) => {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain();
    src.buffer = noise; f.type = "highpass"; f.frequency.value = 7000;
    e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f).connect(e).connect(g); src.start(t);
  };
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.35) {
      const s = i % 8, ch = CHORDS[Math.floor(i / 8) % 4];
      const t = next + (s % 2 ? step * 0.18 : 0);
      if (s === 0 || s === 3 || s === 4 || s === 6) play(midi(ch[0] - 12 + (s === 4 ? 7 : 0)), t, step * 0.9, "triangle", 0.2);
      if (s === 2 || s === 5) ch.forEach((m) => play(midi(m), t, step * 0.7, "square", 0.014));
      if (s % 2 === 0 && Math.random() < 0.5) {
        const idx = Math.max(0, Math.min(SCALE.length - 1, SCALE.indexOf(lastNote) + Math.floor(Math.random() * 3) - 1));
        lastNote = SCALE[idx < 0 ? 0 : idx];
        play(midi(lastNote), t, step * 1.7, "sine", 0.045);
      }
      hat(t, s % 2 ? 0.025 : 0.04);
      next += step; i++;
    }
  }, 100);
  music = { g, timer };
}
export function stopMusic() {
  if (!music || !ctx) return;
  clearInterval(music.timer);
  music.g.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  const g = music.g; setTimeout(() => g.disconnect(), 1500);
  music = null;
}

function tone(freq, start, dur, type = "square", vol = 0.08, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + start;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tick() { tone(1400, 0, 0.03, "square", 0.04); },
  land() { tone(523, 0, 0.12, "triangle", 0.12); tone(784, 0.08, 0.12, "triangle", 0.12); tone(1047, 0.16, 0.35, "triangle", 0.14); },
  count() { tone(880, 0, 0.08, "sine", 0.1); },
  lock() { tone(220, 0, 0.18, "sawtooth", 0.06); tone(165, 0.12, 0.25, "sawtooth", 0.06); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.22, "triangle", 0.12)); [0.45, 0.55, 0.65].forEach((s) => tone(2093, s, 0.08, "sine", 0.05)); },
  lose() { tone(196, 0, 0.35, "sawtooth", 0.08, 98); },
  bankrupt() { [392, 370, 349].forEach((f, i) => tone(f, i * 0.32, 0.3, "sawtooth", 0.07)); tone(330, 0.96, 0.9, "sawtooth", 0.07, 220); },
  jackpot() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.18, "square", 0.08)); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.55 + i * 0.09, 0.3, "triangle", 0.1)); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.26, "triangle", 0.12)); },
  join() { tone(1175, 0, 0.08, "sine", 0.07); tone(1568, 0.06, 0.12, "sine", 0.07); },
};

// Déšť mincí a žetonů přes obrazovku.
export function coinRain(n = 40) {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.createElement("div");
  box.className = "rain";
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = i % 4 === 0 ? "chip" : "coin";
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDelay = Math.random() * 0.9 + "s";
    c.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
    const s = 18 + Math.random() * 22;
    c.style.width = c.style.height = s + "px";
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4200);
}
