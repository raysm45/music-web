import React, {
  createContext, useContext, useState, useEffect, useRef, useMemo, useCallback,
} from "react";
import { io } from "socket.io-client";
import { Api, API_BASE } from "./lib/api.js";
import { clamp, uid, debounce, pickBestAudioMatch } from "./lib/utils.js";
import { detectAudioFormat } from "./lib/audioFormat.js";
import { makeT } from "./lib/i18n.js";
import { useDiscordActivity } from "./lib/discordActivity.js";

export const EQ_BANDS_HZ = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
  vocal: [-2, -2, -1, 2, 4, 4, 2, 0, -1, -2],
  electronic: [5, 4, 0, -2, -3, 0, 2, 3, 4, 5],
};
const DEFAULT_EQ = { enabled: false, preset: "flat", preamp: 0, bands: [...EQ_PRESETS.flat] };

export const FONT_STACKS = {
  default: null,
  inter: "'Inter', -apple-system, sans-serif",
  applemusic: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  plexmono: "'IBM Plex Mono', ui-monospace, monospace",
  roboto: "'Roboto', -apple-system, sans-serif",
  opensans: "'Open Sans', -apple-system, sans-serif",
  lato: "'Lato', -apple-system, sans-serif",
  montserrat: "'Montserrat', -apple-system, sans-serif",
  poppins: "'Poppins', -apple-system, sans-serif",
  systemui: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};
const GOOGLE_FONT_QUERY = {
  inter: "Inter:wght@400;500;600;700;800",
  plexmono: "IBM+Plex+Mono:wght@400;500;600",
  roboto: "Roboto:wght@400;500;700",
  opensans: "Open+Sans:wght@400;500;600;700",
  lato: "Lato:wght@400;500;700",
  montserrat: "Montserrat:wght@400;500;600;700",
  poppins: "Poppins:wght@400;500;600;700",
};

const UICtx = createContext(null);
export function useUI() { return useContext(UICtx); }

export const SIDEBAR_MIN_W = 200;
export const SIDEBAR_MAX_W = 360;
export const SIDEBAR_COLLAPSED_W = 72;
export const RIGHTPANEL_MIN_W = 260;
export const RIGHTPANEL_MAX_W = 440;
export const RIGHTPANEL_COLLAPSED_W = 56;
export const RIGHTPANEL_PEEK_W = 52;
const PANEL_PREFS_KEY = "aivy_panel_prefs";
const DEFAULT_PANEL_PREFS = {
  sidebarWidth: 236,
  sidebarCollapsed: false,
  rightPanelWidth: 300,
  rightPanelCollapsed: false,
};
function loadPanelPrefs() {
  try {
    const raw = localStorage.getItem(PANEL_PREFS_KEY);
    if (!raw) return DEFAULT_PANEL_PREFS;
    const parsed = JSON.parse(raw);
    return {
      sidebarWidth: clamp(Number(parsed.sidebarWidth) || DEFAULT_PANEL_PREFS.sidebarWidth, SIDEBAR_MIN_W, SIDEBAR_MAX_W),
      sidebarCollapsed: !!parsed.sidebarCollapsed,
      rightPanelWidth: clamp(Number(parsed.rightPanelWidth) || DEFAULT_PANEL_PREFS.rightPanelWidth, RIGHTPANEL_MIN_W, RIGHTPANEL_MAX_W),
      rightPanelCollapsed: !!parsed.rightPanelCollapsed,
    };
  } catch { return DEFAULT_PANEL_PREFS; }
}

const DEFAULT_SETTINGS = {
  audioQuality: "preview",
  autoplay: true,
  crossfadeSeconds: 0,
  volumeDefault: 0.7,
  theme: "dark",
  language: "id",
  explicitContent: true,
  normalizeVolume: true,
  notifyRoomInvite: true,
  notifyNewFollower: true,
  autoJoinRoomAudio: true,
  historyEnabled: true,
  searchHistoryEnabled: true,
  compactRows: false,
  reducedMotion: false,
  highContrast: false,
  downloadOverWifiOnly: true,
  hostOnlyControlDefault: false,
  roomVisibilityDefault: "public",
  equalizer: DEFAULT_EQ,
};

