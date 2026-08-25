export const API_BASE = import.meta.env.VITE_API_BASE || "https://api.cosmicx.fun";

async function throwApiError(res) {
  let message = `${res.status} ${res.statusText}`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch { }
  throw new Error(message);
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) await throwApiError(res);
  return res.json();
}
async function apiSend(path, method, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await throwApiError(res);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const streamTicketCache = new Map();
const TICKET_MARGIN_S = 30;

export const Api = {
  discover: (seed, cursor, limit, type) =>
    apiGet(`/api/discover?${seed ? `seed=${encodeURIComponent(seed)}&` : ""}cursor=${cursor || 0}&limit=${limit || 20}${type ? `&type=${encodeURIComponent(type)}` : ""}`),
  search: (q) => apiGet(`/api/search?q=${encodeURIComponent(q)}`),
  artist: (q) => apiGet(`/api/artist?q=${encodeURIComponent(q)}`),
  artistQuick: (q) => apiGet(`/api/artist/quick?q=${encodeURIComponent(q)}`),
  album: (id) => apiGet(`/api/album/${id}`),
  track: (id) => apiGet(`/api/track/${id}`),
  trackCredits: ({ title, artist }) =>
    apiGet(`/api/track/credits?title=${encodeURIComponent(title || "")}&artist=${encodeURIComponent(artist || "")}`),
  similar: (args) =>
    apiGet(`/api/similar?${args.trackId ? `trackId=${encodeURIComponent(args.trackId)}` : `title=${encodeURIComponent(args.title)}&artist=${encodeURIComponent(args.artist || "")}`}`),


  lyrics: ({ title, artist, album, duration }) => {
    const qs = new URLSearchParams({ title: title || "" });
    if (artist) qs.set("artist", artist);
    if (album) qs.set("album", album);
    if (duration) qs.set("duration", String(Math.round(duration)));
    return apiGet(`/api/lyrics?${qs.toString()}`);
  },

  async getStreamUrl(videoId) {
    if (!videoId) return null;
    const streamPath = `/api/stream/${encodeURIComponent(videoId)}`;
    const nowS = Math.floor(Date.now() / 1000);
    const cached = streamTicketCache.get(videoId);
    if (cached && cached.expiresAt - TICKET_MARGIN_S > nowS) {
      return `${API_BASE}${streamPath}?t=${encodeURIComponent(cached.token)}`;
    }
    const ticket = await apiGet(`/api/stream-ticket/${streamPath.split("/").pop()}`);
    if (!ticket?.token) throw new Error("tiket stream kosong");
    streamTicketCache.set(videoId, ticket);
    return `${API_BASE}${streamPath}?t=${encodeURIComponent(ticket.token)}`;
  },

  me: () => apiGet("/auth/me"),
  logout: () => apiSend("/auth/logout", "POST"),
  discordLoginUrl: () => `${API_BASE}/auth/discord`,
  googleLoginUrl: () => `${API_BASE}/auth/google`,

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

  playlists: () => apiGet("/api/playlists"),
  createPlaylist: (body) => apiSend("/api/playlists", "POST", body),
  playlist: (id) => apiGet(`/api/playlists/${id}`),
  updatePlaylist: (id, body) => apiSend(`/api/playlists/${id}`, "PATCH", body),
  addSong: (id, videoId, meta) => apiSend(`/api/playlists/${id}/songs`, "POST", { videoId, ...meta }),
  removeSong: (id, videoId) => apiSend(`/api/playlists/${id}/songs/${encodeURIComponent(videoId)}`, "DELETE"),
  deletePlaylist: (id) => apiSend(`/api/playlists/${id}`, "DELETE"),

  resolveYoutubeImport: (url) => apiSend("/api/import/youtube/resolve", "POST", { url }),
  commitYoutubeImport: (body) => apiSend("/api/import/youtube/commit", "POST", body),

  publicRooms: () => apiGet("/api/rooms"),

  discordActivityToken: (code) => apiSend("/api/discord-activity/token", "POST", { code }),
};