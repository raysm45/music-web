import React, {
  createContext, useContext, useState, useEffect, useRef, useMemo, useCallback,
} from "react";
import { io } from "socket.io-client";
import { Api, API_BASE } from "./lib/api.js";
import { clamp, uid } from "./lib/utils.js";

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
};

export function UIProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState("dark");
  const [toasts, setToasts] = useState([]);
  const [contextMenu, setContextMenu] = useState(null); 
  const [addToPlaylistTarget, setAddToPlaylistTarget] = useState(null);

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

  const pushToast = useCallback((message) => {
    const id = uid("toast");
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const login = useCallback(() => { window.location.href = Api.discordLoginUrl(); }, []);
  const logout = useCallback(async () => {
    try { await Api.logout(); } catch {  }
    setAuthUser(null);
    pushToast("Sampai ketemu lagi");
  }, [pushToast]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (patch.theme) setTheme(patch.theme === "light" ? "light" : "dark");
    try { await Api.putSettings(patch); } catch { pushToast("Gagal nyimpen setting ke server"); }
  }, [pushToast]);

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

  const value = {
    authUser, authChecked, login, logout,
    settings, updateSettings, resetSettings,
    theme, toggleTheme,
    toasts, pushToast,
    contextMenu, openContextMenu, closeContextMenu,
    addToPlaylistTarget, openAddToPlaylist, closeAddToPlaylist,
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
  const { authUser, settings, pushToast } = useUI();

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

  
  const [room, setRoom] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomError, setRoomError] = useState(null);
  const socketRef = useRef(null);
  const applyingRemoteRef = useRef(false);

  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio() : null);
  const progressElsRef = useRef(new Set());
  const resolvedFullCache = useRef(new Map());

  const currentTrack = queueList.length && order.length ? queueList[order[posInOrder]] : null;
  const currentKey = currentTrack ? currentTrack.id : null;
  const inRoom = !!room;

  useEffect(() => { setVolumeState(settings.volumeDefault ?? 0.7); }, []); 

  
  useEffect(() => {
    if (!authUser) { setLiked(new Set()); setPlaylists([]); return; }
    Api.likes().then((rows) => setLiked(new Set(rows.map((r) => String(r.videoId || r.id))))).catch(() => {});
    Api.playlists().then(setPlaylists).catch(() => {});
  }, [authUser]);

  const registerProgressEl = useCallback((el) => {
    if (!el) return;
    progressElsRef.current.add(el);
    return () => progressElsRef.current.delete(el);
  }, []);
  const writeProgress = useCallback((t, dur) => {
    const pct = dur > 0 ? clamp(t / dur, 0, 1) * 100 : 0;
    progressElsRef.current.forEach((el) => { if (el) el.style.width = `${pct}%`; });
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
        pushToast(`Audio ga tersedia buat "${currentTrack.title}"`);
        return;
      }
      setIsPreviewClip(resolved.preview);
      if (audio.src !== resolved.src) audio.src = resolved.src;
      audio.volume = muted ? 0 : volume;
      if (isPlaying) audio.play().catch(() => {});
    });
    return () => { cancelled = true; };
  }, [currentKey]); 

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]); 

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setClipDuration(audio.duration || 0);
    const onEnded = () => {
      if (inRoom) return; 
      if (repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      nextRef.current(true);
    };
    const onError = () => { setLoadingAudio(false); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [repeat, inRoom]); 

  
  useEffect(() => {
    let raf; let lastState = 0;
    function tick(ts) {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        writeProgress(audio.currentTime, audio.duration || clipDuration);
        if (ts - lastState > 220) { lastState = ts; setCurrentTime(audio.currentTime); }
      }
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
    const list = rawList.map(normalizeTrack).filter(Boolean);
    if (!list.length) return;
    if (inRoom) {
      
      list.forEach((t) => socketRef.current?.emit("queue-add", { roomId: room.id, song: t }));
      socketRef.current?.emit("playback-control", { roomId: room.id, action: "select", payload: { index: startIndex } });
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
  }, [inRoom, room, buildOrder, shuffle, authUser, settings.historyEnabled]);

  
  
  
  const playSingle = useCallback((rawTrack) => {
    const track = normalizeTrack(rawTrack);
    if (!track) return;
    if (inRoom) {
      socketRef.current?.emit("queue-add", { roomId: room.id, song: track });
      socketRef.current?.emit("playback-control", { roomId: room.id, action: "select", payload: { index: 0 } });
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
      Api.addHistory(track.videoId || track.id, { title: track.title, thumbnail: track.cover, duration: track.duration }).catch(() => {});
    }
  }, [inRoom, room, queueList, order, authUser, settings.historyEnabled]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    if (inRoom) {
      socketRef.current?.emit("playback-control", { roomId: room.id, action: isPlaying ? "pause" : "play" });
      return;
    }
    setIsPlaying((p) => !p);
  }, [currentTrack, inRoom, room, isPlaying]);

  const next = useCallback((auto = false) => {
    if (inRoom) { socketRef.current?.emit("playback-control", { roomId: room.id, action: "next" }); return; }
    setPosInOrder((p) => {
      const isLast = p >= order.length - 1;
      if (isLast) {
        if (repeat === "all" && order.length) return 0;
        if (!auto) return p;
        setIsPlaying(false);
        return p;
      }
      return p + 1;
    });
  }, [inRoom, room, order.length, repeat]);
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
    if (!authUser) { pushToast("Login dulu buat nyimpen lagu"); return; }
    const key = String(track.videoId || track.id);
    const willLike = !liked.has(key);
    setLiked((prev) => { const n = new Set(prev); willLike ? n.add(key) : n.delete(key); return n; });
    pushToast(willLike ? `Ditambahin ke Disukai — ${track.title}` : `Dihapus dari Disukai — ${track.title}`);
    try {
      if (willLike) await Api.like(key, { title: track.title, artistName: track.artist?.name || null, thumbnail: track.cover, duration: track.duration });
      else await Api.unlike(key);
    } catch { pushToast("Gagal nyimpen ke server, coba lagi"); }
  }, [authUser, liked, pushToast]);

  const addToQueueEnd = useCallback((rawTrack) => {
    const track = normalizeTrack(rawTrack);
    if (inRoom) { socketRef.current?.emit("queue-add", { roomId: room.id, song: track }); pushToast(`Ditambahin ke antrean ruang — ${track.title}`); return; }
    setQueueList((list) => {
      const newList = [...list, track];
      setOrder((ord) => [...ord, newList.length - 1]);
      return newList;
    });
    pushToast(`Ditambahin ke antrean — ${track.title}`);
  }, [inRoom, room, pushToast]);

  const playNextInQueue = useCallback((rawTrack) => {
    const track = normalizeTrack(rawTrack);
    if (inRoom) { addToQueueEnd(track); return; }
    setQueueList((list) => {
      const newList = [...list, track];
      setOrder((ord) => { const c = [...ord]; c.splice(posInOrder + 1, 0, newList.length - 1); return c; });
      return newList;
    });
    pushToast(`Diputar setelah ini — ${track.title}`);
  }, [inRoom, addToQueueEnd, posInOrder, pushToast]);

  const createPlaylist = useCallback(async (name, description) => {
    if (!authUser) { pushToast("Login dulu buat bikin playlist"); return null; }
    try {
      const pl = await Api.createPlaylist({ name, description, isPublic: false });
      setPlaylists((p) => [...p, { ...pl, songs: [] }]);
      pushToast(`Playlist "${name}" dibuat`);
      return pl.id;
    } catch { pushToast("Gagal bikin playlist"); return null; }
  }, [authUser, pushToast]);

  
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
      pushToast("Ditambahin ke playlist");
    } catch { pushToast("Gagal nambahin ke playlist"); }
  }, [pushToast]);

  const removeFromPlaylist = useCallback(async (playlistId, trackId) => {
    setPlaylists((list) => list.map((pl) => (pl.id === playlistId ? { ...pl, songs: pl.songs.filter((s) => s.id !== trackId) } : pl)));
    try { await Api.removeSong(playlistId, trackId); } catch { pushToast("Gagal hapus dari playlist"); }
  }, [pushToast]);

  const deletePlaylist = useCallback(async (playlistId) => {
    setPlaylists((list) => list.filter((p) => p.id !== playlistId));
    try { await Api.deletePlaylist(playlistId); pushToast("Playlist dihapus"); } catch { pushToast("Gagal hapus playlist"); }
  }, [pushToast]);

  
  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const socket = io(API_BASE, { withCredentials: true, autoConnect: true, transports: ["websocket", "polling"] });
    socket.on("members-updated", (members) => setRoom((r) => (r ? { ...r, members } : r)));
    socket.on("queue-updated", ({ queue, currentIndex }) => setRoom((r) => (r ? { ...r, queue, currentIndex } : r)));
    socket.on("playback-sync", (fullRoom) => {
      applyingRemoteRef.current = true;
      setRoom(fullRoom);
      const track = fullRoom.currentIndex >= 0 ? normalizeTrack(fullRoom.queue[fullRoom.currentIndex]) : null;
      setQueueList(fullRoom.queue.map(normalizeTrack));
      setOrder(fullRoom.queue.map((_, i) => i));
      setPosInOrder(fullRoom.currentIndex >= 0 ? fullRoom.currentIndex : 0);
      setIsPlaying(fullRoom.isPlaying);
      const audio = audioRef.current;
      if (audio && track) {
        resolveAudioSrc(track).then((resolved) => {
          if (!resolved) return;
          if (audio.src !== resolved.src) audio.src = resolved.src;
          audio.currentTime = fullRoom.position || 0;
          if (fullRoom.isPlaying) audio.play().catch(() => {});
          else audio.pause();
        });
      }
      applyingRemoteRef.current = false;
    });
    socketRef.current = socket;
    return socket;
  }, [resolveAudioSrc]);

  const refreshPublicRooms = useCallback(() => { Api.publicRooms().then(setPublicRooms).catch(() => {}); }, []);

  const createRoom = useCallback((opts) => new Promise((resolve) => {
    if (!authUser) { pushToast("Login dulu buat bikin ruang"); resolve(null); return; }
    const socket = ensureSocket();
    socket.emit("create-room", opts, (res) => {
      if (res.error) { setRoomError(res.error); pushToast(res.error); resolve(null); return; }
      setRoom(res.room);
      setRoomError(null);
      resolve(res.room);
    });
  }), [authUser, ensureSocket, pushToast]);

  const joinRoom = useCallback((id, password) => new Promise((resolve) => {
    if (!authUser) { pushToast("Login dulu buat gabung ruang"); resolve(null); return; }
    const socket = ensureSocket();
    socket.emit("join-room", { roomId: id, password }, (res) => {
      if (res.error) { setRoomError(res.error); resolve(null); return; }
      setRoom(res.room);
      setRoomError(null);
      resolve(res.room);
    });
  }), [authUser, ensureSocket, pushToast]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("leave-room");
    setRoom(null);
    setQueueList([]); setOrder([]); setPosInOrder(0); setIsPlaying(false);
  }, []);

  useEffect(() => () => { socketRef.current?.disconnect(); }, []);

  const upNext = useMemo(() => order.slice(posInOrder + 1).map((i) => queueList[i]).filter(Boolean), [order, posInOrder, queueList]);
  const history = useMemo(() => order.slice(0, posInOrder).map((i) => queueList[i]).filter(Boolean), [order, posInOrder, queueList]);

  const value = {
    queueList, order, posInOrder, currentTrack, upNext, history,
    isPlaying, currentTime, duration: clipDuration, isPreviewClip, loadingAudio,
    volume, muted, shuffle, repeat, liked, playlists,
    playList, togglePlay, next, prev, seekRatio, toggleShuffle, cycleRepeat,
    setVolume, toggleMute, toggleLike, addToQueueEnd, playNextInQueue,
    playSingle, createPlaylist, addToPlaylist, removeFromPlaylist, deletePlaylist, setPlaylistDetail,
    registerProgressEl,
    room, publicRooms, roomError, refreshPublicRooms, createRoom, joinRoom, leaveRoom,
  };
  return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}