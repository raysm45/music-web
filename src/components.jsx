import React, { useState, useEffect, useRef, useCallback, useMemo, Component } from "react";
import { createPortal } from "react-dom";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, Volume1,
  VolumeX, Heart, Search, Home as HomeIcon, Library, ListMusic, ChevronDown,
  ChevronLeft, ChevronRight, X, Plus, Users, LogIn, MoreHorizontal, Clock,
  Check, ArrowLeft, Sun, Moon, Music2, Share2, UserPlus, Radio, Settings as SettingsIcon,
  Lock, Globe, Crown, Mic2, AlertTriangle, GripVertical, Trash2, Film, Send,
  PanelLeft, PanelRight, Type, Star, Airplay, Mic, MessageSquareQuote,
} from "lucide-react";
import {
  usePlayer, useUI,
  SIDEBAR_MIN_W, SIDEBAR_MAX_W, RIGHTPANEL_MIN_W, RIGHTPANEL_MAX_W,
} from "./context.jsx";
import { useRouter, Link } from "./router.jsx";
import { CoverArt, SmartCover, LeafMark, IvyFallLoader } from "./lib/brand.jsx";
import { formatTime, formatDuration, relativeTime, formatClockTime, clamp, isRelevantArtistMatch, cleanTrackTitleForLyrics } from "./lib/utils.js";
function usePanelResize({ width, setWidth, min, max, side }) {
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, width: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    function onMove(e) {
      if (!draggingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const delta = clientX - startRef.current.x;
      const next = side === "left" ? startRef.current.width + delta : startRef.current.width - delta;
      setWidth(clamp(Math.round(next), min, max));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setIsDragging(false);
      document.body.classList.remove("aivy-resizing");
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [min, max, setWidth, side]);

  const onDragStart = useCallback((e) => {
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    draggingRef.current = true;
    startRef.current = { x: clientX, width };
    setIsDragging(true);
    document.body.classList.add("aivy-resizing");
  }, [width]);

  return { onDragStart, isDragging };
}

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("AIVY crashed:", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="aivy-crash">
        <LeafMark size={40} color="var(--ink-faint)" />
        <div className="title">Ada yang salah di halaman ini</div>
        <div className="sub">Coba muat ulang. Kalau masih kejadian, kabarin ke kami ya.</div>
        <button className="aivy-btn-primary" onClick={() => { this.setState({ error: null }); window.location.href = "/beranda"; }}>
          Kembali ke beranda
        </button>
      </div>
    );
  }
}

export function Scrubber({ getRatio, onSeekRatio, registerFill, registerThumb, className = "", loading = false }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const ratioFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };
  if (loading) {
    return (
      <div className={`aivy-scrubber is-loading ${className}`} role="slider" aria-label="Posisi lagu" aria-busy="true">
        <div className="track skeleton-shine" />
      </div>
    );
  }
  return (
    <div
      ref={trackRef} className={`aivy-scrubber ${dragging ? "dragging" : ""} ${className}`}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); onSeekRatio(ratioFromEvent(e)); }}
      onPointerMove={(e) => { if (dragging) onSeekRatio(ratioFromEvent(e)); }}
      onPointerUp={(e) => { setDragging(false); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
      onPointerCancel={(e) => { setDragging(false); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
      role="slider" aria-label="Posisi lagu" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((getRatio ? getRatio() : 0) * 100)}
    >
      <div className="track"><div className="fill" ref={registerFill} /></div>
      <div className="thumb" ref={registerThumb} />
    </div>
  );
}

export function VolumeControl() {
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const { t } = useUI();
  const trackRef = useRef(null);
  const rootRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [bumping, setBumping] = useState(false);
  const bumpTimerRef = useRef(null);
  const effective = muted ? 0 : volume;
  const ratioFromEvent = (e) => { const r = trackRef.current.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); };
  const VolIcon = effective === 0 ? VolumeX : effective < 0.5 ? Volume1 : Volume2;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? -e.deltaY : e.deltaX;
      const step = delta > 0 ? 0.05 : -0.05;
      setVolume(clamp(effective + step, 0, 1));
      setBumping(true);
      clearTimeout(bumpTimerRef.current);
      bumpTimerRef.current = setTimeout(() => setBumping(false), 260);
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => { root.removeEventListener("wheel", onWheel); clearTimeout(bumpTimerRef.current); };
  }, [effective, setVolume]);

  return (
    <div className={`aivy-vol ${bumping ? "is-bumping" : ""} ${dragging ? "dragging" : ""}`} ref={rootRef}>
      <button className="aivy-icon-btn sm" onClick={toggleMute} aria-label={muted ? t("unmute") : t("mute")}><VolIcon size={17} /></button>
      <div
        ref={trackRef} className="track"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); setVolume(ratioFromEvent(e)); }}
        onPointerMove={(e) => { if (dragging) setVolume(ratioFromEvent(e)); }}
        onPointerUp={(e) => { setDragging(false); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
        onPointerCancel={(e) => { setDragging(false); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
        role="slider" aria-label={t("volume")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(effective * 100)}
      >
        <div className="fill" style={{ width: `${effective * 100}%` }} />
      </div>
    </div>
  );
}

/* Volume ala iPhone: ikon speaker kecil di kiri, speaker besar di kanan,
   bar panjang di tengah — dipakai di Now Playing sheet dan lyrics overlay. */
function AppleVolumeRow() {
  const { volume, muted, setVolume } = usePlayer();
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const effective = muted ? 0 : volume;
  const ratioFromEvent = (e) => {
    const r = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  return (
    <div className="aivy-apple-vol">
      <Volume1 size={15} aria-hidden="true" />
      <div
        ref={trackRef} className="track"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); draggingRef.current = true; setVolume(ratioFromEvent(e)); }}
        onPointerMove={(e) => { if (draggingRef.current) setVolume(ratioFromEvent(e)); }}
        onPointerUp={(e) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
        onPointerCancel={(e) => { draggingRef.current = false; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {} }}
        role="slider" aria-label="Volume" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(effective * 100)}
      >
        <div className="fill" style={{ width: `${effective * 100}%` }} />
      </div>
      <Volume2 size={17} aria-hidden="true" />
    </div>
  );
}

function useScrubberBinding() {
  const { currentTime, duration, seekRatio, registerProgressEl } = usePlayer();
  const fillCleanupRef = useRef(null);
  const thumbCleanupRef = useRef(null);
  const registerFill = useCallback((el) => {
    fillCleanupRef.current?.();
    fillCleanupRef.current = el ? registerProgressEl(el, "width") : null;
  }, [registerProgressEl]);
  const registerThumb = useCallback((el) => {
    thumbCleanupRef.current?.();
    thumbCleanupRef.current = el ? registerProgressEl(el, "left") : null;
  }, [registerProgressEl]);
  const getRatio = useCallback(() => (duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0), [currentTime, duration]);
  return { registerFill, registerThumb, getRatio, onSeekRatio: seekRatio, currentTime, duration };
}

export function GlobalContextMenu() {
  const { contextMenu, closeContextMenu } = useUI();
  const menuRef = useRef(null);
  useEffect(() => {
    if (!contextMenu) return;
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) closeContextMenu(); }
    function onKey(e) { if (e.key === "Escape") closeContextMenu(); }
    function onScroll() { closeContextMenu(); }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); };
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;
  const menuW = 240;
  const left = Math.min(contextMenu.x, window.innerWidth - menuW - 8);
  const top = Math.min(contextMenu.y, window.innerHeight - contextMenu.items.length * 38 - 16);

  return (
    <div ref={menuRef} className="aivy-ctxmenu" style={{ top, left, width: menuW }}>
      {contextMenu.items.map((item, i) => (
        item.divider ? <div key={i} className="aivy-ctxmenu-divider" /> : (
          <button key={i} className="aivy-menu-item" onClick={() => { item.onSelect?.(); closeContextMenu(); }} disabled={item.disabled}>
            {item.icon}<span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
}

export function CustomSelect({ value, options, onChange, placeholder, className = "" }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [rect, setRect] = useState(null);
  const [highlight, setHighlight] = useState(-1);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const doClose = useCallback(() => {
    setOpen((wasOpen) => {
      if (!wasOpen) return wasOpen;
      setClosing(true);
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => setClosing(false), 160);
      return false;
    });
  }, []);

  const doOpen = () => {
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    clearTimeout(closeTimerRef.current);
    setClosing(false);
    setOpen(true);
  };

  const toggle = () => (open ? doClose() : doOpen());

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      doClose();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); doClose(); triggerRef.current?.focus(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(options.length - 1, h + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(0, h - 1)); }
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const o = options[highlight];
        if (o) { onChange(o.value); doClose(); triggerRef.current?.focus(); }
      }
    }
    function onReflow() { if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect()); }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, options, highlight, onChange, doClose]);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const showMenu = open || closing;
  const menuStyle = useMemo(() => {
    if (!rect) return { display: "none" };
    const gap = 6;
    const estHeight = Math.min(280, options.length * 38 + 10);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < estHeight + 12 && spaceAbove > spaceBelow;
    const style = {
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight: Math.min(280, (openUp ? spaceAbove : spaceBelow) - 16),
    };
    if (openUp) { style.bottom = window.innerHeight - rect.top + gap; style.transformOrigin = "bottom"; }
    else { style.top = rect.bottom + gap; style.transformOrigin = "top"; }
    return style;
  }, [rect, options.length]);

  return (
    <div className={`aivy-cselect ${className}`}>
      <button
        type="button"
        ref={triggerRef}
        className={`aivy-cselect-trigger ${open ? "is-open" : ""}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="aivy-cselect-value">{selected ? selected.label : (placeholder || "")}</span>
        <ChevronDown size={15} className="aivy-cselect-chevron" />
      </button>
      {showMenu && createPortal(
        <div
          ref={menuRef}
          className={`aivy-cselect-menu ${closing ? "is-closing" : "is-opening"}`}
          style={menuStyle}
          role="listbox"
        >
          {options.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`aivy-cselect-option ${o.value === value ? "is-selected" : ""} ${i === highlight ? "is-highlighted" : ""}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => { onChange(o.value); doClose(); triggerRef.current?.focus(); }}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={14} className="aivy-cselect-check" />}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, disabled = false, className = "" }) {
  return (
    <label className={`aivy-checkbox ${checked ? "is-checked" : ""} ${disabled ? "is-disabled" : ""} ${className}`}>
      <button
        type="button"
        className="aivy-checkbox-box"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
      >
        <Check size={13} className="aivy-checkbox-mark" />
      </button>
      {label && <span className="aivy-checkbox-label">{label}</span>}
    </label>
  );
}