export function UIProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState("dark");
  const [toasts, setToasts] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [addToPlaylistTarget, setAddToPlaylistTarget] = useState(null);
  const [creditsTrack, setCreditsTrack] = useState(null);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [sidebarQueueOpen, setSidebarQueueOpen] = useState(false);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [panelPrefs, setPanelPrefs] = useState(loadPanelPrefs);

  useEffect(() => {
    try { localStorage.setItem(PANEL_PREFS_KEY, JSON.stringify(panelPrefs)); } catch {}
  }, [panelPrefs]);

  useEffect(() => {
    Api.me()
      .then((u) => setAuthUser(u))
      .catch(() => setAuthUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authUser) return;
    Api.getSettings()
      .then((s) => { setSettings(s); setTheme(typeof s.theme === "string" && s.theme ? s.theme : "dark"); })
      .catch(() => {});
  }, [authUser]);

  useEffect(() => {
    if (theme !== "system") {
      document.documentElement.dataset.theme = theme || "dark";
      return undefined;
    }
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => { document.documentElement.dataset.theme = mq.matches ? "light" : "dark"; };
    apply();
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.compact = settings.compactRows ? "true" : "false";
  }, [settings.compactRows]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = settings.reducedMotion ? "true" : "false";
  }, [settings.reducedMotion]);
  useEffect(() => {
    document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
  }, [settings.highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    const customUrl = (settings.fontUrl || "").trim();
    let faceEl = document.getElementById("aivy-custom-font-face");
    if (customUrl) {
      if (!faceEl) { faceEl = document.createElement("style"); faceEl.id = "aivy-custom-font-face"; document.head.appendChild(faceEl); }
      faceEl.textContent = `@font-face{font-family:"Aivy Custom";src:url("${customUrl}");font-display:swap;}`;
    } else if (faceEl) faceEl.remove();
    const stack = customUrl ? "'Aivy Custom', sans-serif" : (FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.default);
    if (stack) {
      root.style.setProperty("--font-display", stack);
      root.style.setProperty("--font-body", stack);
    } else {
      root.style.removeProperty("--font-display");
      root.style.removeProperty("--font-body");
    }
    const gq = GOOGLE_FONT_QUERY[settings.fontFamily];
    let link = document.getElementById("aivy-gfont");
    if (gq) {
      if (!link) { link = document.createElement("link"); link.id = "aivy-gfont"; link.rel = "stylesheet"; document.head.appendChild(link); }
      link.href = `https://fonts.googleapis.com/css2?family=${gq}&display=swap`;
    } else if (link) link.remove();
  }, [settings.fontFamily, settings.fontUrl]);

  useEffect(() => {
    const scale = Number(settings.fontScale) || 100;
    const el = () => document.getElementById("aivy-content-scroll");
    el()?.style.setProperty("zoom", scale === 100 ? "" : String(scale / 100));
    return () => { el()?.style.removeProperty("zoom"); };
  }, [settings.fontScale]);

  useEffect(() => {
    const css = settings.customThemeCss || "";
    let el = document.getElementById("aivy-custom-theme-css");
    if (!css.trim()) { el?.remove(); return; }
    if (!el) { el = document.createElement("style"); el.id = "aivy-custom-theme-css"; document.head.appendChild(el); }
    el.textContent = css;
    return () => { document.getElementById("aivy-custom-theme-css")?.remove(); };
  }, [settings.customThemeCss]);

  const t = useCallback((key, fallback) => makeT(settings.language)(key, fallback), [settings.language]);

  const pushToast = useCallback((message) => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const login = useCallback(() => { window.location.href = Api.discordLoginUrl(); }, []);
  const loginGoogle = useCallback(() => { window.location.href = Api.googleLoginUrl(); }, []);
  const loggingOutRef = useRef(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setLoggingOut(true);
    setAuthUser(null);
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((resolve) => setTimeout(resolve, ms)),
    ]);
    try {
      await withTimeout(Api.logout(), 3000);
    } catch {}
    window.location.href = "/";
  }, []);

  const pendingSettingsPatchRef = useRef({});
  const flushSettingsRef = useRef(null);
  if (!flushSettingsRef.current) {
    flushSettingsRef.current = debounce(async (onError) => {
      const patch = pendingSettingsPatchRef.current;
      if (!Object.keys(patch).length) return;
      pendingSettingsPatchRef.current = {};
      try { await Api.putSettings(patch); } catch { onError(); }
    }, 600);
  }

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (patch.theme) setTheme(patch.theme);
    pendingSettingsPatchRef.current = { ...pendingSettingsPatchRef.current, ...patch };
    flushSettingsRef.current(() => pushToast(t("toastSettingsSaveFailed")));
  }, [pushToast, t]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    setTheme("dark");
    try { await Api.resetSettings(); } catch {  }
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: theme === "dark" ? "light" : "dark" });
  }, [theme, updateSettings]);

  const openContextMenu = useCallback((x, y, items) => setContextMenu({ x, y, items }), []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openAddToPlaylist = useCallback((track) => setAddToPlaylistTarget(track), []);
  const closeAddToPlaylist = useCallback(() => setAddToPlaylistTarget(null), []);

  const openCredits = useCallback((track) => setCreditsTrack(track), []);
  const closeCredits = useCallback(() => setCreditsTrack(null), []);

  const openLyrics = useCallback(() => setLyricsOpen(true), []);
  const closeLyrics = useCallback(() => setLyricsOpen(false), []);
  const toggleLyrics = useCallback(() => setLyricsOpen((o) => !o), []);
  const toggleSidebarQueue = useCallback(() => setSidebarQueueOpen((o) => !o), []);
  const closeSidebarQueue = useCallback(() => setSidebarQueueOpen(false), []);
  const openMobileQueue = useCallback(() => { setLyricsOpen(false); setMobileQueueOpen(true); }, []);
  const closeMobileQueue = useCallback(() => setMobileQueueOpen(false), []);

  const setSidebarWidth = useCallback((w) => {
    setPanelPrefs((p) => ({ ...p, sidebarWidth: clamp(Math.round(w), SIDEBAR_MIN_W, SIDEBAR_MAX_W) }));
  }, []);
  const setRightPanelWidth = useCallback((w) => {
    setPanelPrefs((p) => ({ ...p, rightPanelWidth: clamp(Math.round(w), RIGHTPANEL_MIN_W, RIGHTPANEL_MAX_W) }));
  }, []);
  const toggleSidebarCollapsed = useCallback(() => {
    setPanelPrefs((p) => ({ ...p, sidebarCollapsed: !p.sidebarCollapsed }));
  }, []);
  const toggleRightPanelCollapsed = useCallback(() => {
    setPanelPrefs((p) => ({ ...p, rightPanelCollapsed: !p.rightPanelCollapsed }));
  }, []);
  const [rightPanelPeek, setRightPanelPeek] = useState(false);

  const value = {
    authUser, authChecked, login, loginGoogle, logout, loggingOut,
    settings, updateSettings, resetSettings,
    theme, toggleTheme, t,
    toasts, pushToast,
    contextMenu, openContextMenu, closeContextMenu,
    addToPlaylistTarget, openAddToPlaylist, closeAddToPlaylist,
    creditsTrack, openCredits, closeCredits,
    lyricsOpen, openLyrics, closeLyrics, toggleLyrics,
    sidebarQueueOpen, toggleSidebarQueue, closeSidebarQueue,
    mobileQueueOpen, openMobileQueue, closeMobileQueue,
    sidebarWidth: panelPrefs.sidebarWidth,
    sidebarCollapsed: panelPrefs.sidebarCollapsed,
    setSidebarWidth,
    toggleSidebarCollapsed,
    rightPanelWidth: panelPrefs.rightPanelWidth,
    rightPanelCollapsed: panelPrefs.rightPanelCollapsed,
    setRightPanelWidth,
    toggleRightPanelCollapsed,
    rightPanelPeek, setRightPanelPeek,
  };
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

const PlayerCtx = createContext(null);
export function usePlayer() { return useContext(PlayerCtx); }

function normalizeTrack(raw) {
  if (!raw) return null;
  if (raw.videoId && !raw.artist?.id) {
    return {
      id: raw.videoId, videoId: raw.videoId, title: raw.title,
      artist: raw.artist ? (typeof raw.artist === "string" ? { name: raw.artist } : raw.artist) : null,
      album: raw.album || null, cover: raw.thumbnail || raw.cover || null,
      duration: raw.duration || null, preview: null, source: "youtube",
    };
  }
  return {
    id: String(raw.id), videoId: raw.videoId || null, title: raw.title,
    artist: raw.artist || null, album: raw.album || null,
    cover: raw.cover || raw.image || raw.banner || null,
    duration: raw.duration || null, preview: raw.preview || null,
    trackPosition: raw.trackPosition, source: "deezer",
  };
}

export function PlayerProvider({ children }) {
  const { authUser, settings, pushToast, t } = useUI();

  const [queueList, setQueueList] = useState([]);
  const [order, setOrder] = useState([]);
  const [posInOrder, setPosInOrder] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [clipDuration, setClipDuration] = useState(0);
  const [isPreviewClip, setIsPreviewClip] = useState(true);
  // Real detected container/codec of the file currently loaded into the
  // <audio> element — null while unknown/detecting, "unavailable" if
  // sniffing failed, or { label, mimeType, codec, container }.
  const [audioFormat, setAudioFormat] = useState(null);
  const [volume, setVolumeState] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const [liked, setLiked] = useState(() => new Set());
  const [playlists, setPlaylists] = useState([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playSource, setPlaySource] = useState(null);

  const audioGraphRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const wasFadedOutRef = useRef(false);

  const [room, setRoom] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomError, setRoomError] = useState(null);
  const [roomSyncTick, setRoomSyncTick] = useState(0);
  const roomSyncRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [suggestedQueue, setSuggestedQueue] = useState([]);
  const suggestedQueueRef = useRef([]);
  useEffect(() => { suggestedQueueRef.current = suggestedQueue; }, [suggestedQueue]);
  const addToQueueEndRef = useRef(null);
  const socketRef = useRef(null);

  const audioRef = useRef((() => {
    if (typeof Audio === "undefined") return null;
    const a = new Audio();
    a.crossOrigin = "anonymous";
    return a;
  })());
  // A second, silent <audio> element used purely to warm the browser's
  // (and any CDN's) cache for the *next* queued track's audio file while
  // the current one is still playing — see the prefetch effect below. It
  // never plays; it just sits there buffering so that when we actually
  // switch `audioRef`'s src to this same URL, playback can start from
  // cache instead of a cold network fetch.
  const preloadAudioRef = useRef((() => {
    if (typeof Audio === "undefined") return null;
    const a = new Audio();
    a.crossOrigin = "anonymous";
    a.preload = "auto";
    a.muted = true;
    return a;
  })());
  const promptCast = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return { ok: false, reason: "unsupported" };
    // Remote Playback API — supported by Chromium-based browsers for
    // casting an individual <audio>/<video> element to a Chromecast or
    // similar receiver. Not implemented everywhere, so this degrades
    // gracefully when unavailable rather than throwing.
    if (!audio.remote || typeof audio.remote.prompt !== "function") {
      return { ok: false, reason: "unsupported" };
    }
    try {
      await audio.remote.prompt();
      return { ok: true };
    } catch (err) {
      // User dismissed the device picker, or no devices were found —
      // either way there's nothing actionable to surface as an error.
      return { ok: false, reason: "cancelled" };
    }
  }, []);

  // Exposes the exact URL currently loaded into the <audio> element, so
  // callers (e.g. the track detail sheet) can measure real file size /
  // bitrate via a ranged fetch instead of guessing at numbers.
  const getAudioSrc = useCallback(() => {
    const audio = audioRef.current;
    return audio?.currentSrc || audio?.src || null;
  }, []);

  const progressElsRef = useRef(new Map());
  const resolvedFullCache = useRef(new Map());
  const recoveringRef = useRef(false);
  const retryCountRef = useRef(0);
  const isPlayingRef = useRef(false);

  const ensureAudioGraph = useCallback(() => {
    if (audioGraphRef.current) return audioGraphRef.current;
    const audio = audioRef.current;
    if (!audio || typeof window === "undefined") return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audio);
      const preamp = ctx.createGain();
      const bands = EQ_BANDS_HZ.map((freq) => {
        const f = ctx.createBiquadFilter();
        f.type = "peaking";
        f.frequency.value = freq;
        f.Q.value = 1.1;
        f.gain.value = 0;
        return f;
      });
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 20;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.2;
      const fadeGain = ctx.createGain();
      fadeGain.gain.value = 1;

      source.connect(preamp);
      let node = preamp;
      bands.forEach((b) => { node.connect(b); node = b; });
      node.connect(compressor);
      compressor.connect(fadeGain);
      fadeGain.connect(ctx.destination);

      const graph = { ctx, source, preamp, bands, compressor, fadeGain };
      audioGraphRef.current = graph;
      // Mobile browsers (iOS Safari in particular, also Chrome/Android in
      // some cases) suspend — or mark "interrupted" — the AudioContext
      // whenever the page is backgrounded/locked, a call comes in, etc.
      // Because the <audio> element's output is routed entirely through
      // this graph (createMediaElementSource redirects it, it can no
      // longer play straight to the speaker), a suspended context means
      // total silence even though the element itself is still technically
      // "playing" and its currentTime keeps advancing. Resuming as soon as
      // the state changes — instead of only when the tab becomes visible
      // again — closes most of that gap.
      ctx.addEventListener("statechange", () => {
        if (ctx.state !== "running" && isPlayingRef.current) ctx.resume().catch(() => {});
      });
      return graph;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const graph = ensureAudioGraph();
    if (!graph) return;
    const eq = settings.equalizer || DEFAULT_EQ;
    const enabled = !!eq.enabled;
    graph.preamp.gain.value = enabled ? Math.pow(10, (eq.preamp || 0) / 20) : 1;
    graph.bands.forEach((band, i) => { band.gain.value = enabled ? (eq.bands?.[i] ?? 0) : 0; });
  }, [settings.equalizer, ensureAudioGraph]);

  useEffect(() => {
    const graph = ensureAudioGraph();
    if (!graph) return;
    graph.compressor.threshold.value = settings.normalizeVolume ? -24 : 0;
    graph.compressor.ratio.value = settings.normalizeVolume ? 8 : 1;
  }, [settings.normalizeVolume, ensureAudioGraph]);

  const currentTrack = queueList.length && order.length ? queueList[order[posInOrder]] : null;
  const currentKey = currentTrack ? currentTrack.id : null;
  const inRoom = !!room;

  const { updateActivity } = useDiscordActivity();
  useEffect(() => {
    if (!currentTrack) return;
    updateActivity({ title: currentTrack.title, artist: currentTrack.artist?.name, isPlaying });
  }, [currentKey, isPlaying, updateActivity]);

  const defaultDocTitleRef = useRef(typeof document !== "undefined" ? document.title : "");
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!currentTrack) {
      document.title = defaultDocTitleRef.current;
      return;
    }
    const artistName = currentTrack.artist?.name;
    document.title = artistName ? `${currentTrack.title} - ${artistName}` : currentTrack.title;
  }, [currentKey, currentTrack]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || "",
      artist: currentTrack.artist?.name || "",
      album: currentTrack.album || "",
      artwork: currentTrack.cover
        ? [
            { src: currentTrack.cover, sizes: "96x96", type: "image/jpeg" },
            { src: currentTrack.cover, sizes: "256x256", type: "image/jpeg" },
            { src: currentTrack.cover, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });
  }, [currentKey, currentTrack]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  useEffect(() => { setVolumeState(settings.volumeDefault ?? 0.7); }, []);
  const currentTrackHasLyrics = true;

  useEffect(() => {
    if (!authUser) { setLiked(new Set()); setPlaylists([]); return; }
    Api.likes().then((rows) => setLiked(new Set(rows.map((r) => String(r.video_id ?? r.videoId ?? r.id))))).catch(() => {});
    Api.playlists().then(setPlaylists).catch(() => {});
  }, [authUser]);

  const refreshPlaylists = useCallback(async () => {
    try { const rows = await Api.playlists(); setPlaylists(rows); } catch { }
  }, []);

  const registerProgressEl = useCallback((el, mode = "width") => {
    if (!el) return;
    progressElsRef.current.set(el, mode);
    return () => progressElsRef.current.delete(el);
  }, []);
  const writeProgress = useCallback((t, dur) => {
    const pct = dur > 0 ? clamp(t / dur, 0, 1) * 100 : 0;
    progressElsRef.current.forEach((mode, el) => {
      if (!el) return;
      if (mode === "left") el.style.left = `${pct}%`;
      // "fill" bars (mode === "width") dipakai buat progress bar yang di-update
      // 60x/detik lewat requestAnimationFrame selama lagu main (lihat useEffect
      // "tick" di bawah). Pakai transform: scaleX() alih-alih width supaya
      // browser cuma perlu compositing di GPU, bukan hitung ulang layout tiap
      // frame — animasi lain (scroll, transisi halaman) jadi nggak keteteran
      // pas lagu diputar. Visualnya sama persis, cuma jalurnya lebih murah.
      else el.style.transform = `scaleX(${pct / 100})`;
    });
  }, []);

  const resolveAudioSrc = useCallback(async (track) => {
    if (!track) return null;
    const wantFull = settings.audioQuality === "full";
    const fullSrcFor = async (videoId) => {
      try {
        return { src: await Api.getStreamUrl(videoId), preview: false };
      } catch { return null; }
    };

    if (wantFull) {
      let videoId = track.videoId;
      if (!videoId) {
        if (resolvedFullCache.current.has(track.id)) {
          videoId = resolvedFullCache.current.get(track.id);
        } else {
          try {
            const q = `${track.title} ${track.artist?.name || ""}`.trim();
            const results = await Api.search(q);
            // Jangan langsung ambil hasil pertama — pilih kandidat yang paling
            // mendekati rekaman official (lihat komentar di pickBestAudioMatch),
            // supaya timing lirik synced tidak telat karena beda versi.
            const best = pickBestAudioMatch(results, track);
            videoId = best?.videoId || results?.[0]?.videoId || null;
            resolvedFullCache.current.set(track.id, videoId);
          } catch { videoId = null; }
        }
      }
      if (videoId) {
        const full = await fullSrcFor(videoId);
        if (full) return full;
      }
    }

    if (track.preview) return { src: track.preview, preview: true };
    if (track.videoId) {
      const full = await fullSrcFor(track.videoId);
      if (full) return full;
    }
    return null;
  }, [settings.audioQuality]);

  const resumeAudioCtx = useCallback(() => {
    const graph = ensureAudioGraph();
    graph?.ctx?.resume?.().catch(() => {});
  }, [ensureAudioGraph]);

  useEffect(() => {
    const unlock = () => resumeAudioCtx();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [resumeAudioCtx]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentTrack) { audio.pause(); audio.removeAttribute("src"); setAudioFormat(null); return; }
    let cancelled = false;
    setLoadingAudio(true);
    resolveAudioSrc(currentTrack).then((resolved) => {
      if (cancelled) return;
      if (!resolved) {
        setLoadingAudio(false);
        pushToast(`${t("toastAudioUnavailable")} "${currentTrack.title}"`);
        return;
      }
      setIsPreviewClip(resolved.preview);
      const isNewSrc = audio.src !== resolved.src;
      if (isNewSrc) audio.src = resolved.src;
      setAudioFormat(null);
      detectAudioFormat(resolved.src).then((fmt) => {
        if (cancelled) return;
        setAudioFormat(fmt || "unavailable");
      });
      audio.volume = muted ? 0 : volume;
      wasFadedOutRef.current = false;
      const graph = ensureAudioGraph();
      if (graph && settings.crossfadeSeconds > 0 && !inRoom) {
        graph.fadeGain.gain.cancelScheduledValues(graph.ctx.currentTime);
        graph.fadeGain.gain.setValueAtTime(0, graph.ctx.currentTime);
        graph.fadeGain.gain.linearRampToValueAtTime(1, graph.ctx.currentTime + settings.crossfadeSeconds);
      } else if (graph) {
        graph.fadeGain.gain.cancelScheduledValues(graph.ctx.currentTime);
        graph.fadeGain.gain.setValueAtTime(1, graph.ctx.currentTime);
      }

      let shouldPlay = isPlaying;
      if (inRoom) {
        const sync = roomSyncRef.current;
        if (sync) {
          if (sync.hardSeek || isNewSrc) audio.currentTime = sync.position || 0;
          shouldPlay = isPlaying && sync.allowAutoplay;
        }
      }
      if (shouldPlay) { resumeAudioCtx(); audio.play().catch(() => {}); }
    });
    return () => { cancelled = true; };
  }, [currentKey]);

  useEffect(() => {
    if (!inRoom) return;
    const sync = roomSyncRef.current;
    const audio = audioRef.current;
    if (!sync || !audio || !currentTrack) return;
    const drift = Math.abs((audio.currentTime || 0) - (sync.position || 0));
    if (sync.hardSeek || drift > 1.5) audio.currentTime = sync.position || 0;
  }, [roomSyncTick, inRoom]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) { resumeAudioCtx(); audio.play().catch(() => {}); }
    else audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { retryCountRef.current = 0; }, [currentKey]);

  // Siapkan (prefetch) sumber lagu berikutnya di antrian selagi lagu sekarang
  // masih main. Tanpa ini, saat lagu habis, sistem baru mulai minta tiket
  // stream dari server SETELAH "ended" terjadi — dan di HP saat aplikasi
  // ada di background, network request semacam itu sering ditunda/lambat
  // oleh browser, jadi lagu berikutnya nggak kunjung mulai (kayak "berhenti").
  useEffect(() => {
    if (!currentTrack || inRoom || repeat === "one") return;
    const nextIdx = posInOrder + 1;
    if (nextIdx >= order.length) return;
    const nextTrack = queueList[order[nextIdx]];
    if (!nextTrack) return;
    let cancelled = false;
    resolveAudioSrc(nextTrack).then((resolved) => {
      if (cancelled || !resolved) return;
      // Actually start buffering the file itself (not just fetching the
      // stream ticket/URL) so the real handoff in the effect above can
      // start from a warm cache instead of a cold connection.
      const pre = preloadAudioRef.current;
      if (pre && pre.src !== resolved.src) {
        pre.src = resolved.src;
        try { pre.load(); } catch { }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentKey, posInOrder, order, queueList, inRoom, repeat, resolveAudioSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncDuration = () => {
      const d = audio.duration;
      if (isFinite(d) && d > 0) setClipDuration(d);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      writeProgress(audio.currentTime, audio.duration || clipDuration);
      const cf = settings.crossfadeSeconds || 0;
      if (cf > 0 && !inRoom && repeat !== "one" && !wasFadedOutRef.current) {
        const dur = audio.duration || clipDuration;
        if (isFinite(dur) && dur > 0 && dur - audio.currentTime <= cf) {
          const graph = audioGraphRef.current;
          if (graph) {
            wasFadedOutRef.current = true;
            graph.fadeGain.gain.cancelScheduledValues(graph.ctx.currentTime);
            graph.fadeGain.gain.setValueAtTime(graph.fadeGain.gain.value, graph.ctx.currentTime);
            graph.fadeGain.gain.linearRampToValueAtTime(0.001, graph.ctx.currentTime + Math.max(0.05, dur - audio.currentTime));
          }
        }
      }
    };
    const onEnded = () => {
      if (inRoom) return;
      if (repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      if (settings.autoplay === false) { setIsPlaying(false); pushToast(t("toastAutoplayOff")); return; }
      nextRef.current(true);
    };
    let stalledTimer = null;
    const clearStalledTimer = () => { if (stalledTimer) { clearTimeout(stalledTimer); stalledTimer = null; } };

    // Sumber audio (tiket stream) kadang kedaluwarsa atau koneksi putus di
    // tengah pemutaran, terutama di HP saat jaringan berpindah/di-throttle
    // di background. Kalau ini terjadi, coba ambil ulang src dan lanjutkan
    // dari posisi terakhir, bukan langsung diam/berhenti.
    const recoverPlayback = async () => {
      if (recoveringRef.current) return;
      if (retryCountRef.current >= 3) return;
      if (!currentTrack || inRoom) return;
      const resumeAt = audio.currentTime || 0;
      recoveringRef.current = true;
      retryCountRef.current += 1;
      try {
        const resolved = await resolveAudioSrc(currentTrack);
        if (!resolved) return;
        audio.src = resolved.src;
        audio.currentTime = resumeAt;
        if (isPlayingRef.current) {
          resumeAudioCtx();
          await audio.play().catch(() => {});
        }
      } catch {
        // biarkan, akan dicoba lagi kalau stalled/error muncul lagi
      } finally {
        recoveringRef.current = false;
      }
    };
    const onError = () => {
      setLoadingAudio(false);
      recoverPlayback();
    };
    const onStalled = () => {
      clearStalledTimer();
      stalledTimer = setTimeout(() => { recoverPlayback(); }, 6000);
    };
    const onCanPlay = () => { setLoadingAudio(false); retryCountRef.current = 0; clearStalledTimer(); };
    const onPlaying = () => { setLoadingAudio(false); retryCountRef.current = 0; clearStalledTimer(); };
    const onWaiting = () => {
      setLoadingAudio(true);
      clearStalledTimer();
      stalledTimer = setTimeout(() => { recoverPlayback(); }, 8000);
    };
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    return () => {
      clearStalledTimer();
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
    };
  }, [repeat, inRoom, writeProgress, settings.crossfadeSeconds, settings.autoplay, pushToast, t, clipDuration, currentTrack, resolveAudioSrc, resumeAudioCtx]);

  useEffect(() => {
    const onVisible = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.visibilityState !== "visible") return;
      // Balik dari background: pastikan AudioContext (dipakai untuk EQ/fade)
      // tidak nyangkut "suspended" oleh browser HP, kalau tidak lagu jadi
      // seperti berhenti padahal <audio> masih "playing".
      resumeAudioCtx();
      setCurrentTime(audio.currentTime);
      writeProgress(audio.currentTime, audio.duration || clipDuration);
      if (isFinite(audio.duration) && audio.duration > 0) setClipDuration(audio.duration);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [writeProgress, clipDuration, resumeAudioCtx]);

  // Watchdog buat playback di background: statechange & visibilitychange
  // kadang tidak cukup cepat (atau tidak fire sama sekali di sebagian
  // browser HP) buat nangkep AudioContext yang di-suspend/di-"interrupt"
  // pas layar dikunci / app dipindah ke belakang. Timer ini ngecek tiap
  // beberapa detik selama status play masih true: kalau context-nya tidak
  // "running", coba resume lagi; kalau elemen <audio>-nya sendiri ke-pause
  // (misal OS ngerebut audio focus sebentar), coba play() lagi juga. Dicek
  // juga saat balik ke foreground/tab fokus buat jaga-jaga race dengan
  // listener lain di atas.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const nudge = () => {
      if (!isPlayingRef.current) return;
      const graph = audioGraphRef.current;
      if (graph?.ctx && graph.ctx.state !== "running") graph.ctx.resume().catch(() => {});
      if (audio.paused) audio.play().catch(() => {});
    };
    const id = setInterval(nudge, 3000);
    document.addEventListener("visibilitychange", nudge);
    window.addEventListener("focus", nudge);
    window.addEventListener("pageshow", nudge);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", nudge);
      window.removeEventListener("focus", nudge);
      window.removeEventListener("pageshow", nudge);
    };
  }, []);

  useEffect(() => {
    let raf;
    function tick() {
      const audio = audioRef.current;
      if (audio && !audio.paused) writeProgress(audio.currentTime, audio.duration || clipDuration);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [writeProgress, clipDuration]);

  const buildOrder = useCallback((len, startIndex, shuf) => {
    const idxs = Array.from({ length: len }, (_, i) => i);
    if (!shuf) return idxs;
    const rest = idxs.filter((i) => i !== startIndex);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [startIndex, ...rest];
  }, []);

  const playList = useCallback((rawList, startIndex = 0, source = null) => {
    resumeAudioCtx();
    const list = rawList.map(normalizeTrack).filter(Boolean);
    if (!list.length) return;
    if (inRoom) {
      const baseIndex = room.queue?.length || 0;
      const safeStart = clamp(startIndex, 0, list.length - 1);
      list.forEach((t) => socketRef.current?.emit("queue-add", { roomId: room.id, song: t }));
      socketRef.current?.emit("playback-control", { roomId: room.id, action: "select", payload: { index: baseIndex + safeStart } });
      return;
    }
    const safeStart = clamp(startIndex, 0, list.length - 1);
    setQueueList(list);
    setOrder(buildOrder(list.length, safeStart, shuffle));

    setPosInOrder(shuffle ? 0 : safeStart);
    setIsPlaying(true);
    setPlaySource(source);
    if (authUser && settings.historyEnabled !== false) {
      const t = list[clamp(startIndex, 0, list.length - 1)];
      Api.addHistory(t.videoId || t.id, { title: t.title, artistName: t.artist?.name || null, thumbnail: t.cover, duration: t.duration }).catch(() => {});
    }
  }, [inRoom, room, buildOrder, shuffle, authUser, settings.historyEnabled, resumeAudioCtx]);

  const playSingle = useCallback((rawTrack, source = null) => {
    resumeAudioCtx();
    const track = normalizeTrack(rawTrack);
    if (!track) return;
    if (inRoom) {
      const existingIdx = room.queue?.findIndex((t) => String(t.id) === String(track.id) || (track.videoId && String(t.videoId) === String(track.videoId)));
      if (existingIdx !== undefined && existingIdx !== -1) {
        socketRef.current?.emit("playback-control", { roomId: room.id, action: "select", payload: { index: existingIdx } });
      } else {
        const newIndex = room.queue?.length || 0;
        socketRef.current?.emit("queue-add", { roomId: room.id, song: track });
        socketRef.current?.emit("playback-control", { roomId: room.id, action: "select", payload: { index: newIndex } });
      }
      return;
    }

    setPlaySource(source);
    const existingIdx = queueList.findIndex((t) => t.id === track.id);
    if (existingIdx !== -1) {
      const posInOrder = order.indexOf(existingIdx);
      if (posInOrder !== -1) { setPosInOrder(posInOrder); setIsPlaying(true); return; }
    }

    setQueueList([track]);
    setOrder([0]);
    setPosInOrder(0);
    setIsPlaying(true);
    if (authUser && settings.historyEnabled !== false) {
      Api.addHistory(track.videoId || track.id, { title: track.title, artistName: track.artist?.name || null, thumbnail: track.cover, duration: track.duration }).catch(() => {});
    }
  }, [inRoom, room, queueList, order, authUser, settings.historyEnabled, resumeAudioCtx]);

  const radioSeqRef = useRef(0);
  const playRadio = useCallback((rawTrack, source = null) => {
    resumeAudioCtx();
    const track = normalizeTrack(rawTrack);
    if (!track) return;
    if (inRoom) { playSingle(track, source); return; }

    const seq = ++radioSeqRef.current;
    setQueueList([track]);
    setOrder([0]);
    setPosInOrder(0);
    setIsPlaying(true);
    setPlaySource(source);
    if (authUser && settings.historyEnabled !== false) {
      Api.addHistory(track.videoId || track.id, { title: track.title, artistName: track.artist?.name || null, thumbnail: track.cover, duration: track.duration }).catch(() => {});
    }

    const similarArgs = track.source === "deezer"
      ? { trackId: track.id }
      : { title: track.title, artist: track.artist?.name || "" };

    Api.similar(similarArgs).then((res) => {
      if (seq !== radioSeqRef.current) return;
      const items = (res?.items || []).map(normalizeTrack).filter(Boolean).filter((t) => t.id !== track.id);
      if (!items.length) return;
      setQueueList((list) => {
        if (seq !== radioSeqRef.current || !(list.length === 1 && list[0].id === track.id)) return list;
        setOrder((ord) => {
          if (!(ord.length === 1 && ord[0] === 0)) return ord;
          const rest = items.map((_, i) => i + 1);
          if (shuffle) {
            for (let i = rest.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [rest[i], rest[j]] = [rest[j], rest[i]];
            }
          }
          return [0, ...rest];
        });
        return [...list, ...items];
      });
    }).catch(() => {});
  }, [inRoom, playSingle, authUser, settings.historyEnabled, shuffle, resumeAudioCtx]);

  const suggestSeqRef = useRef(0);
  useEffect(() => {
    if (inRoom || !currentTrack) { setSuggestedQueue([]); return; }
    const seq = ++suggestSeqRef.current;
    const seedTrack = currentTrack;
    const similarArgs = seedTrack.source === "deezer"
      ? { trackId: seedTrack.id }
      : { title: seedTrack.title, artist: seedTrack.artist?.name || "" };

    Api.similar(similarArgs).then((res) => {
      if (seq !== suggestSeqRef.current) return;
      const knownIds = new Set(queueList.map((t) => String(t.id)));
      const items = (res?.items || [])
        .map(normalizeTrack)
        .filter(Boolean)
        .filter((t) => t.id !== seedTrack.id && !knownIds.has(String(t.id)));
      setSuggestedQueue(items.slice(0, 5));
    }).catch(() => {
      if (seq !== suggestSeqRef.current) return;
      setSuggestedQueue([]);
    });
  }, [currentKey, inRoom]);

  const continueWithRadio = useCallback(() => {
    const rq = suggestedQueueRef.current;
    if (!rq.length) return false;
    const [nextTrack, ...rest] = rq;
    setSuggestedQueue(rest);
    setQueueList((list) => {
      const newList = [...list, nextTrack];
      setOrder((ord) => [...ord, newList.length - 1]);
      return newList;
    });
    setPosInOrder((p) => p + 1);
    setIsPlaying(true);
    if (authUser && settings.historyEnabled !== false) {
      Api.addHistory(nextTrack.videoId || nextTrack.id, { title: nextTrack.title, artistName: nextTrack.artist?.name || null, thumbnail: nextTrack.cover, duration: nextTrack.duration }).catch(() => {});
    }
    return true;
  }, [authUser, settings.historyEnabled]);

  const promoteSuggestion = useCallback((track) => {
    setSuggestedQueue((rq) => rq.filter((t) => t.id !== track.id));
    addToQueueEndRef.current?.(track);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    resumeAudioCtx();
    if (inRoom) {
      socketRef.current?.emit("playback-control", { roomId: room.id, action: isPlaying ? "pause" : "play" });
      return;
    }
    setIsPlaying((p) => !p);
  }, [currentTrack, inRoom, room, isPlaying, resumeAudioCtx]);

  const next = useCallback((auto = false) => {
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "next" }); return; }
    const isLast = posInOrder >= order.length - 1;
    if (isLast) {
      if (repeat === "all" && order.length) { setPosInOrder(0); return; }
      if (repeat !== "one" && settings.autoplay !== false && continueWithRadio()) return;
      if (!auto) return;
      setIsPlaying(false);
      return;
    }
    setPosInOrder((p) => p + 1);
  }, [inRoom, room, order.length, posInOrder, repeat, settings.autoplay, continueWithRadio]);
  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [next]);

  const prev = useCallback(() => {
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "prev" }); return; }
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    setPosInOrder((p) => (p <= 0 ? (repeat === "all" ? Math.max(order.length - 1, 0) : 0) : p - 1));
  }, [inRoom, room, order.length, repeat]);

  const seekRatio = useCallback((ratio) => {
    const audio = audioRef.current;
    if (!audio) return;
    // audio.duration bisa Infinity (stream tanpa Content-Length yang jelas,
    // masih umum kejadian sesaat sebelum metadata penuh ke-load) — Infinity
    // itu truthy, jadi "audio.duration || clipDuration" SALAH nganggep itu
    // durasi valid, lalu ratio * Infinity = Infinity, dan
    // audio.currentTime = Infinity otomatis ditolak browser -> seek diam
    // aja / ga ngefek. Makanya harus filter pakai Number.isFinite dulu, baru
    // fallback ke clipDuration (durasi asli dari metadata track).
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (clipDuration || 0);
    if (!dur) return; // durasi belum diketahui sama sekali, jangan seek ke posisi ngasal
    const t = clamp(ratio, 0, 1) * dur;
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "seek", payload: { position: t } }); return; }
    audio.currentTime = t;
    setCurrentTime(t);
    writeProgress(t, dur);
  }, [inRoom, room, clipDuration, writeProgress]);

  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    // Sama seperti seekRatio: jangan biarkan Infinity lolos jadi "durasi valid".
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (clipDuration || 0);
    const t = clamp(seconds, 0, dur || seconds);
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "seek", payload: { position: t } }); return; }
    audio.currentTime = t;
    setCurrentTime(t);
    writeProgress(t, dur);
  }, [inRoom, room, clipDuration, writeProgress]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const safe = (fn) => (...args) => { try { fn(...args); } catch {} };
    ms.setActionHandler("play", safe(() => { if (!isPlaying) togglePlay(); }));
    ms.setActionHandler("pause", safe(() => { if (isPlaying) togglePlay(); }));
    ms.setActionHandler("previoustrack", safe(() => prev()));
    ms.setActionHandler("nexttrack", safe(() => next()));
    ms.setActionHandler("seekto", safe((details) => {
      if (details?.seekTime != null) seekTo(details.seekTime);
    }));
    ms.setActionHandler("stop", safe(() => { if (isPlaying) togglePlay(); }));
    return () => {
      try {
        ms.setActionHandler("play", null);
        ms.setActionHandler("pause", null);
        ms.setActionHandler("previoustrack", null);
        ms.setActionHandler("nexttrack", null);
        ms.setActionHandler("seekto", null);
        ms.setActionHandler("stop", null);
      } catch {}
    };
  }, [isPlaying, togglePlay, prev, next, seekTo]);

  const toggleShuffle = useCallback(() => {
    setShuffle((s) => {
      const ns = !s;
      if (queueList.length) {
        const curListIdx = order[posInOrder];
        setOrder(buildOrder(queueList.length, curListIdx, ns));
        setPosInOrder(0);
      }
      return ns;
    });
  }, [queueList.length, order, posInOrder, buildOrder]);

  const cycleRepeat = useCallback(() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off")), []);
  const setVolume = useCallback((v) => { setVolumeState(clamp(v, 0, 1)); if (v > 0) setMuted(false); }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const toggleLike = useCallback(async (track) => {
    if (!authUser) { pushToast(t("toastLoginToSave")); return; }
    const key = String(track.videoId || track.id);
    const willLike = !liked.has(key);
    setLiked((prev) => { const n = new Set(prev); willLike ? n.add(key) : n.delete(key); return n; });
    pushToast(`${willLike ? t("toastAddedLiked") : t("toastRemovedLiked")} — ${track.title}`);
    try {
      if (willLike) await Api.like(key, { title: track.title, artistName: track.artist?.name || null, thumbnail: track.cover, duration: track.duration });
      else await Api.unlike(key);
    } catch { pushToast(t("toastLikeFailed")); }
  }, [authUser, liked, pushToast, t]);

  const addToQueueEnd = useCallback((rawTrack) => {
    const track = normalizeTrack(rawTrack);
    if (!track) return;
    setSuggestedQueue((rq) => rq.filter((t) => t.id !== track.id));
    if (inRoom) { socketRef.current?.emit("queue-add", { roomId: room.id, song: track }); pushToast(`${t("toastAddedRoomQueue")} — ${track.title}`); return; }
    setQueueList((list) => {
      const newList = [...list, track];
      setOrder((ord) => [...ord, newList.length - 1]);
      return newList;
    });
    pushToast(`${t("toastAddedQueue")} — ${track.title}`);
  }, [inRoom, room, pushToast, t]);
  useEffect(() => { addToQueueEndRef.current = addToQueueEnd; }, [addToQueueEnd]);

  const playNextInQueue = useCallback((rawTrack) => {
    const track = normalizeTrack(rawTrack);
    if (inRoom) { addToQueueEnd(track); return; }
    setQueueList((list) => {
      const newList = [...list, track];
      setOrder((ord) => { const c = [...ord]; c.splice(posInOrder + 1, 0, newList.length - 1); return c; });
      return newList;
    });
    pushToast(`${t("toastPlayAfterThis")} — ${track.title}`);
  }, [inRoom, addToQueueEnd, posInOrder, pushToast, t]);

  const addAllToQueueEnd = useCallback((rawTracks) => {
    const tracks = (rawTracks || []).map(normalizeTrack).filter(Boolean);
    if (!tracks.length) return;
    if (inRoom) { tracks.forEach((track) => socketRef.current?.emit("queue-add", { roomId: room.id, song: track })); pushToast(t("toastAddedQueue")); return; }
    setQueueList((list) => {
      const newList = [...list, ...tracks];
      setOrder((ord) => [...ord, ...tracks.map((_, i) => list.length + i)]);
      return newList;
    });
    pushToast(t("toastAddedQueue"));
  }, [inRoom, room, pushToast, t]);

  const playAllNext = useCallback((rawTracks) => {
    const tracks = (rawTracks || []).map(normalizeTrack).filter(Boolean);
    if (!tracks.length) return;
    if (inRoom) { addAllToQueueEnd(tracks); return; }
    setQueueList((list) => {
      const newList = [...list, ...tracks];
      setOrder((ord) => {
        const c = [...ord];
        const inserted = tracks.map((_, i) => list.length + i);
        c.splice(posInOrder + 1, 0, ...inserted);
        return c;
      });
      return newList;
    });
    pushToast(t("toastPlayAfterThis"));
  }, [inRoom, addAllToQueueEnd, posInOrder, pushToast, t]);

  const removeFromQueue = useCallback((upNextIndex) => {
    if (inRoom) {
      const absolutePos = (room?.currentIndex ?? -1) + 1 + upNextIndex;
      socketRef.current?.emit("queue-remove", { roomId: room.id, position: absolutePos });
      return;
    }
    setOrder((ord) => {
      const absolutePos = posInOrder + 1 + upNextIndex;
      return ord.filter((_, i) => i !== absolutePos);
    });
  }, [inRoom, room, posInOrder]);

  const moveQueueItem = useCallback((fromUpNextIndex, toUpNextIndex) => {
    if (fromUpNextIndex === toUpNextIndex) return;
    if (inRoom) {
      const base = (room?.currentIndex ?? -1) + 1;
      socketRef.current?.emit("queue-reorder", { roomId: room.id, from: base + fromUpNextIndex, to: base + toUpNextIndex });
      return;
    }
    setOrder((ord) => {
      const base = posInOrder + 1;
      const next = [...ord];
      const [moved] = next.splice(base + fromUpNextIndex, 1);
      if (moved === undefined) return ord;
      next.splice(base + toUpNextIndex, 0, moved);
      return next;
    });
  }, [inRoom, room, posInOrder]);

  const selectQueuePosition = useCallback((absolutePosition) => {
    if (inRoom) {
      socketRef.current?.emit("playback-control", { roomId: room.id, action: "select", payload: { index: absolutePosition } });
      return;
    }
    setPosInOrder(clamp(absolutePosition, 0, Math.max(order.length - 1, 0)));
    setIsPlaying(true);
  }, [inRoom, room, order.length]);

  const clearUpNext = useCallback(() => {
    if (inRoom) { socketRef.current?.emit("queue-clear", { roomId: room.id }); pushToast(t("toastQueueCleared")); return; }
    setOrder((ord) => ord.slice(0, posInOrder + 1));
    pushToast(t("toastQueueCleared"));
  }, [inRoom, room, posInOrder, pushToast, t]);

  const createPlaylist = useCallback(async (name, description) => {
    if (!authUser) { pushToast(t("toastLoginToCreatePlaylist")); return null; }
    try {
      const pl = await Api.createPlaylist({ name, description, isPublic: false });
      setPlaylists((p) => [...p, { ...pl, songs: [] }]);
      pushToast(`${t("toastPlaylistCreated")} "${name}"`);
      return pl.id;
    } catch { pushToast(t("toastPlaylistCreateFailed")); return null; }
  }, [authUser, pushToast, t]);

  const setPlaylistDetail = useCallback((detail) => {

    const songs = (detail.songs || []).map((s) => ({
      id: s.video_id,
      videoId: s.video_id,
      title: s.title,
      artist: s.artist_name ? { name: s.artist_name } : null,
      cover: s.thumbnail,
      duration: s.duration,
    }));
    setPlaylists((list) => {
      const exists = list.some((pl) => String(pl.id) === String(detail.id));
      if (exists) return list.map((pl) => String(pl.id) === String(detail.id) ? { ...pl, ...detail, songs } : pl);
      return [...list, { ...detail, songs }];
    });
  }, []);

  const addToPlaylist = useCallback(async (playlistId, rawTrack) => {
    const track = normalizeTrack(rawTrack);
    const key = track.videoId || track.id;

    setPlaylists((list) => list.map((pl) => (pl.id === playlistId && !pl.songs?.some((s) => (s.videoId || s.id) === key)
      ? { ...pl, songs: [...(pl.songs || []), track] } : pl)));
    try {
      await Api.addSong(playlistId, key, { title: track.title, artistName: track.artist?.name || null, thumbnail: track.cover, duration: track.duration });
      pushToast(t("toastAddedToPlaylist"));
    } catch { pushToast(t("toastAddToPlaylistFailed")); }
  }, [pushToast, t]);

  const removeFromPlaylist = useCallback(async (playlistId, trackId) => {
    setPlaylists((list) => list.map((pl) => (pl.id === playlistId ? { ...pl, songs: pl.songs.filter((s) => s.id !== trackId) } : pl)));
    try { await Api.removeSong(playlistId, trackId); } catch { pushToast(t("toastRemoveFromPlaylistFailed")); }
  }, [pushToast, t]);

  const deletePlaylist = useCallback(async (playlistId) => {
    setPlaylists((list) => list.filter((p) => p.id !== playlistId));
    try { await Api.deletePlaylist(playlistId); pushToast(t("toastPlaylistDeleted")); } catch { pushToast(t("toastPlaylistDeleteFailed")); }
  }, [pushToast, t]);

  const setPlaylistCover = useCallback(async (playlistId, thumbnailUrl, videoId = null) => {
    const prev = playlists.find((p) => String(p.id) === String(playlistId));
    const prevCover = prev?.cover_thumbnail;
    setPlaylists((list) => list.map((pl) => (String(pl.id) === String(playlistId) ? { ...pl, cover_thumbnail: thumbnailUrl } : pl)));
    try {
      await Api.updatePlaylist(playlistId, { coverThumbnail: thumbnailUrl, coverVideoId: videoId });
      pushToast(t("coverUpdatedToast"));
    } catch {
      setPlaylists((list) => list.map((pl) => (String(pl.id) === String(playlistId) ? { ...pl, cover_thumbnail: prevCover } : pl)));
      pushToast(t("coverUpdateFailedToast"));
    }
  }, [playlists, pushToast, t]);

  const updatePlaylistMeta = useCallback(async (playlistId, { name, description, isPublic } = {}) => {
    const prev = playlists.find((p) => String(p.id) === String(playlistId));
    if (!prev) return false;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (description !== undefined) patch.description = description;
    if (isPublic !== undefined) patch.isPublic = isPublic;
    setPlaylists((list) => list.map((pl) => (String(pl.id) === String(playlistId) ? {
      ...pl,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isPublic !== undefined ? { is_public: isPublic } : {}),
    } : pl)));
    try {
      await Api.updatePlaylist(playlistId, patch);
      pushToast(t("playlistUpdatedToast"));
      return true;
    } catch {
      setPlaylists((list) => list.map((pl) => (String(pl.id) === String(playlistId) ? prev : pl)));
      pushToast(t("playlistUpdateFailedToast"));
      return false;
    }
  }, [playlists, pushToast, t]);

  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const authUserRef = useRef(authUser);
  useEffect(() => { authUserRef.current = authUser; }, [authUser]);
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  const prevMemberCountRef = useRef(0);
  const firstSyncPendingRef = useRef(false);

  const applyRoomState = useCallback((fullRoom, action) => {
    const isFirstSync = firstSyncPendingRef.current;
    firstSyncPendingRef.current = false;
    const allowAutoplay = !isFirstSync || settingsRef.current.autoJoinRoomAudio !== false;
    const hardSeek = isFirstSync || ["seek", "select", "next", "prev"].includes(action);

    roomSyncRef.current = { position: fullRoom.position || 0, hardSeek, allowAutoplay };
    setRoomSyncTick((v) => v + 1);

    if (isFirstSync) setChatMessages(Array.isArray(fullRoom.chatMessages) ? fullRoom.chatMessages : []);
    setRoom(fullRoom);
    prevMemberCountRef.current = fullRoom.members?.length || 0;
    setQueueList(fullRoom.queue.map(normalizeTrack));
    setOrder(fullRoom.queue.map((_, i) => i));
    setPosInOrder(fullRoom.currentIndex >= 0 ? fullRoom.currentIndex : 0);
    setIsPlaying(isFirstSync ? (fullRoom.isPlaying && allowAutoplay) : fullRoom.isPlaying);
  }, []);

  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const socket = io(API_BASE, { withCredentials: true, autoConnect: true, transports: ["websocket", "polling"] });
    socket.on("members-updated", (members) => {
      setRoom((r) => {
        if (!r) return r;
        const isHost = authUserRef.current && r.hostId === authUserRef.current.id;
        if (isHost && settingsRef.current.notifyRoomInvite !== false && members.length > prevMemberCountRef.current && prevMemberCountRef.current > 0) {
          const joined = members.find((m) => !r.members?.some((old) => old.id === m.id));
          if (joined) pushToast(`${joined.username} ${tRef.current("toastMemberJoined")}`);
        }
        prevMemberCountRef.current = members.length;
        return { ...r, members };
      });
    });
    socket.on("queue-updated", ({ queue, currentIndex }) => {
      setRoom((r) => (r ? { ...r, queue, currentIndex } : r));
      setQueueList(queue.map(normalizeTrack));
      setOrder(queue.map((_, i) => i));
      setPosInOrder(currentIndex >= 0 ? currentIndex : 0);
    });
    socket.on("playback-sync", (fullRoom) => { applyRoomState(fullRoom, fullRoom.action); });
    socket.on("skip-vote-updated", ({ count, total, needed }) => {
      setRoom((r) => (r ? { ...r, skipVote: { count, total, needed } } : r));
    });
    socket.on("chat-message", (msg) => {
      setChatMessages((prev) => {
        const next = [...prev, msg];
        return next.length > 300 ? next.slice(-300) : next;
      });
    });
    socketRef.current = socket;
    return socket;
  }, [applyRoomState]);

  const refreshPublicRooms = useCallback(() => { Api.publicRooms().then(setPublicRooms).catch(() => {}); }, []);

  const createRoom = useCallback((opts) => new Promise((resolve) => {
    if (!authUser) { pushToast(t("toastLoginToCreateRoom")); resolve(null); return; }
    const socket = ensureSocket();
    firstSyncPendingRef.current = true;
    socket.emit("create-room", opts, (res) => {
      if (res.error) { setRoomError(res.error); pushToast(res.error); resolve(null); return; }
      setRoomError(null);
      applyRoomState(res.room, "select");
      resolve(res.room);
    });
  }), [authUser, ensureSocket, applyRoomState, pushToast, t]);

  const joinRoom = useCallback((id, password) => new Promise((resolve) => {
    if (!authUser) { pushToast(t("toastLoginToJoinRoom")); resolve(null); return; }
    const socket = ensureSocket();
    firstSyncPendingRef.current = true;
    socket.emit("join-room", { roomId: id, password }, (res) => {
      if (res.error) { setRoomError(res.error); resolve(null); return; }
      setRoomError(null);
      applyRoomState(res.room, "select");
      resolve(res.room);
    });
  }), [authUser, ensureSocket, applyRoomState, pushToast, t]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("leave-room");
    setRoom(null);
    roomSyncRef.current = null;
    setQueueList([]); setOrder([]); setPosInOrder(0); setIsPlaying(false);
    setChatMessages([]);
  }, []);

  const sendChatMessage = useCallback((text, extra = {}) => {
    if (!room || !authUser) return;
    const payload = { roomId: room.id, ...extra };
    const trimmed = (text || "").trim();
    if (trimmed) payload.text = trimmed.slice(0, 500);
    socketRef.current?.emit("chat-message", payload);
  }, [room, authUser]);

  const voteSkip = useCallback(() => new Promise((resolve) => {
    if (!room || !authUser) { resolve(null); return; }
    socketRef.current?.emit("skip-vote", { roomId: room.id }, (res) => resolve(res || null));
  }), [room, authUser]);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const upNext = useMemo(() => order.slice(posInOrder + 1).map((i) => queueList[i]).filter(Boolean), [order, posInOrder, queueList]);
  const history = useMemo(() => order.slice(0, posInOrder).map((i) => queueList[i]).filter(Boolean), [order, posInOrder, queueList]);

  const value = {
    queueList, order, posInOrder, currentTrack, upNext, history,
    currentTrackHasLyrics, playSource,
    isPlaying, currentTime, duration: clipDuration, isPreviewClip, audioFormat, loadingAudio,
    volume, muted, shuffle, repeat, liked, playlists,
    playList, togglePlay, next, prev, seekRatio, seekTo, toggleShuffle, cycleRepeat,
    setVolume, toggleMute, toggleLike, addToQueueEnd, playNextInQueue, addAllToQueueEnd, playAllNext,
    removeFromQueue, moveQueueItem, clearUpNext, selectQueuePosition,
    playSingle, playRadio, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, setPlaylistDetail, setPlaylistCover, updatePlaylistMeta, refreshPlaylists,
    registerProgressEl,
    suggestedQueue, promoteSuggestion,
    room, publicRooms, roomError, refreshPublicRooms, createRoom, joinRoom, leaveRoom,
    chatMessages, sendChatMessage, voteSkip,
    promptCast, getAudioSrc,
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}