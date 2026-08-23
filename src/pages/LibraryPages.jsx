import React, { useMemo } from "react";
import { Heart, Play, Library as LibraryIcon, Youtube, Music2, ListMusic, ArrowLeft, ArrowRight, Check, Loader2, ClipboardList, PlusCircle, ImagePlus, X, RotateCcw, Pencil, MoreHorizontal, Shuffle, Share2, Globe, Lock, Search, ListPlus } from "lucide-react";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";
import { TrackRow, ViewNotFound, ConfirmDialog, CustomSelect } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";
import { Api } from "../lib/api.js";

export function LibraryPage() {
  const { playlists, liked } = usePlayer();
  const { t } = useUI();
  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{t("yourLibrary")}</h1>
        <Link to="libraryImport" className="aivy-btn-ghost"><Youtube size={15} /> Import dari YouTube</Link>
      </div>
      <div className="aivy-grid">
        <Link to="liked" className="aivy-card" style={{ textAlign: "left" }}>
          <div className="art-wrap">
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, var(--berry), var(--bg-elev-3))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={30} color="var(--moss-ink)" fill="var(--moss-ink)" />
            </div>
          </div>
          <div className="title">{t("navLikedSongs")}</div><div className="sub">{liked.size} {t("songsCount")}</div>
        </Link>
        {playlists.map((pl) => {
          const cover = pl.cover_thumbnail ?? pl.songs?.[0]?.cover ?? null;
          const count = pl.songs ? pl.songs.length : (pl.song_count ?? 0);
          return (
            <Link key={pl.id} to="playlist" params={{ id: pl.id }} className="aivy-card" style={{ textAlign: "left" }}>
              <div className="art-wrap">
                {cover ? (
                  <SmartCover src={cover} seed={"pl" + pl.id} size={160} radius={10} style={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)", background: "var(--bg-elev-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LibraryIcon size={26} color="var(--ink-faint)" />
                  </div>
                )}
              </div>
              <div className="title">{pl.name}</div><div className="sub">{count} {t("songsCount")}</div>
            </Link>
          );
        })}
      </div>
      {playlists.length === 0 && <p className="eyebrow" style={{ padding: "8px 2px" }}>{t("noPlaylistsYetLong")}</p>}
    </div>
  );
}

export function LikedPage() {
  const { liked, toggleLike, playList } = usePlayer();
  const { t } = useUI();
  const [likedTracks, setLikedTracks] = React.useState(null);

  const normalizeLiked = (rows) => rows.map((r) => ({
    id: r.video_id,
    videoId: r.video_id,
    title: r.title,
    artist: r.artist_name ? { name: r.artist_name } : null,
    cover: r.thumbnail,
    duration: r.duration,
  }));

  const fetchLiked = () => {
    import("../lib/api.js").then(({ Api }) =>
      Api.likes()
        .then((rows) => setLikedTracks(normalizeLiked(rows)))
        .catch(() => setLikedTracks([]))
    );
  };

  React.useEffect(() => { fetchLiked(); }, []);

  const handleUnlike = async (track) => {
    setLikedTracks((prev) => prev.filter((tr) => tr.id !== track.id));
    await toggleLike(track);
  };

  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art"><div style={{ width: 176, height: 176, borderRadius: "var(--radius-lg)", background: "linear-gradient(150deg, var(--berry), var(--bg-elev-3))", display: "flex", alignItems: "center", justifyContent: "center" }}><Heart size={54} color="var(--moss-ink)" fill="var(--moss-ink)" /></div></div>
        <div className="aivy-hero-meta"><div className="eyebrow">{t("playlistLabel")}</div><h1 className="font-display">{t("navLikedSongs")}</h1><div className="stats"><span>{liked.size} {t("songsCount")}</span></div></div>
      </div>
      {likedTracks === null ? null : likedTracks.length > 0 ? (
        <>
          <div className="aivy-hero-actions"><button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(likedTracks, 0, { type: "library", label: t("navLikedSongs") })} aria-label={t("playAll")}><Play size={22} fill="currentColor" /></button></div>
          <div>{likedTracks.map((tr, i) => <TrackRow key={tr.id} track={tr} index={i} list={likedTracks} showAlbum onRemove={() => handleUnlike(tr)} removeLabel={t("menuRemoveLiked")} queueMode="context" source={{ type: "library", label: t("navLikedSongs") }} />)}</div>
        </>
      ) : (
        <div className="aivy-empty"><Heart size={38} color="var(--ink-faint)" /><div className="title">{t("noLikedYet")}</div><div className="sub">{t("noLikedYetSub")}</div></div>
      )}
    </div>
  );
}

