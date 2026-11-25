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

// Podkresová hudba: swing jako v lounge kasina ve Vegas
// (kráčející basa, ride činel, hi-hat, klavírní akordy, vibrafon s melodií, žesťové údery).
const MUSIC_VOL = 0.6;
let music = null, noise = null;
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
// I–VI–ii–V v F dur: Fmaj7 | D7 | Gm7 | C7 | Am7 | D7 | Gm7 | C7
const PROG = [[53, [0, 4, 7, 11]], [50, [0, 4, 7, 10]], [55, [0, 3, 7, 10]], [48, [0, 4, 7, 10]], [57, [0, 3, 7, 10]], [50, [0, 4, 7, 10]], [55, [0, 3, 7, 10]], [48, [0, 4, 7, 10]]];
const SCALE = [65, 67, 69, 72, 74, 77, 79, 81];
export const musicOn = () => !!music;
export function startMusic() {
  if (!ctx || music) return;
  const g = ctx.createGain();
  g.gain.value = muted ? 0 : MUSIC_VOL;
  const comp = ctx.createDynamicsCompressor();
  g.connect(comp).connect(ctx.destination);
  if (!noise) {
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const beat = 60 / 138, swing = beat * 2 / 3;
  let b = 0, next = ctx.currentTime + 0.2, mel = 72, phrase = [];
  const voice = (f, t, dur, type, vol, cutoff = 0, vib = 0) => {
    const o = ctx.createOscillator(), e = ctx.createGain();
    o.type = type; o.frequency.value = f;
    let node = o;
    if (cutoff) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cutoff; o.connect(lp); node = lp; }
    if (vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = vol * 0.35; lfo.connect(lg).connect(e.gain); lfo.start(t); lfo.stop(t + dur + 0.05); }
    e.gain.setValueAtTime(0.0001, t);
    e.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(e).connect(g); o.start(t); o.stop(t + dur + 0.05);
  };
  const metal = (t, vol, dur, freq) => {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain();
    src.buffer = noise; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.8;
    e.gain.setValueAtTime(vol, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(e).connect(g); src.start(t, Math.random() * 0.2, dur + 0.05);
  };
  const kick = (t) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); e.gain.setValueAtTime(0.35, t); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(e).connect(g); o.start(t); o.stop(t + 0.2); };
  const newPhrase = (root) => {
    const p = []; let n = mel;
    for (let k = 0; k < 6; k++) {
      const idx = Math.max(0, Math.min(SCALE.length - 1, SCALE.indexOf(n) + [-2, -1, 1, 1, 2][Math.floor(Math.random() * 5)]));
      n = SCALE[idx]; p.push(n);
    }
    mel = n; return p;
  };
  const timer = setInterval(() => {
    while (next < ctx.currentTime + 0.4) {
      const bar = Math.floor(b / 4), inBar = b % 4, [root, iv] = PROG[bar % 8];
      const t = next, off = next + swing;
      // kráčející basa: kořen, terce, kvinta, chromatický přechod k další harmonii
      const nextRoot = PROG[(bar + 1) % 8][0];
      const bassNote = [root, root + iv[1], root + 7, nextRoot + (Math.random() < 0.5 ? 1 : -1)][inBar] - 12;
      voice(midi(bassNote), t, beat * 0.85, "triangle", 0.28, 900);
      // bicí: ride ding-ding-a-ding, hi-hat na 2 a 4, jemný kopák na 1 a 3
      metal(t, 0.05, 0.25, 9000);
      if (inBar === 1 || inBar === 3) { metal(off, 0.035, 0.18, 9000); metal(t, 0.06, 0.05, 6000); }
      if (inBar === 0 || inBar === 2) kick(t);
      // klavír: charlestonový rytmus (1 a 2a)
      if (inBar === 0 || (inBar === 1 && Math.random() < 0.8)) {
        const ct = inBar === 0 ? t : off;
        iv.forEach((x) => voice(midi(root + 12 + x), ct, beat * 0.5, "sawtooth", 0.016, 1800));
      }
      // vibrafon: frázi hraje dva takty, dva takty odpovídá pauzou
      if (bar % 4 === 0 && inBar === 0) phrase = newPhrase(root);
      if (bar % 4 < 2 && phrase.length) {
        const k = (bar % 4) * 4 + inBar;
        if (k < 6) { voice(midi(phrase[k]), t, beat * 0.9, "sine", 0.07, 0, 1); if (Math.random() < 0.5) voice(midi(phrase[k] + 12), off, beat * 0.4, "sine", 0.03, 0, 1); }
      }
      // žesťový úder na konci každých 8 taktů
      if (bar % 8 === 7 && inBar === 3) [0, 4, 7, 10].forEach((x) => voice(midi(60 + x), off, beat * 0.9, "sawtooth", 0.03, 2400));
      next += beat; b++;
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
