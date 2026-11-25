import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, update, onValue, serverTimestamp, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export { ref, get, set, update, onValue, serverTimestamp, remove };

export const START_CHIPS = 1000;

// Přihlásí anonymně; po obnovení stránky vrátí stejného uživatele.
export function signIn() {
  return new Promise((resolve, reject) => {
    let asked = false;
    const off = onAuthStateChanged(auth, (user) => {
      if (user) { off(); resolve(user); }
      else if (!asked) { asked = true; signInAnonymously(auth).catch(reject); }
    });
  });
}

let offset = 0;
onValue(ref(db, ".info/serverTimeOffset"), (s) => { offset = s.val() || 0; });
export const serverNow = () => Date.now() + offset;

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fmt = (n) => Math.round(n || 0).toLocaleString("cs-CZ");
export const fmtMult = (m) => "×" + String(m).replace(".", ",");
export const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function secondsLeft(state) {
  if (!state || !state.startedAt || !state.durationMs) return 0;
  return Math.max(0, Math.ceil((state.startedAt + state.durationMs - serverNow()) / 1000));
}

// Seřazení hráčů: aktivní podle žetonů, zbankrotovaní na konci (kdo vydržel déle, je výš).
export function ranking(players) {
  return Object.entries(players || {})
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => {
      if (!!a.bankrupt !== !!b.bankrupt) return a.bankrupt ? 1 : -1;
      if (a.bankrupt && b.bankrupt) return (b.bankruptQ ?? -1) - (a.bankruptQ ?? -1);
      return (b.chips || 0) - (a.chips || 0);
    });
}