function PlaylistCoverModal({ pl, onClose }) {
  const { setPlaylistCover } = usePlayer();
  const { t } = useUI();

  // unique thumbnails available across the playlist's songs
  const options = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const s of pl.songs || []) {
      if (!s.cover || seen.has(s.cover)) continue;
      seen.add(s.cover);
      out.push(s);
    }
    return out;
  }, [pl.songs]);

  const currentCover = pl.cover_thumbnail ?? null;

  const handlePick = (song) => {
    setPlaylistCover(pl.id, song.cover, song.videoId || song.id);
    onClose();
  };

  const handleReset = () => {
    setPlaylistCover(pl.id, null, null);
    onClose();
  };

  return (
    <div className="aivy-modal-backdrop" onClick={onClose}>
      <div className="aivy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aivy-modal-head">
          <div className="aivy-modal-title">{t("changeCoverTitle")}</div>
          <button className="aivy-icon-btn sm" onClick={onClose} aria-label={t("close")}><X size={17} /></button>
        </div>
        <p className="aivy-bio" style={{ padding: 0, marginBottom: 14, fontSize: 13 }}>{t("changeCoverSub")}</p>
        {options.length > 0 ? (
          <div className="aivy-cover-pick-grid">
            {options.map((s) => (
              <button
                key={s.id}
                className={`aivy-cover-pick-item ${currentCover === s.cover ? "active" : ""}`}
                onClick={() => handlePick(s)}
                title={s.title}
              >
                <SmartCover src={s.cover} seed={"cov" + s.id} size={110} radius={8} style={{ width: "100%", aspectRatio: "1 / 1" }} />
                {currentCover === s.cover && <span className="check"><Check size={14} /></span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="eyebrow" style={{ padding: "8px 2px" }}>{t("changeCoverEmpty")}</div>
        )}
        {currentCover && (
          <button className="aivy-btn-ghost" style={{ width: "100%", marginTop: 14 }} onClick={handleReset}>
            <RotateCcw size={14} /> {t("useDefaultCover")}
          </button>
        )}
      </div>
    </div>
  );
}

function PlaylistEditModal({ pl, onClose }) {
  const { updatePlaylistMeta } = usePlayer();
  const { t } = useUI();
  const [name, setName] = React.useState(pl.name || "");
  const [description, setDescription] = React.useState(pl.description || "");
  const [isPublic, setIsPublic] = React.useState(!!pl.is_public);
  const [saving, setSaving] = React.useState(false);
  const nameRef = React.useRef(null);

  React.useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const ok = await updatePlaylistMeta(pl.id, { name: trimmed, description: description.trim(), isPublic });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="aivy-modal-backdrop" onClick={onClose}>
      <div className="aivy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aivy-modal-head">
          <div className="aivy-modal-title">{t("editPlaylistTitle")}</div>
          <button className="aivy-icon-btn sm" onClick={onClose} aria-label={t("close")}><X size={17} /></button>
        </div>
        <div className="aivy-field">
          <label className="aivy-field-label" htmlFor="pl-edit-name">{t("playlistNameLabel")}</label>
          <input
            id="pl-edit-name"
            ref={nameRef}
            className="aivy-input"
            placeholder={t("playlistNamePlaceholder")}
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
          />
        </div>
        <div className="aivy-field">
          <label className="aivy-field-label" htmlFor="pl-edit-desc">{t("playlistDescLabel")}</label>
          <textarea
            id="pl-edit-desc"
            className="aivy-textarea"
            placeholder={t("playlistDescPlaceholder")}
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="aivy-settings-row" style={{ padding: "10px 0", borderBottom: "none" }}>
          <div><div className="label">{t("makePublicLabel")}</div><div className="hint">{t("makePublicHint")}</div></div>
          <span
            className={`aivy-switch ${isPublic ? "on" : ""}`}
            onClick={() => setIsPublic((v) => !v)}
            role="switch"
            aria-checked={isPublic}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setIsPublic((v) => !v); } }}
          >
            <span className="knob" />
          </span>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button className="aivy-btn-primary" style={{ flex: 1 }} disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? <Loader2 size={15} className="aivy-spin" /> : t("save")}
          </button>
          <button className="aivy-btn-ghost" onClick={onClose}>{t("cancel")}</button>
        </div>
      </div>
    </div>
  );
}

