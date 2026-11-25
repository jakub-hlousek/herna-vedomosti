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
export function setMuted(m) { muted = m; try { localStorage.setItem("herna-mute", m ? "1" : "0"); } catch (e) {} }

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