export function buildShareUrl(track) {
  const origin = window.location.origin;
  if (track.album?.id) return `${origin}/album/${track.album.id}?track=${encodeURIComponent(track.id)}`;
  if (track.artist?.id) return `${origin}/artist/${track.artist.id}?track=${encodeURIComponent(track.id)}`;
  return `${origin}/cari?q=${encodeURIComponent(track.title)}`;
}

export function useTrackMenuItems(track, opts = {}) {
  const { liked, toggleLike, addToQueueEnd, playNextInQueue } = usePlayer();
  const { openAddToPlaylist, pushToast, t } = useUI();
  const { navigate } = useRouter();
  const isLiked = liked.has(String(track.videoId || track.id));

  const items = [
    { label: isLiked ? t("menuRemoveLiked") : t("menuSaveLiked"), icon: <Heart size={15} fill={isLiked ? "currentColor" : "none"} />, onSelect: () => toggleLike(track) },
    { label: t("menuPlayNext"), icon: <ListMusic size={15} />, onSelect: () => playNextInQueue(track) },
    { label: t("menuAddQueue"), icon: <Plus size={15} />, onSelect: () => addToQueueEnd(track) },
    { label: t("menuAddPlaylist"), icon: <Library size={15} />, onSelect: () => openAddToPlaylist(track) },
    { divider: true },
    { label: t("menuCopyLink"), icon: <Share2 size={15} />, onSelect: () => { navigator.clipboard?.writeText(buildShareUrl(track)); pushToast(t("linkCopied")); } },
  ];
  if (track.artist?.id) items.push({ label: t("menuGoArtist"), icon: <Music2 size={15} />, onSelect: () => navigate("artist", { params: { id: track.artist.id } }) });
  if (track.album?.id) items.push({ label: t("menuGoAlbum"), icon: <Music2 size={15} />, onSelect: () => navigate("album", { params: { id: track.album.id } }) });
  if (opts.onRemove) { items.push({ divider: true }); items.push({ label: opts.removeLabel || t("menuRemovePlaylist"), icon: <X size={15} />, onSelect: opts.onRemove }); }
  return items;
}

export function filterExplicit(tracks, settings) {
  if (!Array.isArray(tracks)) return tracks;
  if (settings?.explicitContent !== false) return tracks;
  return tracks.filter((tr) => !tr?.explicit);
}