export function PlaylistPage() {
  const { params } = useRouter();
  const { playlists, playList, toggleShuffle, removeFromPlaylist, deletePlaylist, setPlaylistDetail, addAllToQueueEnd, playAllNext } = usePlayer();
  const { navigate } = useRouter();
  const { openContextMenu, openAddToPlaylist, pushToast, authUser, t } = useUI();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const searchRef = React.useRef(null);
  const pl = playlists.find((p) => String(p.id) === String(params.id));

  React.useEffect(() => {
    if (!params.id) return;
    import("../lib/api.js").then(({ Api }) =>
      Api.playlist(params.id)
        .then((detail) => setPlaylistDetail(detail))
        .catch(() => {})
    );
  }, [params.id]);

  React.useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  React.useEffect(() => { setSearchOpen(false); setQuery(""); }, [params.id]);

  if (!pl) return <ViewNotFound label={t("playlistLabel")} />;
  const isOwner = !!authUser && String(authUser.id) === String(pl.user_id);
  const cover = pl.cover_thumbnail ?? pl.songs?.[0]?.cover ?? null;
  const q = query.trim().toLowerCase();
  const visibleSongs = q
    ? (pl.songs || []).filter((s) => s.title?.toLowerCase().includes(q) || s.artist?.name?.toLowerCase().includes(q))
    : pl.songs;

  return (
    <div className="aivy-view-enter aivy-playlist-page">
      {cover && (
        <div className="aivy-playlist-banner">
          <SmartCover src={cover} seed={"banner-pl" + pl.id} size={800} radius={0} style={{ width: "100%", height: "100%" }} />
          <div className="aivy-playlist-banner-fade" />
        </div>
      )}
      <div className={`aivy-hero ${cover ? "aivy-playlist-hero" : ""}`}>
        <div className="art" style={{ position: "relative" }}>
          {cover ? <SmartCover src={cover} seed={"pl" + pl.id} size={176} radius={16} style={{ width: 176, height: 176 }} /> : (
            <div style={{ width: 176, height: 176, borderRadius: "var(--radius-lg)", background: "var(--bg-elev-2)", display: "flex", alignItems: "center", justifyContent: "center" }}><LibraryIcon size={40} color="var(--ink-faint)" /></div>
          )}
          {isOwner && (
            <button className="aivy-cover-edit-btn" onClick={() => setCoverPickerOpen(true)} aria-label={t("changeCoverBtn")} title={t("changeCoverBtn")}>
              <ImagePlus size={16} />
            </button>
          )}
        </div>
        <div className="aivy-hero-meta">
          <div className="eyebrow">
            {t("playlistLabel")}
            {pl.is_public !== undefined && (
              <span className="aivy-playlist-visibility" style={{ marginLeft: 6 }}>
                · {pl.is_public ? <Globe size={12} /> : <Lock size={12} />} {pl.is_public ? t("publicLabel") : t("privateLabel")}
              </span>
            )}
          </div>
          <h1 className="font-display">{pl.name}</h1>
          <div className="stats"><span>{pl.songs?.length || 0} {t("songsCount")}</span></div>
        </div>
      </div>
      <div className="aivy-hero-actions">
        {isOwner && (
          <button className="aivy-icon-btn-outline" onClick={() => setEditOpen(true)} aria-label={t("editPlaylistBtn")} title={t("editPlaylistBtn")}>
            <Pencil size={16} />
          </button>
        )}
        {pl.songs?.length > 0 && <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(pl.songs, 0, { type: "library", label: pl.name })} aria-label={t("playAll")}><Play size={22} fill="currentColor" /></button>}
        <button
          className="aivy-icon-btn-outline"
          aria-label={t("playlistMenuLabel")}
          title={t("playlistMenuLabel")}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const hasSongs = pl.songs?.length > 0;
            openContextMenu(r.left, r.bottom + 6, [
              ...(hasSongs ? [{ label: t("shufflePlayBtn"), icon: <Shuffle size={15} />, onSelect: () => { toggleShuffle(); playList(pl.songs, 0, { type: "library", label: pl.name }); } }] : []),
              ...(hasSongs ? [{ label: t("findInPlaylistBtn"), icon: <Search size={15} />, onSelect: () => setSearchOpen(true) }] : []),
              ...(hasSongs ? [{ label: t("playAfterThisBtn"), icon: <ListPlus size={15} />, onSelect: () => playAllNext(pl.songs) }] : []),
              ...(hasSongs ? [{ label: t("addToQueueBtn"), icon: <ListMusic size={15} />, onSelect: () => addAllToQueueEnd(pl.songs) }] : []),
              ...(hasSongs ? [{ label: t("saveToPlaylistBtn"), icon: <LibraryIcon size={15} />, onSelect: () => openAddToPlaylist(pl.songs) }] : []),
              ...(isOwner ? [{ label: t("changeCoverBtn"), icon: <ImagePlus size={15} />, onSelect: () => setCoverPickerOpen(true) }] : []),
              { label: t("sharePlaylistBtn"), icon: <Share2 size={15} />, onSelect: () => { navigator.clipboard?.writeText(window.location.href); pushToast(t("playlistLinkCopied")); } },
              ...(isOwner ? [{ divider: true }, { label: t("deletePlaylistBtn"), icon: <X size={15} />, onSelect: () => setConfirmDelete(true) }] : []),
            ]);
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      {searchOpen && (
        <div className="aivy-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} color="var(--ink-faint)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
            <input
              ref={searchRef}
              className="aivy-input"
              style={{ paddingLeft: 38, marginBottom: 0 }}
              placeholder={t("findInPlaylistPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setQuery(""); } }}
            />
          </div>
          <button className="aivy-icon-btn sm" onClick={() => { setSearchOpen(false); setQuery(""); }} aria-label={t("close")}><X size={17} /></button>
        </div>
      )}
      {isOwner && coverPickerOpen && <PlaylistCoverModal pl={pl} onClose={() => setCoverPickerOpen(false)} />}
      {isOwner && editOpen && <PlaylistEditModal pl={pl} onClose={() => setEditOpen(false)} />}
      <ConfirmDialog
        open={confirmDelete}
        title={`${t("deletePlaylistConfirmTitle")} "${pl.name}"?`}
        message={t("deletePlaylistConfirmMsg")}
        confirmLabel={t("yesDelete")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); deletePlaylist(pl.id); navigate("library"); }}
      />
      {pl.songs?.length > 0 ? (
        visibleSongs.length > 0 ? (
          <div>{visibleSongs.map((tr) => <TrackRow key={tr.id} track={tr} index={pl.songs.indexOf(tr)} list={pl.songs} showAlbum onRemove={isOwner ? () => removeFromPlaylist(pl.id, tr.id) : undefined} removeLabel={t("removeFromThisPlaylist")} queueMode="context" source={{ type: "library", label: pl.name }} />)}</div>
        ) : (
          <div className="aivy-empty"><div className="title">{t("findInPlaylistNoResults")}</div></div>
        )
      ) : (
        <div className="aivy-empty"><div className="title">{t("playlistEmpty")}</div><div className="sub">{t("playlistEmptySub")}</div></div>
      )}
    </div>
  );
}

