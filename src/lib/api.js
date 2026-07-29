export const API_BASE = import.meta.env.VITE_API_BASE || "https://api.cosmicx.fun";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
async function apiSend(path, method, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export const Api = {
  // --- katalog & pencarian ---
  discover: (seed, cursor, limit) =>
    apiGet(`/api/discover?${seed ? `seed=${encodeURIComponent(seed)}&` : ""}cursor=${cursor || 0}&limit=${limit || 20}`),
  search: (q) => apiGet(`/api/search?q=${encodeURIComponent(q)}`),
  artist: (q) => apiGet(`/api/artist?q=${encodeURIComponent(q)}`),
  album: (id) => apiGet(`/api/album/${id}`),
  track: (id) => apiGet(`/api/track/${id}`),
  similar: (args) =>
    apiGet(`/api/similar?${args.trackId ? `trackId=${encodeURIComponent(args.trackId)}` : `title=${encodeURIComponent(args.title)}&artist=${encodeURIComponent(args.artist || "")}`}`),

  // --- audio ---
  // Sumber utama: preview 30 detik RESMI dari Deezer (track.preview),
  // langsung diputar tanpa lewat backend sama sekali. streamUrl di bawah ini
  // cuma dipakai kalau user secara sadar nyalain "putar penuh (eksperimen)"
  // di Setting, yang jalannya lewat resolver YouTube di server.
  streamUrl: (videoId) => `${API_BASE}/api/stream/${encodeURIComponent(videoId)}`,

  // --- auth ---
  me: () => apiGet("/auth/me"),
  logout: () => apiSend("/auth/logout", "POST"),
  discordLoginUrl: () => `${API_BASE}/auth/discord`,

  // --- me: likes, history, search history, settings ---
  likes: () => apiGet("/api/me/likes"),
  like: (videoId, meta) => apiSend(`/api/me/likes/${encodeURIComponent(videoId)}`, "POST", meta),
  unlike: (videoId) => apiSend(`/api/me/likes/${encodeURIComponent(videoId)}`, "DELETE"),
  history: (limit) => apiGet(`/api/me/history?limit=${limit || 50}`),
  addHistory: (videoId, meta) => apiSend("/api/me/history", "POST", { videoId, ...meta }),

  recentSearches: (limit) => apiGet(`/api/me/search-history/recent?limit=${limit || 10}`),
  suggestSearches: (q) => apiGet(`/api/me/search-history/suggest?q=${encodeURIComponent(q)}`),
  recordSearch: (query) => apiSend("/api/me/search-history", "POST", { query }),
  deleteSearch: (query) => apiSend(`/api/me/search-history/one?query=${encodeURIComponent(query)}`, "DELETE"),
  clearSearchHistory: () => apiSend("/api/me/search-history", "DELETE"),

  getSettings: () => apiGet("/api/me/settings"),
  putSettings: (patch) => apiSend("/api/me/settings", "PUT", patch),
  resetSettings: () => apiSend("/api/me/settings/reset", "POST"),

  // --- playlists ---
  playlists: () => apiGet("/api/playlists"),
  createPlaylist: (body) => apiSend("/api/playlists", "POST", body),
  playlist: (id) => apiGet(`/api/playlists/${id}`),
  addSong: (id, videoId, meta) => apiSend(`/api/playlists/${id}/songs`, "POST", { videoId, ...meta }),
  removeSong: (id, videoId) => apiSend(`/api/playlists/${id}/songs/${encodeURIComponent(videoId)}`, "DELETE"),
  deletePlaylist: (id) => apiSend(`/api/playlists/${id}`, "DELETE"),

  // --- rooms (daftar publik lewat REST; create/join/sync lewat socket) ---
  publicRooms: () => apiGet("/api/rooms"),
};