export function TrackRow({ track, index, list, showIndex = true, showAlbum = false, onRemove, removeLabel, queueMode = "single", source = null }) {
  const { currentTrack, isPlaying, togglePlay, playSingle, playList, playRadio, selectQueuePosition, liked, toggleLike } = usePlayer();
  const { openContextMenu, t } = useUI();
  const { navigate } = useRouter();
  const isCurrent = currentTrack && currentTrack.id === track.id;
  const isLiked = liked.has(String(track.videoId || track.id));
  const items = useTrackMenuItems(track, { onRemove, removeLabel });

  const handlePlay = () => {
    if (isCurrent) { togglePlay(); return; }
    if (queueMode === "context" && list && list.length) { playList(list, index, source); return; }
    if (queueMode === "radio") { playRadio(track, source); return; }
    if (queueMode === "queue") { selectQueuePosition(index); return; }
    playSingle(track, source);
  };
  const handleContext = (e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, items); };

  return (
    <div className={`aivy-row ${isCurrent ? "is-current" : ""}`} onContextMenu={handleContext}>
      {showIndex && (
        <div className="idx">
          <span className="num">{index + 1}</span>
          <span className="eq"><EqBars playing={isPlaying} /></span>
        </div>
      )}
      <button className="thumb" onClick={handlePlay} aria-label={isCurrent && isPlaying ? t("pause") : t("play")}>
        <SmartCover src={track.cover} seed={track.id + track.title} size={40} radius={6} />
        <span className="hover-play">{isCurrent && isPlaying ? <Pause size={15} /> : <Play size={15} />}</span>
      </button>
      <div className="meta" onClick={handlePlay} style={{ cursor: "pointer" }}>
        <span className="t">{track.explicit && <span className="aivy-explicit-badge" title="Explicit">E</span>}{track.title}</span>
        <span className="a" onClick={(e) => { e.stopPropagation(); track.artist?.id && navigate("artist", { params: { id: track.artist.id } }); }}>
          {track.artist?.name || "\u2014"}
        </span>
      </div>
      {showAlbum && (
        <div className="col-album">
          {track.album?.id ? <span onClick={() => navigate("album", { params: { id: track.album.id } })} style={{ cursor: "pointer" }}>{track.album.title}</span> : (track.album?.title || "")}
        </div>
      )}
      <div className="right">
        <div className={`row-actions ${isLiked ? "liked" : ""}`}>
          <button className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`} onClick={() => toggleLike(track)} aria-label={t("like")}><Heart size={15} fill={isLiked ? "currentColor" : "none"} /></button>
          <button className="aivy-icon-btn sm" onClick={handleContext} aria-label={t("menuMore")}><MoreHorizontal size={15} /></button>
        </div>
        <span className="dur font-mono">{formatDuration(track.duration)}</span>
      </div>
    </div>
  );
}

function EqBars({ playing }) {
  return (
    <span className="eq-bars" aria-hidden="true">
      <span style={{ animationPlayState: playing ? "running" : "paused" }} />
      <span style={{ animationPlayState: playing ? "running" : "paused" }} />
      <span style={{ animationPlayState: playing ? "running" : "paused" }} />
    </span>
  );
}

export function CardTrack({ track, list }) {
  const { currentTrack, isPlaying, togglePlay, playSingle, playList } = usePlayer();
  const { openContextMenu } = useUI();
  const isCurrent = currentTrack && currentTrack.id === track.id;
  const items = useTrackMenuItems(track);
  const handlePlay = () => {
    if (isCurrent) { togglePlay(); return; }
    if (list && list.length) {
      const idx = list.findIndex((t) => t.id === track.id);
      playList(list, idx === -1 ? 0 : idx);
    } else {
      playSingle(track);
    }
  };
  return (
    <div className="aivy-card" onContextMenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, items); }}>
      <div className="art-wrap">
        <SmartCover src={track.cover} seed={track.id + track.title} size={140} radius={10} style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
        <button className="aivy-card-play" onClick={handlePlay} aria-label="Putar">{isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
      </div>
      <div className="title">{track.title}</div>
      <div className="sub">{track.artist?.name}</div>
    </div>
  );
}

export function CardAlbum({ album }) {
  const { navigate } = useRouter();
  const { playList } = usePlayer();
  const handlePlay = async (e) => {
    e.stopPropagation();
    const { Api } = await import("./lib/api.js");
    const full = await Api.album(album.id);
    if (full?.tracks?.length) playList(full.tracks, 0);
  };
  return (
    <div className="aivy-card" onClick={() => navigate("album", { params: { id: album.id } })} style={{ cursor: "pointer" }}>
      <div className="art-wrap">
        <SmartCover src={album.cover} seed={"album" + album.id + album.title} size={140} radius={10} style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
        <button className="aivy-card-play" onClick={handlePlay} aria-label="Putar album"><Play size={16} /></button>
      </div>
      <div className="title">{album.title}</div>
      <div className="sub">{album.artist?.name}{album.releaseDate ? ` \u00b7 ${String(album.releaseDate).slice(0, 4)}` : ""}</div>
    </div>
  );
}

export function CardArtist({ artist }) {
  const { navigate } = useRouter();
  const { t } = useUI();
  return (
    <div className="aivy-card" onClick={() => navigate("artist", { params: { id: artist.id } })} style={{ cursor: "pointer" }}>
      <div className="art-wrap round">
        <SmartCover src={artist.image} seed={"artist" + artist.id + artist.name} size={128} radius={999} style={{ width: "100%", height: "auto", borderRadius: "50%" }} />
      </div>
      <div className="title" style={{ textAlign: "center" }}>{artist.name}</div>
      <div className="sub" style={{ textAlign: "center" }}>{t("artistLabel")}</div>
    </div>
  );
}

export function ToastHost({ isMobile }) {
  const { toasts } = useUI();
  if (!toasts.length) return null;
  return (
    <div className={`aivy-toast-host ${isMobile ? "is-mobile" : ""}`}>
      {toasts.map((t) => <div key={t.id} className="aivy-toast">{t.message}</div>)}
    </div>
  );
}

export function AddToPlaylistModal() {
  const { addToPlaylistTarget, closeAddToPlaylist, pushToast, t } = useUI();
  const { playlists, addToPlaylist, createPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);
  if (!addToPlaylistTarget) return null;

  const targets = Array.isArray(addToPlaylistTarget) ? addToPlaylistTarget : [addToPlaylistTarget];

  const handleAdd = (playlistId) => {
    targets.forEach((track) => addToPlaylist(playlistId, track));
    if (targets.length > 1) pushToast(t("toastAddedToPlaylist"));
    closeAddToPlaylist();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = await createPlaylist(trimmed);
    if (id) targets.forEach((track) => addToPlaylist(id, track));
    closeAddToPlaylist();
  };

  return (
    <div className="aivy-modal-backdrop" onClick={closeAddToPlaylist}>
      <div className="aivy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aivy-modal-head">
          <div className="aivy-modal-title">{t("addToPlaylistTitle")}</div>
          <button className="aivy-icon-btn sm" onClick={closeAddToPlaylist} aria-label={t("close")}><X size={17} /></button>
        </div>
        <div className="aivy-playlist-pick">
          {playlists.map((pl) => (
            <button key={pl.id} onClick={() => handleAdd(pl.id)}>
              <Library size={15} color="var(--ink-faint)" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
              {targets.every((tr) => pl.songs?.some((s) => s.id === tr.id)) && <Check size={15} color="var(--moss-strong)" />}
            </button>
          ))}
          {!playlists.length && <div className="eyebrow" style={{ padding: "8px 10px" }}>{t("noPlaylistsYet")}</div>}
        </div>
        {creating ? (
          <div className="aivy-field" style={{ marginBottom: 4 }}>
            <input ref={inputRef} className="aivy-input" placeholder={t("newPlaylistNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }} />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="aivy-btn-primary" style={{ flex: 1 }} onClick={handleCreate}>{t("createAndAdd")}</button>
              <button className="aivy-btn-ghost" onClick={() => setCreating(false)}>{t("cancel")}</button>
            </div>
          </div>
        ) : (
          <button className="aivy-btn-ghost" style={{ width: "100%", marginTop: 4 }} onClick={() => setCreating(true)}><Plus size={15} /> {t("newPlaylist")}</button>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog(
  { open, title, message, confirmLabel, cancelLabel, danger = true, onConfirm, onCancel }
) {
  const { t } = useUI();
  if (!open) return null;
  return (
    <div className="aivy-modal-backdrop" onClick={onCancel}>
      <div className="aivy-modal aivy-confirm-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="aivy-confirm-icon"><AlertTriangle size={22} color="var(--berry)" /></div>
        <div className="aivy-modal-title">{title}</div>
        {message && <p className="aivy-confirm-msg">{message}</p>}
        <div className="aivy-confirm-actions">
          <button className="aivy-btn-ghost" onClick={onCancel}>{cancelLabel || t("cancel")}</button>
          <button className={`aivy-btn-primary ${danger ? "danger" : ""}`} onClick={onConfirm}>{confirmLabel || t("confirmDeleteDefault")}</button>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTrackRow() {
  return (
    <div className="aivy-skel-row">
      <div className="aivy-skel-thumb aivy-skeleton" />
      <div className="aivy-skel-lines">
        <div className="aivy-skel-line w60 aivy-skeleton" />
        <div className="aivy-skel-line w35 aivy-skeleton" />
      </div>
    </div>
  );
}
export function SkeletonList({ count = 8 }) {
  return <div>{Array.from({ length: count }).map((_, i) => <SkeletonTrackRow key={i} />)}</div>;
}

export function SkeletonHeroPage({ round = false, rows = 6 }) {
  return (
    <div className="aivy-view-enter aivy-skel-hero-page">
      <div className="aivy-hero">
        <div className={`aivy-skel-hero-art aivy-skeleton ${round ? "round" : ""}`} />
        <div className="aivy-hero-meta" style={{ flex: 1, minWidth: 0 }}>
          <div className="aivy-skel-line w35 aivy-skeleton" style={{ height: 12, marginBottom: 14 }} />
          <div className="aivy-skel-line aivy-skeleton" style={{ height: 30, width: "70%", marginBottom: 10 }} />
          <div className="aivy-skel-line w35 aivy-skeleton" style={{ height: 12 }} />
        </div>
      </div>
      <div className="aivy-hero-actions">
        <div className="aivy-skeleton" style={{ width: 52, height: 52, borderRadius: "50%" }} />
        <div className="aivy-skeleton" style={{ width: 90, height: 36, borderRadius: "var(--radius-pill, 999px)" }} />
      </div>
      <SkeletonList count={rows} />
    </div>
  );
}

export function TransportButtons({ big = false }) {
  const { isPlaying, togglePlay, next, prev, shuffle, toggleShuffle, repeat, cycleRepeat, currentTrack, room } = usePlayer();
  const { authUser, t } = useUI();
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;
  const isHost = !room || !authUser || room.hostId === authUser.id;
  const controlLocked = room && room.hostOnlyControl && !isHost;
  return (
    <div className="aivy-transport-btns">
      <button className={`aivy-icon-btn ${shuffle ? "active" : ""}`} onClick={toggleShuffle} aria-label={t("shuffle")} aria-pressed={shuffle} disabled={!!room}><Shuffle size={big ? 18 : 16} /></button>
      <button className="aivy-icon-btn" onClick={prev} disabled={!currentTrack || controlLocked} aria-label={t("previous")}><SkipBack size={big ? 22 : 18} fill="currentColor" /></button>
      <button className="aivy-play-btn" onClick={togglePlay} disabled={!currentTrack || controlLocked} aria-label={isPlaying ? t("pause") : t("play")}>
        {isPlaying ? <Pause size={big ? 24 : 16} fill="currentColor" /> : <Play size={big ? 24 : 16} fill="currentColor" />}
      </button>
      <button className="aivy-icon-btn" onClick={() => next(false)} disabled={!currentTrack || controlLocked} aria-label={t("next")}><SkipForward size={big ? 22 : 18} fill="currentColor" /></button>
      <button className={`aivy-icon-btn ${repeat !== "off" ? "active" : ""}`} onClick={cycleRepeat} aria-label={t("repeat")} aria-pressed={repeat !== "off"} disabled={!!room}><RepeatIcon size={big ? 18 : 16} /></button>
    </div>
  );
}

export function PlayerBar() {
  const { currentTrack, liked, toggleLike, isPreviewClip, loadingAudio, currentTrackHasLyrics } = usePlayer();
  const { navigate } = useRouter();
  const { toggleLyrics, sidebarQueueOpen, toggleSidebarQueue, t } = useUI();
  const { registerFill, registerThumb, getRatio, onSeekRatio, currentTime, duration } = useScrubberBinding();
  const isLiked = currentTrack && liked.has(String(currentTrack.videoId || currentTrack.id));
  const lyricsDisabled = !currentTrack || !currentTrackHasLyrics;

  return (
    <div className="aivy-player">
      <div className="now">
        {currentTrack ? (
          <>
            <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={52} radius={8} />
            <div className="meta">
              <span className="t">{currentTrack.title}</span>
              <span className="a" onClick={() => currentTrack.artist?.id && navigate("artist", { params: { id: currentTrack.artist.id } })} style={{ cursor: "pointer" }}>
                {currentTrack.artist?.name}{isPreviewClip && <span className="preview-tag">{` \u00b7 ${t("previewTag")}`}</span>}
              </span>
            </div>
            <button className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`} onClick={() => toggleLike(currentTrack)} aria-label={t("like")}><Heart size={16} fill={isLiked ? "currentColor" : "none"} /></button>
          </>
        ) : (
          <>
            <div style={{ width: 52, height: 52, borderRadius: 8, background: "var(--bg-elev-2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LeafMark size={22} color="var(--ink-faint)" />
            </div>
            <span className="placeholder">{t("nothingPlaying")}</span>
          </>
        )}
      </div>
      <div className="aivy-transport">
        <TransportButtons />
        <div className="aivy-scrubber-row">
          <span className="aivy-time font-mono">{loadingAudio ? "\u2013\u2013" : formatTime(currentTime)}</span>
          <Scrubber getRatio={getRatio} onSeekRatio={onSeekRatio} registerFill={registerFill} registerThumb={registerThumb} loading={loadingAudio} />
          <span className="aivy-time right font-mono">{loadingAudio ? "\u2013\u2013" : formatTime(duration)}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "min(20%, 220px)", justifyContent: "flex-end" }}>
        <button className={`aivy-icon-btn sm ${sidebarQueueOpen ? "active" : ""}`} onClick={toggleSidebarQueue} aria-label={t("lyricsQueueBtn")} title={t("lyricsQueueBtn")}><ListMusic size={16} /></button>
        <button className="aivy-icon-btn sm" onClick={toggleLyrics} disabled={lyricsDisabled} aria-label={t("lyrics")} title={lyricsDisabled && currentTrack ? t("lyricsUnavailable") : t("lyrics")}><Mic2 size={16} /></button>
        <VolumeControl />
      </div>
    </div>
  );
}