const IMPORT_STEPS = [
  { n: 1, label: "Sumber" },
  { n: 2, label: "Konfigurasi" },
  { n: 3, label: "Import" },
];

function ImportStepper({ step }) {
  return (
    <div className="aivy-import-steps">
      {IMPORT_STEPS.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={`aivy-import-step-dot ${step === s.n ? "active" : step > s.n ? "done" : ""}`}>
              {step > s.n ? <Check size={14} /> : s.n}
            </div>
            <span className={`aivy-import-step-label ${step === s.n ? "active" : ""}`}>{s.label}</span>
          </div>
          {i < IMPORT_STEPS.length - 1 && <div className={`aivy-import-step-line ${step > s.n ? "done" : ""}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function formatSongCount(n) {
  return `${n} lagu`;
}

export function ImportPage() {
  const { playlists, refreshPlaylists } = usePlayer();
  const { navigate } = useRouter();

  const [step, setStep] = React.useState(1);
  const [sourceTab, setSourceTab] = React.useState("youtube");
  const [url, setUrl] = React.useState("");
  const [resolving, setResolving] = React.useState(false);
  const [resolveError, setResolveError] = React.useState(null);
  const [resolved, setResolved] = React.useState(null);

  const [targetMode, setTargetMode] = React.useState(playlists.length > 0 ? "existing" : "new");
  const [selectedPlaylistId, setSelectedPlaylistId] = React.useState(playlists[0]?.id || "");
  const [newName, setNewName] = React.useState("");

  const [committing, setCommitting] = React.useState(false);
  const [commitError, setCommitError] = React.useState(null);
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState(null);
  const progressTimer = React.useRef(null);

  const handleResolve = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setResolving(true);
    setResolveError(null);
    try {
      const data = await Api.resolveYoutubeImport(trimmed);
      setResolved(data);
      setNewName(data.title || "Playlist Impor");
      setStep(2);
    } catch (err) {
      setResolveError(err.message || "Gagal ambil data playlist, coba cek link-nya lagi.");
    } finally {
      setResolving(false);
    }
  };

  const startFakeProgress = () => {
    setProgress(8);
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p < 88 ? p + Math.max(1, (88 - p) / 12) : p));
    }, 220);
  };
  const stopFakeProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
  };
  React.useEffect(() => () => stopFakeProgress(), []);

  const handleCommit = async () => {
    if (targetMode === "existing" && !selectedPlaylistId) return;
    setStep(3);
    setCommitting(true);
    setCommitError(null);
    startFakeProgress();
    try {
      const body = { songs: resolved.songs, sourceTitle: resolved.title };
      if (targetMode === "existing") body.playlistId = selectedPlaylistId;
      else body.newPlaylistName = (newName || resolved.title || "Playlist Impor").trim();

      const res = await Api.commitYoutubeImport(body);
      stopFakeProgress();
      setProgress(100);
      setResult(res);
      refreshPlaylists();
    } catch (err) {
      stopFakeProgress();
      setCommitError(err.message || "Import gagal, coba lagi ya.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="aivy-view-enter aivy-import-page">
      <Link to="library" className="aivy-import-back"><ArrowLeft size={14} /> Balik ke Koleksi</Link>
      <div className="aivy-greet" style={{ paddingBottom: 4 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(20px,3vw,26px)" }}>Import Playlist</h1>
      </div>
      <ImportStepper step={step} />

      {step === 1 && (
        <div>
          <div className="aivy-import-tabs">
            <button className={`aivy-import-tab ${sourceTab === "youtube" ? "active" : ""}`} onClick={() => setSourceTab("youtube")}>
              <Youtube size={20} color="var(--berry-strong)" />
              <span className="name">YouTube</span>
            </button>
            <button className="aivy-import-tab locked" disabled>
              <Music2 size={20} color="var(--ink-faint)" />
              <span className="name">Spotify</span>
              <span className="badge">Coming soon</span>
            </button>
          </div>

          {sourceTab === "youtube" && (
            <>
              <input
                className="aivy-input"
                placeholder="Tempel link playlist YouTube di sini..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) handleResolve(); }}
              />
              {resolveError && <div className="aivy-import-error">{resolveError}</div>}

              <div className="aivy-import-tutorial">
                <div className="head"><ClipboardList size={15} color="var(--moss-strong)" /> Cara salin link playlist YouTube</div>
                <ol>
                  <li>Buka aplikasi atau situs YouTube, lalu buka playlist yang mau diimpor.</li>
                  <li>Ketuk tombol "Bagikan" (ikon panah / titik tiga di atas playlist).</li>
                  <li>Pilih "Salin link", lalu tempel link-nya di kotak di atas.</li>
                </ol>
              </div>

              <div className="aivy-import-actions">
                <button className="aivy-btn-primary" disabled={!url.trim() || resolving} onClick={handleResolve}>
                  {resolving ? <><Loader2 size={15} className="aivy-spin" /> Memuat...</> : <>Lanjutkan <ArrowRight size={15} /></>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && resolved && (
        <div>
          <div className="aivy-import-summary">
            {resolved.thumbnail ? (
              <img className="thumb" src={resolved.thumbnail} alt={resolved.title} />
            ) : (
              <div className="thumb-fallback"><ListMusic size={28} color="var(--ink-faint)" /></div>
            )}
            <div className="meta">
              <div className="title">{resolved.title}</div>
              <div className="sub">{resolved.author ? `oleh ${resolved.author} · ` : ""}{formatSongCount(resolved.count)}</div>
            </div>
          </div>

          <div
            className={`aivy-import-option ${targetMode === "existing" ? "active" : ""} ${playlists.length === 0 ? "" : ""}`}
            onClick={() => playlists.length > 0 && setTargetMode("existing")}
            style={playlists.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            <div className="radio" />
            <div className="body">
              <div className="label">Tambah ke playlist yang sudah ada</div>
              {playlists.length > 0 ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <CustomSelect
                    className="aivy-full-select"
                    value={selectedPlaylistId}
                    options={playlists.map((pl) => ({ value: pl.id, label: pl.name }))}
                    onChange={(v) => { setTargetMode("existing"); setSelectedPlaylistId(v); }}
                  />
                </div>
              ) : (
                <div className="hint" style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Kamu belum punya playlist.</div>
              )}
            </div>
          </div>

          <div className={`aivy-import-option ${targetMode === "new" ? "active" : ""}`} onClick={() => setTargetMode("new")}>
            <div className="radio" />
            <div className="body">
              <div className="label"><PlusCircle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />Buat playlist baru</div>
              <input
                className="aivy-input" style={{ marginBottom: 0 }}
                placeholder="Nama playlist baru"
                value={newName}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => setTargetMode("new")}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>

          {commitError && <div className="aivy-import-error">{commitError}</div>}

          <div className="aivy-import-actions">
            <button className="aivy-btn-ghost" onClick={() => setStep(1)}><ArrowLeft size={15} /> Kembali</button>
            <button
              className="aivy-btn-primary"
              disabled={targetMode === "existing" ? !selectedPlaylistId : !newName.trim()}
              onClick={handleCommit}
            >
              Mulai Import <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {committing || (!result && !commitError) ? (
            <div className="aivy-import-progress-wrap">
              <Loader2 size={34} className="aivy-spin" color="var(--moss-strong)" />
              <div style={{ marginTop: 14, fontWeight: 600 }}>Mengimpor {resolved ? formatSongCount(resolved.count) : "lagu"}...</div>
              <div className="sub" style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 4 }}>Jangan tutup halaman ini dulu ya.</div>
              <div className="aivy-import-progress-track"><div className="aivy-import-progress-fill" style={{ width: `${progress}%` }} /></div>
            </div>
          ) : commitError ? (
            <div className="aivy-import-success">
              <div className="icon" style={{ background: "color-mix(in srgb, var(--berry) 18%, transparent)" }}><Youtube size={30} color="var(--berry-strong)" /></div>
              <h2>Import gagal</h2>
              <p>{commitError}</p>
              <div className="actions">
                <button className="aivy-btn-ghost" onClick={() => setStep(2)}><ArrowLeft size={15} /> Kembali</button>
                <button className="aivy-btn-primary" onClick={handleCommit}>Coba lagi</button>
              </div>
            </div>
          ) : (
            <div className="aivy-import-success">
              <div className="icon"><Check size={30} color="var(--moss-strong)" /></div>
              <h2>Import selesai</h2>
              <p>
                Berhasil mengimpor {result.imported} dari {result.total} lagu
                {result.skipped > 0 ? ` (${result.skipped} udah ada sebelumnya)` : ""}.
              </p>
              <div className="actions">
                <button className="aivy-btn-ghost" onClick={() => navigate("library")}>Selesai</button>
                <button className="aivy-btn-primary" onClick={() => navigate("playlist", { params: { id: result.playlistId } })}>
                  Buka playlist <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}