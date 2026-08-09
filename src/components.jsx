import React, { useState, useEffect, useRef, useCallback, useMemo, Component } from "react";
import { createPortal } from "react-dom";
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, Volume1,
  VolumeX, Heart, Search, Home as HomeIcon, Library, ListMusic, ChevronDown,
  ChevronLeft, ChevronRight, X, Plus, Users, LogIn, MoreHorizontal, Clock,
  Check, ArrowLeft, Sun, Moon, Music2, Share2, UserPlus, Radio, Settings as SettingsIcon,
  Lock, Globe, Crown, Mic2, AlertTriangle, GripVertical, Trash2, Film, Send,
} from "lucide-react";
import { usePlayer, useUI } from "./context.jsx";
import { useRouter, Link } from "./router.jsx";
import { CoverArt, SmartCover, LeafMark, IvyFallLoader } from "./lib/brand.jsx";
import { formatTime, formatDuration, relativeTime, formatClockTime, parseLRC, clamp } from "./lib/utils.js";

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

export function Scrubber({ getRatio, onSeekRatio, registerFill, registerThumb, className = "" }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const ratioFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };
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
    <div className={`aivy-vol ${bumping ? "is-bumping" : ""}`} ref={rootRef}>
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

export function TrackRow({ track, index, list, showIndex = true, showAlbum = false, onRemove, removeLabel, queueMode = "single" }) {
  const { currentTrack, isPlaying, togglePlay, playSingle, playList, playRadio, selectQueuePosition, liked, toggleLike } = usePlayer();
  const { openContextMenu, t } = useUI();
  const { navigate } = useRouter();
  const isCurrent = currentTrack && currentTrack.id === track.id;
  const isLiked = liked.has(String(track.videoId || track.id));
  const items = useTrackMenuItems(track, { onRemove, removeLabel });

  const handlePlay = () => {
    if (isCurrent) { togglePlay(); return; }
    if (queueMode === "context" && list && list.length) { playList(list, index); return; }
    if (queueMode === "radio") { playRadio(track); return; }
    if (queueMode === "queue") { selectQueuePosition(index); return; }
    playSingle(track);
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
  const { addToPlaylistTarget, closeAddToPlaylist, t } = useUI();
  const { playlists, addToPlaylist, createPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);
  if (!addToPlaylistTarget) return null;

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = await createPlaylist(trimmed);
    if (id) addToPlaylist(id, addToPlaylistTarget);
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
            <button key={pl.id} onClick={() => { addToPlaylist(pl.id, addToPlaylistTarget); closeAddToPlaylist(); }}>
              <Library size={15} color="var(--ink-faint)" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
              {pl.songs?.some((s) => s.id === addToPlaylistTarget.id) && <Check size={15} color="var(--moss-strong)" />}
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
  const { toggleLyrics, t } = useUI();
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
          <Scrubber getRatio={getRatio} onSeekRatio={onSeekRatio} registerFill={registerFill} registerThumb={registerThumb} />
          <span className="aivy-time right font-mono">{formatTime(duration)}</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: "min(20%, 220px)", justifyContent: "flex-end" }}>
        <button className="aivy-icon-btn sm" onClick={toggleLyrics} disabled={lyricsDisabled} aria-label={t("lyrics")} title={lyricsDisabled && currentTrack ? t("lyricsUnavailable") : t("lyrics")}><Mic2 size={16} /></button>
        <VolumeControl />
      </div>
    </div>
  );
}

export function MiniPlayer({ onExpand }) {
  const { currentTrack, isPlaying, togglePlay, next } = usePlayer();
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
      <div className="mini-progress"><div className="fill" ref={registerFill} /></div>
    </div>
  );
}

