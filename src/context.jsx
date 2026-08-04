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

const UICtx = createContext(null);
export function useUI() { return useContext(UICtx); }

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
  const [lyricsOpen, setLyricsOpen] = useState(false);

  useEffect(() => {
    Api.me()
      .then((u) => setAuthUser(u))
      .catch(() => setAuthUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authUser) return;
    Api.getSettings()
      .then((s) => { setSettings(s); setTheme(s.theme === "light" ? "light" : "dark"); })
      .catch(() => {});
  }, [authUser]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
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

  const t = useCallback((key, fallback) => makeT(settings.language)(key, fallback), [settings.language]);

  const pushToast = useCallback((message) => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const login = useCallback(() => { window.location.href = Api.discordLoginUrl(); }, []);
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
    if (patch.theme) setTheme(patch.theme === "light" ? "light" : "dark");
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

  const openLyrics = useCallback(() => setLyricsOpen(true), []);
  const closeLyrics = useCallback(() => setLyricsOpen(false), []);
  const toggleLyrics = useCallback(() => setLyricsOpen((o) => !o), []);

  const value = {
    authUser, authChecked, login, logout, loggingOut,
    settings, updateSettings, resetSettings,
    theme, toggleTheme, t,
    toasts, pushToast,
    contextMenu, openContextMenu, closeContextMenu,
    addToPlaylistTarget, openAddToPlaylist, closeAddToPlaylist,
    lyricsOpen, openLyrics, closeLyrics, toggleLyrics,
  };
  return <UICtx.Provider value={value}>{children}</UICtx.Provider>;
}

const PlayerCtx = createContext(null);
export function usePlayer() { return useContext(PlayerCtx); }

function normalizeTrack(raw) {
  if (!raw) return null;
  if (raw.videoId && !raw.id) {
    return {
      id: raw.videoId, videoId: raw.videoId, title: raw.title,
      artist: null, album: null, cover: raw.thumbnail || null,
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

  const audioGraphRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const wasFadedOutRef = useRef(false);

  const [room, setRoom] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomError, setRoomError] = useState(null);
  const [roomSyncTick, setRoomSyncTick] = useState(0);
  const roomSyncRef = useRef(null);
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

  useEffect(() => { setVolumeState(settings.volumeDefault ?? 0.7); }, []);

  const [currentTrackHasLyrics, setCurrentTrackHasLyrics] = useState(true);
  const lyricsCheckSeqRef = useRef(0);
  useEffect(() => {
    if (!currentTrack) { setCurrentTrackHasLyrics(true); return; }
    const seq = ++lyricsCheckSeqRef.current;
    setCurrentTrackHasLyrics(true);
    Api.lyrics({ title: currentTrack.title, artist: currentTrack.artist?.name, duration: currentTrack.duration })
      .then((res) => {
        if (seq !== lyricsCheckSeqRef.current) return;
        setCurrentTrackHasLyrics(!!(res?.synced || res?.plain));
      })
      .catch(() => {
        if (seq !== lyricsCheckSeqRef.current) return;
        setCurrentTrackHasLyrics(true);
      });
  }, [currentKey]);

  useEffect(() => {
    if (!authUser) { setLiked(new Set()); setPlaylists([]); return; }
    Api.likes().then((rows) => setLiked(new Set(rows.map((r) => String(r.videoId || r.id))))).catch(() => {});
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
      else el.style.width = `${pct}%`;
    });
  }, []);

  const resolveAudioSrc = useCallback(async (track) => {
    if (!track) return null;
    const wantFull = settings.audioQuality === "full";

    if (wantFull) {
      let videoId = track.videoId;
      if (!videoId) {
        if (resolvedFullCache.current.has(track.id)) {
          videoId = resolvedFullCache.current.get(track.id);
        } else {
          try {
            const q = `${track.title} ${track.artist?.name || ""}`.trim();
            const results = await Api.search(q);
            videoId = results?.[0]?.videoId || null;
            resolvedFullCache.current.set(track.id, videoId);
          } catch { videoId = null; }
        }
      }
      if (videoId) return { src: Api.streamUrl(videoId), preview: false };

    }

    if (track.preview) return { src: track.preview, preview: true };
    if (track.videoId) return { src: Api.streamUrl(track.videoId), preview: false };
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
    if (!currentTrack) { audio.pause(); audio.removeAttribute("src"); return; }
    let cancelled = false;
    setLoadingAudio(true);
    resolveAudioSrc(currentTrack).then((resolved) => {
      if (cancelled) return;
      setLoadingAudio(false);
      if (!resolved) {
        pushToast(`${t("toastAudioUnavailable")} "${currentTrack.title}"`);
        return;
      }
      setIsPreviewClip(resolved.preview);
      const isNewSrc = audio.src !== resolved.src;
      if (isNewSrc) audio.src = resolved.src;
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
    const onError = () => { setLoadingAudio(false); };
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [repeat, inRoom, writeProgress, settings.crossfadeSeconds, settings.autoplay, pushToast, t, clipDuration]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const audio = audioRef.current;
      if (!audio) return;
      setCurrentTime(audio.currentTime);
      writeProgress(audio.currentTime, audio.duration || clipDuration);
      if (isFinite(audio.duration) && audio.duration > 0) setClipDuration(audio.duration);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [writeProgress, clipDuration]);

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

  const playList = useCallback((rawList, startIndex = 0) => {
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
    if (authUser && settings.historyEnabled !== false) {
      const t = list[clamp(startIndex, 0, list.length - 1)];
      Api.addHistory(t.videoId || t.id, { title: t.title, artistName: t.artist?.name || null, thumbnail: t.cover, duration: t.duration }).catch(() => {});
    }
  }, [inRoom, room, buildOrder, shuffle, authUser, settings.historyEnabled, resumeAudioCtx]);

  const playSingle = useCallback((rawTrack) => {
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
  const playRadio = useCallback((rawTrack) => {
    resumeAudioCtx();
    const track = normalizeTrack(rawTrack);
    if (!track) return;
    if (inRoom) { playSingle(track); return; }

    const seq = ++radioSeqRef.current;
    setQueueList([track]);
    setOrder([0]);
    setPosInOrder(0);
    setIsPlaying(true);
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
      setSuggestedQueue(items.slice(0, 12));
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
    const dur = audio.duration || clipDuration || 0;
    const t = clamp(ratio, 0, 1) * dur;
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "seek", payload: { position: t } }); return; }
    audio.currentTime = t;
    setCurrentTime(t);
    writeProgress(t, dur);
  }, [inRoom, room, clipDuration, writeProgress]);

  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const dur = audio.duration || clipDuration || 0;
    const t = clamp(seconds, 0, dur || seconds);
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "seek", payload: { position: t } }); return; }
    audio.currentTime = t;
    setCurrentTime(t);
    writeProgress(t, dur);
  }, [inRoom, room, clipDuration, writeProgress]);

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
      cover: s.thumbnail,
      duration: s.duration,
    }));
    setPlaylists((list) =>
      list.map((pl) => String(pl.id) === String(detail.id) ? { ...pl, ...detail, songs } : pl)
    );
  }, []);

  const addToPlaylist = useCallback(async (playlistId, rawTrack) => {
    const track = normalizeTrack(rawTrack);
    const key = track.videoId || track.id;

    setPlaylists((list) => list.map((pl) => (pl.id === playlistId && !pl.songs?.some((s) => (s.videoId || s.id) === key)
      ? { ...pl, songs: [...(pl.songs || []), track] } : pl)));
    try {
      await Api.addSong(playlistId, key, { title: track.title, thumbnail: track.cover, duration: track.duration });
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
  }, []);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const upNext = useMemo(() => order.slice(posInOrder + 1).map((i) => queueList[i]).filter(Boolean), [order, posInOrder, queueList]);
  const history = useMemo(() => order.slice(0, posInOrder).map((i) => queueList[i]).filter(Boolean), [order, posInOrder, queueList]);

  const value = {
    queueList, order, posInOrder, currentTrack, upNext, history,
    currentTrackHasLyrics,
    isPlaying, currentTime, duration: clipDuration, isPreviewClip, loadingAudio,
    volume, muted, shuffle, repeat, liked, playlists,
    playList, togglePlay, next, prev, seekRatio, seekTo, toggleShuffle, cycleRepeat,
    setVolume, toggleMute, toggleLike, addToQueueEnd, playNextInQueue,
    removeFromQueue, moveQueueItem, clearUpNext, selectQueuePosition,
    playSingle, playRadio, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, setPlaylistDetail, refreshPlaylists,
    registerProgressEl,
    suggestedQueue, promoteSuggestion,
    room, publicRooms, roomError, refreshPublicRooms, createRoom, joinRoom, leaveRoom,
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}