export function MiniPlayer({ onExpand }) {
  const { currentTrack, isPlaying, togglePlay, next, loadingAudio } = usePlayer();
  const { registerFill } = useScrubberBinding();
  const { t } = useUI();
  if (!currentTrack) return null;
  return (
    <div className="aivy-mini-player" onClick={onExpand} role="button" tabIndex={0} aria-label={t("openNowPlaying")}>
      <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={40} radius={6} />
      <div className="meta"><span className="t">{currentTrack.title}</span><span className="a">{currentTrack.artist?.name}</span></div>
      <button className="aivy-icon-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }} aria-label={isPlaying ? t("pause") : t("play")}>
        {isPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
      </button>
      <button className="aivy-icon-btn" onClick={(e) => { e.stopPropagation(); next(false); }} aria-label={t("next")}><SkipForward size={18} fill="currentColor" /></button>
      <div className={`mini-progress ${loadingAudio ? "is-loading" : ""}`}>{loadingAudio ? <div className="skeleton-shine" /> : <div className="fill" ref={registerFill} />}</div>
    </div>
  );
}

export function MobileNowPlayingIconRow({ lyricsActive, onToggleLyrics, lyricsDisabled, onOpenQueue }) {
  const { t, pushToast } = useUI();
  const handleAirplay = () => pushToast(t("airplayUnavailable", "Output perangkat tidak tersedia di browser"));
  return (
    <div className="aivy-sheet-icon-row">
      <button
        className={`aivy-icon-btn ${lyricsActive ? "active" : ""}`}
        onClick={onToggleLyrics}
        disabled={lyricsDisabled}
        aria-label={t("lyrics")}
        title={lyricsDisabled ? t("lyricsUnavailable") : t("lyrics")}
      >
        <MessageSquareQuote size={21} />
      </button>
      <button className="aivy-icon-btn" onClick={handleAirplay} aria-label="AirPlay"><Airplay size={21} /></button>
      <button className="aivy-icon-btn" onClick={onOpenQueue} aria-label={t("openQueue")}><ListMusic size={21} /></button>
    </div>
  );
}

export function NowPlayingSheet({ open, onClose, onOpenQueue }) {
  const { currentTrack, liked, toggleLike, isPreviewClip, loadingAudio, currentTrackHasLyrics } = usePlayer();
  const { navigate } = useRouter();
  const { t, toggleLyrics, openContextMenu } = useUI();
  const { registerFill, registerThumb, getRatio, onSeekRatio, currentTime, duration } = useScrubberBinding();
  const isLiked = currentTrack && liked.has(String(currentTrack.videoId || currentTrack.id));
  const lyricsDisabled = !currentTrack || !currentTrackHasLyrics;
  const menuItems = useTrackMenuItems(currentTrack || {});
  const handleMore = (e) => { if (!currentTrack) return; openContextMenu(e.clientX, e.clientY, menuItems); };
  const remaining = Math.max(0, Math.round((duration || 0) - (currentTime || 0)));

  return (
    <>
      <div className={`aivy-sheet-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`aivy-sheet ${open ? "open" : ""}`} aria-hidden={!open}>
        {currentTrack && (
          <div className="aivy-sheet-bg" style={{ backgroundImage: `url(${currentTrack.cover})` }} aria-hidden="true" />
        )}
        <button className="aivy-sheet-grabber" onClick={onClose} aria-label={t("close")}>
          <span />
        </button>
        {currentTrack && (
          <div className="aivy-sheet-body aivy-scroll">
            <div className="aivy-sheet-art">
              <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={320} radius={10} style={{ width: "100%", height: "100%" }} />
            </div>

            <div className="aivy-sheet-meta">
              <div className="aivy-sheet-meta-txt">
                <div className="t">{currentTrack.title}</div>
                <div
                  className="a"
                  onClick={() => { currentTrack.artist?.id && navigate("artist", { params: { id: currentTrack.artist.id } }); onClose(); }}
                >
                  {currentTrack.artist?.name}
                  {isPreviewClip && <span className="preview-tag">{` \u00b7 ${t("previewTag")}`}</span>}
                </div>
              </div>
              <div className="aivy-sheet-meta-actions">
                <button className={`aivy-icon-btn ${isLiked ? "active" : ""}`} onClick={() => toggleLike(currentTrack)} aria-label={t("like")}>
                  <Star size={21} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <button className="aivy-icon-btn" onClick={handleMore} aria-label={t("menuMore")}>
                  <MoreHorizontal size={21} />
                </button>
              </div>
            </div>

            <div className="aivy-scrubber-row">
              <span className="aivy-time font-mono">{loadingAudio ? "\u2013\u2013" : formatTime(currentTime)}</span>
              <Scrubber getRatio={getRatio} onSeekRatio={onSeekRatio} registerFill={registerFill} registerThumb={registerThumb} loading={loadingAudio} />
              <span className="aivy-time right font-mono">{loadingAudio ? "\u2013\u2013" : `-${formatTime(remaining)}`}</span>
            </div>

            <TransportButtons big />
            <AppleVolumeRow />
            <MobileNowPlayingIconRow lyricsActive={false} onToggleLyrics={toggleLyrics} lyricsDisabled={lyricsDisabled} onOpenQueue={onOpenQueue} />
          </div>
        )}
      </div>
    </>
  );
}

export function QueueSheet({ open, onClose }) {
  const { t } = useUI();
  const [tab, setTab] = useState("queue");
  return (
    <>
      <div className={`aivy-sheet-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`aivy-sheet aivy-queue-sheet ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="aivy-sheet-head">
          <button className="aivy-icon-btn" onClick={onClose} aria-label={t("close")}><ChevronDown size={22} /></button>
          <span className="eyebrow">{t("tabQueue")}</span>
          <span style={{ width: 38 }} />
        </div>
        <div className="aivy-queue-tabs">
          <button className={tab === "queue" ? "active" : ""} onClick={() => setTab("queue")}>{t("tabQueue")}</button>
          <button className={tab === "played" ? "active" : ""} onClick={() => setTab("played")}>{t("playedLabel")}</button>
        </div>
        <div className="aivy-sheet-body aivy-scroll aivy-queue-sheet-body">
          {tab === "queue" ? <QueueBody /> : <QueueHistoryBody />}
        </div>
      </div>
    </>
  );
}

export function RightPanel() {
  const { room } = usePlayer();
  const {
    sidebarQueueOpen, closeSidebarQueue, t,
    rightPanelWidth, setRightPanelWidth, rightPanelCollapsed, toggleRightPanelCollapsed,
    rightPanelPeek, setRightPanelPeek,
  } = useUI();
  const [tab, setTab] = useState("now");
  useEffect(() => { if (room) setTab("room"); }, [!!room]);

  const { onDragStart, isDragging } = usePanelResize({
    width: rightPanelWidth, setWidth: setRightPanelWidth, min: RIGHTPANEL_MIN_W, max: RIGHTPANEL_MAX_W, side: "right",
  });

  const resizeHandle = (
    <div
      className={`aivy-resize-handle left ${isDragging ? "active" : ""}`}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
    >
      <span className="aivy-resize-grip"><GripVertical size={12} /></span>
    </div>
  );
  const bodyContent = sidebarQueueOpen ? (
    <>
      <div className="aivy-rightpanel-tabs">
        <button
          className="aivy-panel-icon-btn"
          onClick={toggleRightPanelCollapsed}
          aria-label={t("collapsePanel", "Tutup panel")}
          title={t("collapsePanel", "Tutup panel")}
        >
          <PanelRight size={18} />
        </button>
        <span className="aivy-rightpanel-title">{t("lyricsQueueBtn")}</span>
        <button className="aivy-icon-btn sm" onClick={closeSidebarQueue} aria-label={t("close")}><X size={16} /></button>
      </div>
      <div className="aivy-rightpanel-body aivy-scroll">
        <SidebarQueuePanel />
      </div>
    </>
  ) : (
    <>
      <div className="aivy-rightpanel-tabs">
        <button
          className="aivy-panel-icon-btn"
          onClick={toggleRightPanelCollapsed}
          aria-label={t("collapsePanel", "Tutup panel")}
          title={t("collapsePanel", "Tutup panel")}
        >
          <PanelRight size={18} />
        </button>
        {!room && tab === "now" && <RightPanelSourceLabel />}
        {room && (
          <>
            <button className={`aivy-rightpanel-tab-icon ${tab === "now" ? "active" : ""}`} onClick={() => setTab("now")} aria-label={t("tabNowPlaying")} title={t("tabNowPlaying")}><Music2 size={15} /></button>
            <button className={tab === "room" ? "active" : ""} onClick={() => setTab("room")}>{t("tabRoom")}</button>
          </>
        )}
      </div>
      <div className="aivy-rightpanel-body aivy-scroll">
        {tab === "now" && <NowPlayingPane />}
        {tab === "room" && room && <RoomPane />}
      </div>
    </>
  );

  if (rightPanelCollapsed) {
    return (
      <aside className="aivy-rightpanel aivy-rightpanel-collapsed">
        <button
          type="button"
          className="aivy-rightpanel-rail"
          onClick={toggleRightPanelCollapsed}
          onMouseEnter={() => setRightPanelPeek(true)}
          onMouseLeave={() => setRightPanelPeek(false)}
          onFocus={() => setRightPanelPeek(true)}
          onBlur={() => setRightPanelPeek(false)}
          aria-label={t("expandPanel", "Buka panel")}
          title={t("expandPanel", "Buka panel")}
        >
          <span className="aivy-rightpanel-rail-peek-wrap">
            <span className="aivy-rightpanel-rail-peek" style={{ width: rightPanelWidth }}>{bodyContent}</span>
          </span>
          <span className="aivy-rightpanel-rail-arrow-wrap">
            <span className="aivy-rightpanel-rail-arrow">
              <ChevronRight size={16} className="arrow-idle" />
              <ChevronLeft size={16} className="arrow-hover" />
            </span>
          </span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="aivy-rightpanel">
      {bodyContent}
      {resizeHandle}
    </aside>
  );
}

function RightPanelSourceLabel() {
  const { playSource } = usePlayer();
  if (playSource?.type !== "library" || !playSource.label) return null;
  return (
    <span className="aivy-rightpanel-source">
      <Library size={12} />
      <span>{playSource.label}</span>
    </span>
  );
}

function useArtistAbout(track) {
  const [artist, setArtist] = useState(null);
  const hasId = !!track?.artist?.id;
  const artistKey = track?.artist?.id || track?.artist?.name || null;
  const artistName = track?.artist?.name || null;

  useEffect(() => {
    setArtist(null);
    if (!artistKey) return;
    let alive = true;
    import("./lib/api.js").then(({ Api }) => {
      Api.artist(artistKey).then((res) => {
        if (!alive) return;
        if (!hasId && res?.name && !isRelevantArtistMatch(res.name, artistName)) {
          setArtist(null);
          return;
        }
        setArtist(res);
      }).catch(() => { if (alive) setArtist(null); });
    });
    return () => { alive = false; };
  }, [artistKey, hasId, artistName]);

  return artist;
}

function AboutArtistSection({ track, onNavigate }) {
  const artist = useArtistAbout(track);
  const { navigate } = useRouter();
  const { pushToast, t, settings } = useUI();
  const [following, setFollowing] = useState(false);

  useEffect(() => { setFollowing(false); }, [artist?.id]);

  if (!track?.artist || !artist) return null;

  const goToArtist = () => {
    navigate("artist", { params: { id: artist.id || artist.name } });
    onNavigate?.();
  };

  const handleFollow = (e) => {
    e.stopPropagation();
    setFollowing((f) => !f);
    pushToast(following ? `${t("unfollowedToast")} ${artist.name}` : `${t("followedToast")} ${artist.name}`);
  };

  return (
    <div className="aivy-nowplaying-about">
      <button type="button" className="aivy-nowplaying-about-banner" onClick={goToArtist} aria-label={artist.name}>
        {(artist.banner || artist.image) && (
          <SmartCover src={artist.banner || artist.image} seed={"banner" + (artist.id || artist.name)} size={480} radius={0} style={{ width: "100%", height: "100%" }} />
        )}
        <div className="aivy-nowplaying-about-banner-fade" />
        <span className="aivy-nowplaying-about-eyebrow">{t("aboutArtistLabel")}</span>
      </button>
      <div className="aivy-nowplaying-about-body">
        <button type="button" className="aivy-nowplaying-about-name" onClick={goToArtist}>{artist.name}</button>
        <div className="aivy-nowplaying-about-row">
          {artist.listeners != null && (
            <span className="aivy-nowplaying-about-listeners">{artist.listeners.toLocaleString(settings.language === "en" ? "en-US" : "id-ID")} {t("listenersMonthly")}</span>
          )}
          <button type="button" className={following ? "aivy-chip active" : "aivy-btn-ghost sm"} onClick={handleFollow}>
            {following ? <><Check size={13} /> {t("following")}</> : t("follow")}
          </button>
        </div>
        {artist.bio && <p className="aivy-nowplaying-about-bio">{artist.bio}</p>}
      </div>
    </div>
  );
}
const creditsFetchCache = new Map();
function useCreditsData(track) {
  const trackId = track?.id;
  const hasOwnCredits = !!track?.credits;
  const [fetchedCredits, setFetchedCredits] = useState(null);

  useEffect(() => {
    setFetchedCredits(null);
    if (hasOwnCredits || !trackId || !/^\d+$/.test(String(trackId))) return;

    let alive = true;
    const applyResult = (credits) => { if (alive) setFetchedCredits(credits); };

    const cached = creditsFetchCache.get(trackId);
    if (cached !== undefined) {
      if (cached && typeof cached.then === "function") cached.then(applyResult);
      else applyResult(cached);
      return () => { alive = false; };
    }

    const promise = import("./lib/api.js")
      .then(({ Api }) => Api.track(trackId))
      .then((full) => full?.credits || null)
      .catch(() => null);
    creditsFetchCache.set(trackId, promise);
    promise.then((credits) => {
      creditsFetchCache.set(trackId, credits);
      applyResult(credits);
    });

    return () => { alive = false; };
  }, [trackId, hasOwnCredits]);

  return useMemo(() => {
    const mainArtistName = track?.artist?.name || null;
    const c = track?.credits || fetchedCredits || null;

    const contributors = [];
    if (mainArtistName) contributors.push({ name: mainArtistName, roleKey: "mainArtistRole", isMainArtist: true });
    (c?.contributors || []).forEach((p) => {
      if (p?.name) contributors.push({ name: p.name, role: (p.roles || []).join(", ") || null });
    });

    const performedBy = c?.performedBy?.length ? c.performedBy : (mainArtistName ? [mainArtistName] : []);
    const writtenBy = c?.writtenBy || [];
    const producedBy = c?.producedBy || [];
    const source = c?.source || [];

    return {
      hasAnything: contributors.length > 0,
      contributors,
      title: track?.title || "",
      performedBy, writtenBy, producedBy, source,
    };
  }, [track, fetchedCredits]);
}
function CreditsCard({ track }) {
  const { t, openCredits } = useUI();
  const data = useCreditsData(track);
  const [following, setFollowing] = useState(false);

  if (!data.hasAnything) return null;

  return (
    <div className="aivy-credits-card">
      <div className="aivy-credits-card-head">
        <span className="aivy-credits-card-title">{t("creditsLabel")}</span>
        <button type="button" className="aivy-credits-showall" onClick={() => openCredits(track)}>{t("showAllLabel")}</button>
      </div>
      <div className="aivy-credits-card-list">
        {data.contributors.slice(0, 4).map((p, i) => (
          <div className="aivy-credits-card-row" key={i}>
            <div className="who">
              <div className="name">{p.name}</div>
              <div className="role">{p.isMainArtist ? t(p.roleKey) : p.role}</div>
            </div>
            {p.isMainArtist && (
              <button
                type="button"
                className={following ? "aivy-chip active" : "aivy-chip"}
                onClick={() => setFollowing((f) => !f)}
              >
                {following ? <><Check size={13} /> {t("following")}</> : t("follow")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
export function CreditsModal() {
  const { creditsTrack, closeCredits, t } = useUI();
  if (!creditsTrack) return null;
  const data = useCreditsData(creditsTrack);

  return (
    <div className="aivy-modal-backdrop" onClick={closeCredits}>
      <div className="aivy-modal aivy-credits-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aivy-modal-head">
          <div className="aivy-modal-title">{t("creditsLabel")}</div>
          <button className="aivy-icon-btn sm" onClick={closeCredits} aria-label={t("close")}><X size={17} /></button>
        </div>
        <div className="aivy-credits-modal-body aivy-scroll">
          <div className="aivy-credits-modal-song">{data.title}</div>

          {data.performedBy.length > 0 && (
            <div className="aivy-credits-group">
              <div className="label">{t("performedByLabel")}</div>
              <div className="names">{data.performedBy.join(", ")}</div>
            </div>
          )}

          {data.writtenBy.length > 0 && (
            <div className="aivy-credits-group">
              <div className="label">{t("writtenByLabel")}</div>
              <div className="names">
                <strong>{data.writtenBy[0]}</strong>
                {data.writtenBy.length > 1 ? `, ${data.writtenBy.slice(1).join(", ")}` : ""}
              </div>
            </div>
          )}

          <div className="aivy-credits-group">
            <div className="label">{t("producedByLabel")}</div>
            <div className="names">{data.producedBy.length > 0 ? data.producedBy.join(", ") : "\u2013"}</div>
          </div>

          {data.source.length > 0 && (
            <div className="aivy-credits-source">{t("sourceLabel")}: {data.source.join(", ")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function NextUpPreview({ compact }) {
  const { upNext, suggestedQueue, next, promoteSuggestion } = usePlayer();
  const { t } = useUI();
  const queueTrack = upNext[0];
  const track = queueTrack || suggestedQueue[0];
  if (!track) return null;

  const isFromQueue = !!queueTrack;
  const handleClick = () => {
    if (isFromQueue) { next(); return; }
    promoteSuggestion(track);
  };

  return (
    <div className={`aivy-nextup ${compact ? "compact" : ""}`}>
      <button type="button" className="aivy-nextup-row" onClick={handleClick}>
        <div className="aivy-nextup-label eyebrow">
          {isFromQueue ? <ListMusic size={12} /> : <Radio size={12} />}
          <span>{isFromQueue ? t("nextInQueueLabel") : t("nextRecommendationLabel")}</span>
        </div>
        <div className="aivy-nextup-row-main">
          <QueueTrackMeta track={track} />
          <ChevronRight size={16} className="aivy-nextup-chevron" />
        </div>
      </button>
    </div>
  );
}

function QueueTrackMeta({ track }) {
  return (
    <div className="aivy-queue-meta">
      <SmartCover src={track.cover} seed={track.id + track.title} size={44} radius={6} style={{ width: 44, height: 44 }} />
      <div className="txt">
        <span className="t">{track.title}</span>
        <span className="a">{track.artist?.name || "\u2014"}</span>
      </div>
    </div>
  );
}

function QueueNowPlayingRow({ track }) {
  const { isPlaying, liked, toggleLike } = usePlayer();
  const { t } = useUI();
  const isLiked = liked.has(String(track.videoId || track.id));
  return (
    <div className="aivy-queue-row is-current">
      <span className="aivy-queue-eq"><EqBars playing={isPlaying} /></span>
      <QueueTrackMeta track={track} />
      <div className="aivy-queue-row-actions">
        <button className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`} onClick={() => toggleLike(track)} aria-label={t("like")}>
          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

function QueueHistoryRow({ track, onSelect }) {
  const { liked, toggleLike } = usePlayer();
  const { t } = useUI();
  const isLiked = liked.has(String(track.videoId || track.id));
  return (
    <div className="aivy-queue-row is-history" onClick={onSelect}>
      <QueueTrackMeta track={track} />
      <div className="aivy-queue-row-actions">
        <button className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); toggleLike(track); }} aria-label={t("like")}>
          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

function QueueUpNextList({ items }) {
  const { moveQueueItem, removeFromQueue, selectQueuePosition, posInOrder, liked, toggleLike } = usePlayer();
  const { t } = useUI();
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const dragMeta = useRef({ startY: 0, rowHeight: 60 });

  const endDrag = (commit) => {
    if (commit && dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      moveQueueItem(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
    setDragDeltaY(0);
  };

  const handlePointerDown = (e, index) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const row = e.currentTarget.closest(".aivy-queue-row");
    dragMeta.current.startY = e.clientY;
    dragMeta.current.rowHeight = row?.getBoundingClientRect().height || 60;
    setDragIndex(index);
    setOverIndex(index);
  };
  const handlePointerMove = (e) => {
    if (dragIndex === null) return;
    const deltaY = e.clientY - dragMeta.current.startY;
    setDragDeltaY(deltaY);
    const shift = Math.round(deltaY / dragMeta.current.rowHeight);
    const next = clamp(dragIndex + shift, 0, items.length - 1);
    if (next !== overIndex) setOverIndex(next);
  };

  return (
    <div className="aivy-queue-list">
      {items.map((tr, i) => {
        const isDragging = dragIndex === i;
        let offsetPct = 0;
        if (dragIndex !== null && !isDragging) {
          if (dragIndex < overIndex && i > dragIndex && i <= overIndex) offsetPct = -100;
          else if (dragIndex > overIndex && i >= overIndex && i < dragIndex) offsetPct = 100;
        }
        const isLiked = liked.has(String(tr.videoId || tr.id));
        const style = isDragging
          ? { transform: `translateY(${dragDeltaY}px)` }
          : offsetPct
            ? { transform: `translateY(${offsetPct}%)` }
            : undefined;
        return (
          <div key={`${tr.id}-${i}`} className={`aivy-queue-row is-upnext ${isDragging ? "is-dragging" : ""}`} style={style}>
            <button
              className="aivy-queue-handle"
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={() => endDrag(true)}
              onPointerCancel={() => endDrag(false)}
              aria-label={t("dragToReorder")}
            >
              <GripVertical size={15} />
            </button>
            <div className="aivy-queue-clickzone" onClick={() => selectQueuePosition(posInOrder + 1 + i)}>
              <QueueTrackMeta track={tr} />
            </div>
            <div className="aivy-queue-row-actions">
              <button className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`} onClick={() => toggleLike(tr)} aria-label={t("like")}>
                <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button className="aivy-icon-btn sm" onClick={() => removeFromQueue(i)} aria-label={t("removeFromQueue")}>
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QueueSuggestedRow({ track, onAdd }) {
  const { liked, toggleLike } = usePlayer();
  const { t } = useUI();
  const isLiked = liked.has(String(track.videoId || track.id));
  return (
    <div className="aivy-queue-row is-suggested">
      <QueueTrackMeta track={track} />
      <div className="aivy-queue-row-actions">
        <button className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`} onClick={() => toggleLike(track)} aria-label={t("like")}>
          <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
        </button>
        <button className="aivy-icon-btn sm" onClick={onAdd} aria-label={t("menuAddQueue")}>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function QueueBody() {
  const { currentTrack, upNext, clearUpNext, suggestedQueue, promoteSuggestion, room } = usePlayer();
  const { t } = useUI();

  if (!currentTrack) {
    return <div className="aivy-empty"><LeafMark size={34} color="var(--ink-faint)" /><div className="title">{t("queueEmpty")}</div><div className="sub">{t("queueEmptySub")}</div></div>;
  }

  return (
    <>
      <div className="aivy-queue-section">
        <div className="aivy-drawer-sub eyebrow">{t("nowPlaying")}</div>
        <div className="aivy-queue-card aivy-queue-now-card">
          <QueueNowPlayingRow track={currentTrack} />
        </div>
      </div>

      <div className="aivy-queue-section">
        <div className="aivy-drawer-sub eyebrow aivy-queue-upnext-head">
          <span>{t("upNextLabel")}{upNext.length > 0 ? ` \u00b7 ${upNext.length}` : ""}</span>
          {upNext.length > 0 && (
            <button className="aivy-queue-clear" onClick={clearUpNext}><Trash2 size={12} /> {t("clearQueue")}</button>
          )}
        </div>
        {upNext.length > 0 ? (
          <div className="aivy-queue-card">
            <QueueUpNextList items={upNext} />
          </div>
        ) : (
          <div className="aivy-queue-empty-hint">{t("queueUpNextEmpty")}</div>
        )}
      </div>

      {!room && suggestedQueue.length > 0 && (
        <div className="aivy-queue-section">
          <div className="aivy-drawer-sub eyebrow aivy-queue-suggested-head">
            <Radio size={12} /><span>{t("suggestedSongsLabel")}</span>
          </div>
          <div className="aivy-queue-suggested-hint">{t("suggestedSongsHint")}</div>
          <div className="aivy-queue-card aivy-queue-suggested-card">
            <QueueSuggestedRow track={suggestedQueue[0]} onAdd={() => promoteSuggestion(suggestedQueue[0])} />
          </div>
        </div>
      )}
    </>
  );
}

export function QueueHistoryBody() {
  const { history, selectQueuePosition } = usePlayer();
  const { t } = useUI();
  const recent = history.slice().reverse();

  if (recent.length === 0) {
    return <div className="aivy-empty"><LeafMark size={34} color="var(--ink-faint)" /><div className="title">{t("playedLabel")}</div><div className="sub">{t("noRecentlyPlayed")}</div></div>;
  }

  return (
    <div className="aivy-queue-section">
      <div className="aivy-queue-card aivy-queue-history-card">
        {recent.map((tr, i) => (
          <QueueHistoryRow key={`h-${tr.id}-${i}`} track={tr} onSelect={() => selectQueuePosition(history.length - 1 - i)} />
        ))}
      </div>
    </div>
  );
}

function NowPlayingPane() {
  const { currentTrack, isPreviewClip } = usePlayer();
  const { t } = useUI();
  if (!currentTrack) return <div className="aivy-empty"><LeafMark size={34} color="var(--ink-faint)" /><div className="title">{t("nothingPlaying")}</div></div>;
  return (
    <div className="aivy-nowplaying-pane">
      <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={240} radius={16} style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
      <div className="t">{currentTrack.title}</div>
      <div className="a">{currentTrack.artist?.name}</div>
      {isPreviewClip && <div className="eyebrow" style={{ marginTop: 10 }}>{t("officialPreview")}</div>}
      <AboutArtistSection track={currentTrack} />
      <CreditsCard track={currentTrack} />
      <NextUpPreview compact />
    </div>
  );
}

export function RoomChat() {
  const { room, chatMessages, sendChatMessage } = usePlayer();
  const { authUser, t } = useUI();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages.length]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !room) return;
    sendChatMessage(text);
    setDraft("");
  };

  return (
    <div className="aivy-room-chat">
      <div className="aivy-chat-messages aivy-scroll" ref={listRef}>
        {chatMessages.length === 0 ? (
          <div className="aivy-chat-empty">{t("roomChatEmpty")}</div>
        ) : (
          chatMessages.map((m) => {
            const own = authUser && m.userId === authUser.id;
            return (
              <div key={m.id} className={`aivy-chat-msg ${own ? "own" : ""}`}>
                {!own && <span className="aivy-avatar">{m.username?.slice(0, 1).toUpperCase()}</span>}
                <div className="bubble">
                  {!own && <span className="who">{m.username}</span>}
                  <span className="txt">{m.text}</span>
                  <span className="time">{formatClockTime(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="aivy-chat-input-row">
        <input
          className="aivy-input aivy-chat-input"
          placeholder={t("chatPlaceholder")}
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
        />
        <button className="aivy-icon-btn" onClick={handleSend} disabled={!draft.trim()} aria-label={t("send")}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function RoomPane() {
  const { room, leaveRoom } = usePlayer();
  const { navigate } = useRouter();
  const { t } = useUI();
  if (!room) return null;
  return (
    <div className="aivy-room-pane">
      <div className="aivy-room-pane-head">
        <div>
          <div className="t">{room.name}</div>
          <div className="eyebrow">{room.isPublic ? <><Globe size={11} /> {t("public")}</> : <><Lock size={11} /> {t("private")}</>}{` \u00b7 ${t("createdAt")} ${relativeTime(room.createdAt)}`}</div>
        </div>
        <button className="aivy-btn-ghost" onClick={() => { leaveRoom(); navigate("roomLobby"); }}>{t("leave")}</button>
      </div>
      <div className="aivy-drawer-sub eyebrow">{t("listeningNow")} ({room.members?.length || 0})</div>
      <div className="aivy-room-members">
        {room.members?.map((m) => (
          <div key={m.id} className="aivy-room-member">
            <span className="aivy-avatar">{m.username?.slice(0, 1).toUpperCase()}</span>
            <span className="name">{m.username}</span>
            {m.isHost && <Crown size={13} color="var(--gold, var(--berry))" />}
          </div>
        ))}
      </div>
      {room.hostOnlyControl && <div className="aivy-room-note" style={{ marginTop: 14 }}>{t("hostOnlyNotice")}</div>}
    </div>
  );
}

const NAV_ITEMS = [
  { route: "home", labelKey: "navHome", icon: HomeIcon },
  { route: "shorts", labelKey: "navShorts", icon: Film },
  { route: "search", labelKey: "navSearch", icon: Search },
  { route: "library", labelKey: "navLibrary", icon: Library },
  { route: "roomLobby", labelKey: "navRooms", icon: Users },
];

export function Sidebar() {
  const { name } = useRouter();
  const {
    theme, toggleTheme, authUser, login, t,
    sidebarWidth, setSidebarWidth, sidebarCollapsed, toggleSidebarCollapsed,
  } = useUI();
  const { playlists, createPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);
  const submitCreate = () => { const val = newName.trim(); if (val) createPlaylist(val); setNewName(""); setCreating(false); };

  const { onDragStart, isDragging } = usePanelResize({
    width: sidebarWidth, setWidth: setSidebarWidth, min: SIDEBAR_MIN_W, max: SIDEBAR_MAX_W, side: "left",
  });

  if (sidebarCollapsed) {
    return (
      <aside className="aivy-sidebar aivy-sidebar-rail">
        <button
          className="aivy-panel-icon-btn aivy-rail-toggle"
          onClick={toggleSidebarCollapsed}
          aria-label={t("expandSidebar", "Buka sidebar")}
          title={t("expandSidebar", "Buka sidebar")}
        >
          <PanelLeft size={18} />
        </button>
        <nav className="aivy-nav aivy-nav-rail">
          {NAV_ITEMS.map(({ route, labelKey, icon: Icon }) => (
            <Link key={route} to={route} className={`aivy-nav-item ${name === route ? "active" : ""}`} title={t(labelKey)} aria-label={t(labelKey)}>
              <Icon size={18} />
            </Link>
          ))}
        </nav>
        <div className="aivy-side-footer aivy-side-footer-rail">
          <button className="aivy-theme-btn" onClick={toggleTheme} title={theme === "dark" ? t("navLightMode") : t("navDarkMode")} aria-label={theme === "dark" ? t("navLightMode") : t("navDarkMode")}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {authUser ? (
            <Link to="settings" className="aivy-user-chip aivy-user-chip-rail" title={authUser.username} aria-label={authUser.username}>
              <span className="aivy-avatar">{authUser.username?.slice(0, 1).toUpperCase()}</span>
            </Link>
          ) : (
            <button className="aivy-login-btn" onClick={login} title={t("navLoginDiscord")} aria-label={t("navLoginDiscord")}><LogIn size={15} /></button>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="aivy-sidebar">
      <div className="aivy-sidebar-topline">
        <button
          className="aivy-panel-icon-btn"
          onClick={toggleSidebarCollapsed}
          aria-label={t("collapseSidebar", "Tutup sidebar")}
          title={t("collapseSidebar", "Tutup sidebar")}
        >
          <PanelLeft size={18} />
        </button>
        <Link to="home" className="aivy-brand"><LeafMark size={26} color="var(--moss-strong)" className="mark" /><div className="word font-display">AIVY<small>{t("appTagline")}</small></div></Link>
      </div>
      <nav className="aivy-nav">
        {NAV_ITEMS.map(({ route, labelKey, icon: Icon }) => (
          <Link key={route} to={route} className={`aivy-nav-item ${name === route ? "active" : ""}`}><Icon size={18} /><span>{t(labelKey)}</span></Link>
        ))}
      </nav>
      <div className="aivy-side-section">
        <div className="eyebrow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{t("navYourPlaylists")}</span>
          <button className="aivy-icon-btn sm" onClick={() => setCreating((c) => !c)} aria-label={t("createPlaylist")}><Plus size={14} /></button>
        </div>
        {creating && (
          <div style={{ padding: "0 6px 8px" }}>
            <input ref={inputRef} className="aivy-input" style={{ padding: "7px 12px", fontSize: 13 }} placeholder={t("newPlaylistName")} value={newName}
              onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); if (e.key === "Escape") setCreating(false); }} onBlur={submitCreate} />
          </div>
        )}
        <div className="aivy-playlist-list aivy-scroll">
          <Link to="liked" className="aivy-playlist-row"><Heart size={15} color="var(--berry)" fill="var(--berry)" /><span>{t("navLikedSongs")}</span></Link>
          {playlists.map((pl) => <Link key={pl.id} to="playlist" params={{ id: pl.id }} className="aivy-playlist-row"><Library size={15} /><span>{pl.name}</span></Link>)}
        </div>
      </div>
      <div className="aivy-side-footer">
        <Link to="settings" className="aivy-theme-btn"><SettingsIcon size={15} />{t("navSettings")}</Link>
        <button className="aivy-theme-btn" onClick={toggleTheme}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}{theme === "dark" ? t("navLightMode") : t("navDarkMode")}</button>
        {authUser ? (
          <Link to="settings" className="aivy-user-chip">
            <span className="aivy-avatar">{authUser.username?.slice(0, 1).toUpperCase()}</span>
            <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{authUser.username}</span>
          </Link>
        ) : (
          <button className="aivy-login-btn" onClick={login}><LogIn size={15} /> {t("navLoginDiscord")}</button>
        )}
      </div>

      <div
        className={`aivy-resize-handle right ${isDragging ? "active" : ""}`}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      >
        <span className="aivy-resize-grip"><GripVertical size={12} /></span>
      </div>
    </aside>
  );
}

export function MobileTabBar() {
  const { name } = useRouter();
  const { t } = useUI();
  return (
    <nav className="aivy-tabbar">
      {NAV_ITEMS.map(({ route, labelKey, icon: Icon }) => (
        <Link key={route} to={route} className={`aivy-tab ${name === route ? "active" : ""}`}><Icon size={20} /><span>{t(labelKey)}</span></Link>
      ))}
    </nav>
  );
}

export function TopBar({ isMobile }) {
  const { name, back } = useRouter();
  const { theme, toggleTheme, authUser, login, t } = useUI();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = document.getElementById("aivy-content-scroll");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 4);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [name]);
  const titleMap = { search: t("navSearch"), library: t("navLibrary"), roomLobby: t("navRooms"), room: t("navRooms"), liked: t("navLikedSongs"), settings: t("navSettings"), shorts: t("navShorts"), home: "" };
  return (
    <div className={`aivy-topbar ${scrolled ? "scrolled" : ""}`}>
      {isMobile ? (
        <>
          {name !== "home" ? <button className="aivy-navbtn" onClick={back} aria-label={t("previous")}><ArrowLeft size={16} /></button> : <LeafMark size={20} color="var(--moss-strong)" />}
          <span className="aivy-topbar-title font-display" style={{ fontSize: 15 }}>{titleMap[name] ?? ""}</span>
        </>
      ) : (
        <div className="navbtns">
          <button className="aivy-navbtn" onClick={back} aria-label={t("previous")}><ChevronLeft size={16} /></button>
          <button className="aivy-navbtn" onClick={() => window.history.forward()} aria-label={t("next")}><ChevronRight size={16} /></button>
        </div>
      )}
      <div className="aivy-topbar-spacer" />
      {isMobile && (
        <>
          <button className="aivy-navbtn" onClick={toggleTheme} aria-label={t("navSettings")} title={t("navSettings")}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
          {!authUser && <Link to="settings" className="aivy-navbtn" aria-label={t("navSettings")} title={t("navSettings")}><SettingsIcon size={15} /></Link>}
        </>
      )}
      {isMobile && !authUser && <button className="aivy-btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={login}>{t("navLogin")}</button>}
      {isMobile && authUser && <Link to="settings" className="aivy-avatar" aria-label="Akun">{authUser.username?.slice(0, 1).toUpperCase()}</Link>}
    </div>
  );
}

export function ViewLoading() {
  return <div className="aivy-empty" style={{ paddingTop: 90 }}><IvyFallLoader size={40} /></div>;
}
export function ViewNotFound({ label }) {
  const { t } = useUI();
  return <div className="aivy-empty" style={{ paddingTop: 90 }}><LeafMark size={40} color="var(--ink-faint)" /><div className="title">{label} {t("notFoundLabel")}</div></div>;
}

const LYRICS_FONT_SIZES = {
  sm: "clamp(15px, 2.8vw, 19px)",
  md: "clamp(19px, 3.6vw, 26px)",
  lg: "clamp(23px, 4.4vw, 32px)",
};

const AM_LYRICS_FONT_SIZES = {
  sm: { "--am-lyrics-compact-font-size": "22px", "--lyplus-font-size-base": "26px", "--am-lyrics-wide-font-size": "34px" },
  md: { "--am-lyrics-compact-font-size": "28px", "--lyplus-font-size-base": "34px", "--am-lyrics-wide-font-size": "48px" },
  lg: { "--am-lyrics-compact-font-size": "34px", "--lyplus-font-size-base": "42px", "--am-lyrics-wide-font-size": "58px" },
};

function AppleLyricsPane({ track, currentTime, onSeek, highlightColor, fontSize }) {
  const elRef = useRef(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !track) return;
    let cancelled = false;
    let pollId = null;

    const applyMetadata = (forceRetrigger) => {
      if (cancelled) return;
      const cleanedTitle = cleanTrackTitleForLyrics(track.title, track.artist?.name);
      const durationMs = track.duration ? Math.round(track.duration * 1000) : undefined;
      const query = [cleanedTitle, track.artist?.name].filter(Boolean).join(" ");
      if (forceRetrigger) {
        el.songTitle = `${cleanedTitle}\u200b`;
      }
      el.songTitle = cleanedTitle;
      el.songArtist = track.artist?.name || "";
      el.songDurationMs = durationMs;
      el.query = query;
      el.autoScroll = true;
      el.interpolate = true;
    };

    const watchForFailureAndRetryOnce = () => {
      let attempts = 0;
      const maxAttempts = Math.ceil(9000 / 300);
      pollId = setInterval(() => {
        attempts++;
        if (cancelled) { clearInterval(pollId); return; }
        if (el.isLoading === false) {
          clearInterval(pollId);
          if (!el.lyricsSource && !el.ttml) {
            applyMetadata(true);
          }
          return;
        }
        if (attempts >= maxAttempts) clearInterval(pollId);
      }, 300);
    };

    if (typeof customElements !== "undefined" && customElements.get("am-lyrics")) {
      applyMetadata(false);
    } else if (typeof customElements !== "undefined") {
      customElements.whenDefined("am-lyrics").then(() => applyMetadata(false));
    } else {
      applyMetadata(false);
    }
    watchForFailureAndRetryOnce();

    return () => { cancelled = true; if (pollId) clearInterval(pollId); };
  }, [track?.id]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.round((currentTime || 0) * 1000));
  }, [currentTime]);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !highlightColor) return;
    el.highlightColor = highlightColor;
  }, [highlightColor]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const handler = (e) => onSeek?.((e.detail?.timestamp || 0) / 1000);
    el.addEventListener("line-click", handler);
    return () => el.removeEventListener("line-click", handler);
  }, [onSeek]);

  return (
    <am-lyrics
      ref={elRef}
      class="aivy-am-lyrics"
      style={AM_LYRICS_FONT_SIZES[fontSize] || AM_LYRICS_FONT_SIZES.md}
    />
  );
}

function SidebarQueuePanel() {
  const [subTab, setSubTab] = useState("queue");
  const { currentTrack, upNext, history, selectQueuePosition, clearUpNext } = usePlayer();
  const { t } = useUI();
  const recent = history.slice().reverse();
  return (
    <>
      <div className="aivy-sq-subtabs">
        <button className={subTab === "queue" ? "active" : ""} onClick={() => setSubTab("queue")}>{t("tabQueue")}</button>
        <button className={subTab === "recent" ? "active" : ""} onClick={() => setSubTab("recent")}>{t("recentlyPlayedLabel")}</button>
      </div>
      {subTab === "queue" ? (
        <>
          <div className="aivy-drawer-sub eyebrow">{t("nowPlaying")}</div>
          {currentTrack ? <QueueNowPlayingRow track={currentTrack} /> : <div className="aivy-queue-empty-hint">{t("nothingPlaying")}</div>}
          <div className="aivy-drawer-sub eyebrow aivy-queue-upnext-head">
            <span>{t("upNextLabel")}</span>
            {upNext.length > 0 && <button className="aivy-queue-clear" onClick={clearUpNext}><Trash2 size={12} /> {t("clearQueue")}</button>}
          </div>
          {upNext.length > 0 ? <QueueUpNextList items={upNext} /> : <div className="aivy-queue-empty-hint">{t("queueUpNextEmpty")}</div>}
        </>
      ) : (
        <>
          <div className="aivy-drawer-sub eyebrow">{t("recentlyPlayedLabel")}</div>
          {recent.length > 0 ? (
            recent.map((tr, i) => (
              <QueueHistoryRow key={`h-${tr.id}-${i}`} track={tr} onSelect={() => selectQueuePosition(history.length - 1 - i)} />
            ))
          ) : (
            <div className="aivy-queue-empty-hint">{t("noRecentlyPlayed")}</div>
          )}
        </>
      )}
    </>
  );
}

/* Lyrics overlay — SATU tampilan tunggal, gaya iPhone:
   background blur artwork, cover kecil + judul di kiri atas,
   star / ukuran font / titik-tiga di kanan, tombol Sing,
   scrubber dengan waktu sisa negatif, transport, volume, baris ikon. */
export function LyricsOverlay() {
  const { lyricsOpen, closeLyrics, t, openContextMenu, openMobileQueue } = useUI();
  const { currentTrack, currentTime, seekTo, liked, toggleLike } = usePlayer();
  const [fontSize, setFontSize] = useState("md");
  const [singMode, setSingMode] = useState(false);
  const isLiked = currentTrack && liked.has(String(currentTrack.videoId || currentTrack.id));
  const menuItems = useTrackMenuItems(currentTrack || {});
  const handleMore = (e) => { if (!currentTrack) return; openContextMenu(e.clientX, e.clientY, menuItems); };

  useEffect(() => {
    if (!lyricsOpen) return;
    const scrollEl = document.getElementById("aivy-content-scroll");
    const prevOverflow = scrollEl ? scrollEl.style.overflow : "";
    if (scrollEl) scrollEl.style.overflow = "hidden";
    const ALLOWED_SCROLL_SELECTOR = ".aivy-am-lyrics";
    const onTouchMove = (e) => {
      if (e.target.closest && e.target.closest(ALLOWED_SCROLL_SELECTOR)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      if (scrollEl) scrollEl.style.overflow = prevOverflow;
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [lyricsOpen]);

  const { registerFill, registerThumb, getRatio, onSeekRatio, currentTime: scrubTime, duration: scrubDuration } = useScrubberBinding();
  const cycleFontSize = () => setFontSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"));
  const remaining = Math.max(0, Math.round((scrubDuration || 0) - (scrubTime || 0)));

  if (!lyricsOpen) return null;

  return (
    <div className={`aivy-lyrics-overlay ${lyricsOpen ? "open" : ""}`}>
      {currentTrack && (
        <div className="aivy-sheet-bg" style={{ backgroundImage: `url(${currentTrack.cover})` }} aria-hidden="true" />
      )}

      {currentTrack ? (
        <div className="aivy-lyrics-main">
          <div className="aivy-lyrics-top">
            <div className="aivy-lyrics-track">
              <div className="cover">
                <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={88} radius={6} style={{ width: "100%", height: "100%" }} />
              </div>
              <div className="meta">
                <div className="t">{currentTrack.title}</div>
                <div className="a">{currentTrack.artist?.name}</div>
              </div>
            </div>
            <div className="aivy-lyrics-top-actions">
              <button className={`aivy-icon-btn ${isLiked ? "active" : ""}`} onClick={() => toggleLike(currentTrack)} aria-label={t("like")}>
                <Star size={19} fill={isLiked ? "currentColor" : "none"} />
              </button>
              <button className="aivy-icon-btn aivy-fontsize-btn" onClick={cycleFontSize} aria-label={t("fontSize")} title={`${t("fontSize")}: ${fontSize.toUpperCase()}`}>
                <Type size={17} />
                <span className="aivy-fontsize-tag">{fontSize}</span>
              </button>
              <button className="aivy-icon-btn" onClick={handleMore} aria-label={t("menuMore")}>
                <MoreHorizontal size={19} />
              </button>
            </div>
          </div>

          <div className="aivy-lyrics-body-wrap">
            <AppleLyricsPane
              track={currentTrack}
              currentTime={currentTime}
              onSeek={seekTo}
              highlightColor="#f5f5f5"
              fontSize={fontSize}
            />
          </div>

          <div className="aivy-lyrics-controls">
            <button
              type="button"
              className={`aivy-sing-btn ${singMode ? "active" : ""}`}
              onClick={() => setSingMode((v) => !v)}
              aria-pressed={singMode}
              aria-label={t("singToggle", "Sing")}
              title={t("singToggle", "Sing")}
            >
              <Mic size={13} />
              <span>{t("singLabel", "Sing")}</span>
            </button>
            <div className="aivy-lyrics-scrubber-row">
              <span className="aivy-time font-mono">{formatTime(scrubTime)}</span>
              <Scrubber getRatio={getRatio} onSeekRatio={onSeekRatio} registerFill={registerFill} registerThumb={registerThumb} />
              <span className="aivy-time right font-mono">-{formatTime(remaining)}</span>
            </div>
            <TransportButtons big />
            <AppleVolumeRow />
            <MobileNowPlayingIconRow lyricsActive onToggleLyrics={closeLyrics} lyricsDisabled={false} onOpenQueue={openMobileQueue} />
          </div>
        </div>
      ) : (
        <div className="aivy-empty" style={{ position: "relative", zIndex: 1 }}>
          <LeafMark size={34} color="var(--ink-faint)" />
          <div className="title">{t("nothingPlaying")}</div>
        </div>
      )}
    </div>
  );
}