export function NowPlayingSheet({ open, onClose, onOpenQueue }) {
  const { currentTrack, liked, toggleLike, isPreviewClip, currentTrackHasLyrics } = usePlayer();
  const { navigate } = useRouter();
  const { toggleLyrics, t } = useUI();
  const { registerFill, registerThumb, getRatio, onSeekRatio, currentTime, duration } = useScrubberBinding();
  const isLiked = currentTrack && liked.has(String(currentTrack.videoId || currentTrack.id));
  const lyricsDisabled = !currentTrack || !currentTrackHasLyrics;
  return (
    <>
      <div className={`aivy-sheet-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`aivy-sheet ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="aivy-sheet-head">
          <button className="aivy-icon-btn" onClick={onClose} aria-label={t("close")}><ChevronDown size={22} /></button>
          <span className="eyebrow">{isPreviewClip ? t("preview30") : t("nowPlaying")}</span>
          <div style={{ display: "flex", gap: 2 }}>
            <button className="aivy-icon-btn" onClick={toggleLyrics} disabled={lyricsDisabled} aria-label={t("lyrics")} title={lyricsDisabled && currentTrack ? t("lyricsUnavailable") : t("lyrics")}><Mic2 size={19} /></button>
            <button className="aivy-icon-btn" onClick={onOpenQueue} aria-label={t("openQueue")}><ListMusic size={19} /></button>
          </div>
        </div>
        {currentTrack && (
          <div className="aivy-sheet-body aivy-scroll">
            <div className="aivy-sheet-art"><SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={320} radius={20} style={{ width: "100%", height: "100%" }} /></div>
            <div className="aivy-sheet-meta">
              <div>
                <div className="t">{currentTrack.title}</div>
                <div className="a" onClick={() => { currentTrack.artist?.id && navigate("artist", { params: { id: currentTrack.artist.id } }); onClose(); }}>{currentTrack.artist?.name}</div>
              </div>
              <button className={`aivy-icon-btn ${isLiked ? "active" : ""}`} onClick={() => toggleLike(currentTrack)} aria-label={t("like")} style={{ flexShrink: 0 }}><Heart size={22} fill={isLiked ? "currentColor" : "none"} /></button>
            </div>
            <div className="aivy-scrubber-row">
              <span className="aivy-time font-mono">{formatTime(currentTime)}</span>
              <Scrubber getRatio={getRatio} onSeekRatio={onSeekRatio} registerFill={registerFill} registerThumb={registerThumb} />
              <span className="aivy-time right font-mono">{formatTime(duration)}</span>
            </div>
            <TransportButtons big />
          </div>
        )}
      </div>
    </>
  );
}

export function QueueSheet({ open, onClose }) {
  const { t } = useUI();
  return (
    <>
      <div className={`aivy-sheet-backdrop ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`aivy-sheet aivy-queue-sheet ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="aivy-sheet-head">
          <button className="aivy-icon-btn" onClick={onClose} aria-label={t("close")}><ChevronDown size={22} /></button>
          <span className="eyebrow">{t("tabQueue")}</span>
          <span style={{ width: 38 }} />
        </div>
        <div className="aivy-sheet-body aivy-scroll aivy-queue-sheet-body">
          <QueueBody />
        </div>
      </div>
    </>
  );
}

export function RightPanel() {
  const { room } = usePlayer();
  const { t } = useUI();
  const [tab, setTab] = useState("queue");
  useEffect(() => { if (room) setTab("room"); }, [!!room]);

  return (
    <aside className="aivy-rightpanel">
      <div className="aivy-rightpanel-tabs">
        <button className={tab === "now" ? "active" : ""} onClick={() => setTab("now")}>{t("tabNowPlaying")}</button>
        <button className={tab === "queue" ? "active" : ""} onClick={() => setTab("queue")}>{t("tabQueue")}</button>
        {room && <button className={tab === "room" ? "active" : ""} onClick={() => setTab("room")}>{t("tabRoom")}</button>}
      </div>
      <div className="aivy-rightpanel-body aivy-scroll">
        {tab === "now" && <NowPlayingPane />}
        {tab === "queue" && <QueueBody />}
        {tab === "room" && room && <RoomPane />}
      </div>
    </aside>
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
  const { currentTrack, upNext, history, selectQueuePosition, clearUpNext, suggestedQueue, promoteSuggestion, room } = usePlayer();
  const { t } = useUI();

  if (!currentTrack) {
    return <div className="aivy-empty"><LeafMark size={34} color="var(--ink-faint)" /><div className="title">{t("queueEmpty")}</div><div className="sub">{t("queueEmptySub")}</div></div>;
  }

  return (
    <>
      <div className="aivy-drawer-sub eyebrow">{t("nowPlaying")}</div>
      <QueueNowPlayingRow track={currentTrack} />

      <div className="aivy-drawer-sub eyebrow aivy-queue-upnext-head">
        <span>{t("upNextLabel")}</span>
        {upNext.length > 0 && (
          <button className="aivy-queue-clear" onClick={clearUpNext}><Trash2 size={12} /> {t("clearQueue")}</button>
        )}
      </div>
      {upNext.length > 0 ? (
        <QueueUpNextList items={upNext} />
      ) : (
        <div className="aivy-queue-empty-hint">{t("queueUpNextEmpty")}</div>
      )}

      {!room && suggestedQueue.length > 0 && (
        <>
          <div className="aivy-drawer-sub eyebrow aivy-queue-suggested-head">
            <Radio size={12} /><span>{t("suggestedSongsLabel")}</span>
          </div>
          <div className="aivy-queue-suggested-hint">{t("suggestedSongsHint")}</div>
          <QueueSuggestedRow track={suggestedQueue[0]} onAdd={() => promoteSuggestion(suggestedQueue[0])} />
        </>
      )}

      {history.length > 0 && <div className="aivy-drawer-sub eyebrow">{t("playedLabel")}</div>}
      {history.map((tr, i) => (
        <QueueHistoryRow key={`h-${tr.id}-${i}`} track={tr} onSelect={() => selectQueuePosition(i)} />
      ))}
    </>
  );
}

function NowPlayingPane() {
  const { currentTrack, isPreviewClip, currentTrackHasLyrics } = usePlayer();
  const { toggleLyrics, t } = useUI();
  if (!currentTrack) return <div className="aivy-empty"><LeafMark size={34} color="var(--ink-faint)" /><div className="title">{t("nothingPlaying")}</div></div>;
  return (
    <div className="aivy-nowplaying-pane">
      <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={240} radius={16} style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
      <div className="t">{currentTrack.title}</div>
      <div className="a">{currentTrack.artist?.name}</div>
      {isPreviewClip && <div className="eyebrow" style={{ marginTop: 10 }}>{t("officialPreview")}</div>}
      <button className="aivy-btn-ghost" style={{ marginTop: 16 }} onClick={toggleLyrics} disabled={!currentTrackHasLyrics} title={!currentTrackHasLyrics ? t("lyricsUnavailable") : undefined}><Mic2 size={14} /> {currentTrackHasLyrics ? t("seeLyrics") : t("lyricsUnavailable")}</button>
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
  { route: "search", labelKey: "navSearch", icon: Search },
  { route: "library", labelKey: "navLibrary", icon: Library },
  { route: "shorts", labelKey: "navShorts", icon: Film },
  { route: "roomLobby", labelKey: "navRooms", icon: Users },
];

export function Sidebar() {
  const { name } = useRouter();
  const { theme, toggleTheme, authUser, login, t } = useUI();
  const { playlists, createPlaylist } = usePlayer();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { if (creating) inputRef.current?.focus(); }, [creating]);
  const submitCreate = () => { const val = newName.trim(); if (val) createPlaylist(val); setNewName(""); setCreating(false); };

  return (
    <aside className="aivy-sidebar">
      <Link to="home" className="aivy-brand"><LeafMark size={26} color="var(--moss-strong)" className="mark" /><div className="word font-display">AIVY<small>{t("appTagline")}</small></div></Link>
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
        {}
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
          {}
          <button className="aivy-navbtn" onClick={toggleTheme} aria-label={t("navSettings")} title={t("navSettings")}>{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
          {}
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

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(" ");
  let line = "";
  let lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

export function LyricsOverlay() {
  const { lyricsOpen, closeLyrics, pushToast, t } = useUI();
  const { currentTrack, currentTime, seekTo, isPreviewClip, liked, toggleLike, upNext } = usePlayer();
  const [state, setState] = useState({ loading: false, synced: [], plain: "", checkedFor: null });
  const [fontSize, setFontSize] = useState("md");
  const [shareOpen, setShareOpen] = useState(false);
  const lineRefs = useRef([]);
  const trackKey = currentTrack?.id;
  const isLiked = currentTrack && liked.has(String(currentTrack.videoId || currentTrack.id));
  const nextTrack = upNext?.[0];

  useEffect(() => {
    if (!lyricsOpen) return;
    const scrollEl = document.getElementById("aivy-content-scroll");
    const prevOverflow = scrollEl ? scrollEl.style.overflow : "";
    if (scrollEl) scrollEl.style.overflow = "hidden";

    const ALLOWED_SCROLL_SELECTOR = ".aivy-lyrics-body, .aivy-lyrics-plain, .aivy-lyrics-side";
    const onTouchMove = (e) => {
      if (e.target.closest(ALLOWED_SCROLL_SELECTOR)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      if (scrollEl) scrollEl.style.overflow = prevOverflow;
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, [lyricsOpen]);

  useEffect(() => {
    if (!lyricsOpen || !currentTrack) return;
    if (state.checkedFor === trackKey) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    import("./lib/api.js").then(({ Api }) => {
      Api.lyrics({ title: currentTrack.title, artist: currentTrack.artist?.name, duration: currentTrack.duration })
        .then((res) => {
          if (cancelled) return;
          setState({ loading: false, synced: parseLRC(res.synced), plain: res.plain || "", checkedFor: trackKey });
        })
        .catch(() => {
          if (cancelled) return;
          setState({ loading: false, synced: [], plain: "", checkedFor: trackKey });
        });
    });
    return () => { cancelled = true; };
  }, [lyricsOpen, trackKey]);

  const activeIndex = useMemo(() => {
    if (!state.synced.length) return -1;
    let idx = -1;
    for (let i = 0; i < state.synced.length; i++) {
      if (state.synced[i].time <= currentTime + 0.15) idx = i; else break;
    }
    return idx;
  }, [state.synced, currentTime]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const el = lineRefs.current[activeIndex];
    const container = el?.closest(".aivy-lyrics-body");
    if (!el || !container) return;
    const target = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top: target, behavior: "smooth" });
  }, [activeIndex]);

  const activeLineText = useMemo(() => {
    if (state.synced[activeIndex]?.text) return state.synced[activeIndex].text;
    if (state.plain) return state.plain.split("\n").find((l) => l.trim()) || "";
    return "";
  }, [state, activeIndex]);

  const handleSaveImage = useCallback(() => {
    if (!currentTrack) return;
    const line = activeLineText || currentTrack.title;
    const canvas = document.createElement("canvas");
    canvas.width = 800; canvas.height = 800;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#21251A");
    grad.addColorStop(1, "#12140F");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ADC79C";
    ctx.font = "600 42px Georgia, serif";
    ctx.textAlign = "center";
    wrapCanvasText(ctx, line, canvas.width / 2, 380, 680, 54);
    ctx.fillStyle = "#676B57";
    ctx.font = "500 22px sans-serif";
    ctx.fillText(`${currentTrack.artist?.name || ""} \u00b7 ${currentTrack.title || ""}`, canvas.width / 2, canvas.height - 80);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lirik-${(currentTrack.title || "lagu").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast(t("toastLyricsImageSaved"));
    });
  }, [currentTrack, activeLineText, pushToast, t]);

  if (!lyricsOpen) return null;

  return (
    <div className={`aivy-lyrics-overlay ${lyricsOpen ? "open" : ""}`}>
      {currentTrack?.cover && <div className="aivy-lyrics-bg" style={{ backgroundImage: `url(${currentTrack.cover})` }} />}
      <div className="aivy-lyrics-scrim" />

      <div className="aivy-lyrics-head">
        <button className="aivy-icon-btn" onClick={closeLyrics} aria-label={t("close")}><ChevronDown size={22} /></button>
        <span className="eyebrow">{isPreviewClip ? t("preview30") : t("nowPlaying")}</span>
        <div className="aivy-lyrics-head-actions">
          <button
            className={`aivy-icon-btn sm ${isLiked ? "active" : ""}`}
            onClick={() => currentTrack && toggleLike(currentTrack)}
            disabled={!currentTrack}
            aria-label={t("like")}
          >
            <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
          </button>
          <button
            className="aivy-icon-btn sm"
            onClick={() => setShareOpen((v) => !v)}
            disabled={!currentTrack}
            aria-label={t("share")}
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>

      {currentTrack && (
        <div className="aivy-lyrics-main">
          <div className="aivy-lyrics-side">
            <div className="aivy-lyrics-track">
              <div className="cover">
                <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={120} radius={8} style={{ width: "100%", height: "100%" }} />
              </div>
              <div className="meta">
                <div className="t">{currentTrack.title}</div>
                <div className="a">{currentTrack.artist?.name}</div>
              </div>
            </div>

            <div className="aivy-lyrics-fontctrl">
              <span>{t("fontSize")}</span>
              {["sm", "md", "lg"].map((sz) => (
                <button
                  key={sz}
                  className={fontSize === sz ? "active" : ""}
                  onClick={() => setFontSize(sz)}
                  aria-label={`${t("fontSize")} ${sz}`}
                >A</button>
              ))}
            </div>

            {shareOpen && (
              <div className="aivy-lyrics-share">
                <div className="cover-mini">
                  <SmartCover src={currentTrack.cover} seed={currentTrack.id + currentTrack.title} size={72} radius={8} style={{ width: "100%", height: "100%" }} />
                </div>
                <div className="line">{activeLineText || "\u266a"}</div>
                <div className="sub">{currentTrack.artist?.name} &middot; {currentTrack.title}</div>
                <button onClick={handleSaveImage}>{t("saveAsImage")}</button>
              </div>
            )}

            {nextTrack && (
              <div className="aivy-lyrics-next">
                <ListMusic size={14} />
                <span className="label">{t("upNextLabel")}</span>
                <span className="name">{nextTrack.title} &mdash; {nextTrack.artist?.name}</span>
              </div>
            )}
          </div>

          <div className="aivy-lyrics-body-wrap" style={{ "--lyrics-fs": LYRICS_FONT_SIZES[fontSize] }}>
            {state.loading ? (
              <div className="aivy-empty" style={{ position: "relative", zIndex: 1 }}><IvyFallLoader size={54} /><div className="sub">{t("searchingLyrics")}</div></div>
            ) : state.synced.length > 0 ? (
              <div className="aivy-lyrics-body aivy-scroll">
                <div style={{ height: "38vh" }} />
                {state.synced.map((line, i) => (
                  <div
                    key={i} ref={(el) => (lineRefs.current[i] = el)}
                    className={`aivy-lyrics-line ${i === activeIndex ? "active" : Math.abs(i - activeIndex) === 1 ? "near" : ""}`}
                    onClick={() => seekTo(line.time)}
                  >
                    {line.text || "\u266a"}
                  </div>
                ))}
                <div style={{ height: "38vh" }} />
              </div>
            ) : state.plain ? (
              <div className="aivy-lyrics-plain aivy-scroll">{state.plain}</div>
            ) : (
              <div className="aivy-empty" style={{ position: "relative", zIndex: 1 }}>
                <LeafMark size={34} color="var(--ink-faint)" />
                <div className="title">{t("lyricsNotFound")}</div>
                <div className="sub">{t("lyricsNotFoundSub")}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {!currentTrack && (
        <div className="aivy-empty" style={{ position: "relative", zIndex: 1 }}><LeafMark size={34} color="var(--ink-faint)" /><div className="title">{t("nothingPlaying")}</div></div>
      )}

      {currentTrack && (
        <div className="aivy-lyrics-footer">
          <TransportButtons />
        </div>
      )}
    </div>
  );
}