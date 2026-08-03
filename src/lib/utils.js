export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(sec) {
  if (!isFinite(sec) || sec <= 0) return "\u2013";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  if (h >= 1) {
    const m = Math.floor((total % 3600) / 60);
    return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
  }
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseLRC(lrc) {
  if (!lrc || typeof lrc !== "string") return [];
  const re = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const out = [];
  for (const rawLine of lrc.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(re)];
    if (!matches.length) continue;
    const text = rawLine.replace(re, "").trim();
    for (const m of matches) {
      const min = parseInt(m[1], 10) || 0;
      const s = parseInt(m[2], 10) || 0;
      const frac = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
      out.push({ time: min * 60 + s + frac / 1000, text });
    }
  }
  return out.sort((a, b) => a.time - b.time);
}

export function relativeTime(ms) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru aja";
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function seededShuffle(arr, seedNum) {
  const out = [...arr];
  let s = seedNum || 1;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
