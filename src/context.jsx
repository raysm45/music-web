import React, {
  createContext, useContext, useState, useEffect, useRef, useMemo, useCallback,
} from "react";
import { io } from "socket.io-client";
import { Api, API_BASE } from "./lib/api.js";
import { clamp, uid, debounce } from "./lib/utils.js";
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

  const refreshPlaylists = useCallback(async (}
