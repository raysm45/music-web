import React, { useMemo } from "react";
import { Heart, Play, Library as LibraryIcon } from "lucide-react";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";
import { TrackRow, ViewNotFound, ConfirmDialog } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";

export function LibraryPage() {
  const { playlists, liked } = usePlayer();
  const { t } = useUI();
  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 10 }}><h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{t("yourLibrary")}</h1></div>
      <div className="aivy-grid">
        <Link to="liked" className="aivy-card" style={{ textAlign: "left" }}>
          <div className="art-wrap">
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, var(--berry), var(--bg-elev-3))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={30} color="var(--moss-ink)" fill="var(--moss-ink)" />
            </div>
          </div>
          <div className="title">{t("navLikedSongs")}</div><div className="sub">{liked.size} {t("songsCount")}</div>
        </Link>
        {playlists.map((pl) => (
          <Link key={pl.id} to="playlist" params={{ id: pl.id }} className="aivy-card" style={{ textAlign: "left" }}>
            <div className="art-wrap">
              {pl.songs?.[0]?.cover ? (
                <SmartCover src={pl.songs[0].cover} seed={"pl" + pl.id} size={160} radius={10} style={{ width: "100%", height: "auto" }} />
              ) : (
                <div style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)", background: "var(--bg-elev-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LibraryIcon size={26} color="var(--ink-faint)" />
                </div>
              )}
            </div>
            <div className="title">{pl.name}</div><div className="sub">{pl.songs?.length || 0} {t("songsCount")}</div>
          </Link>
        ))}
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
          <div className="aivy-hero-actions"><button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(likedTracks, 0)} aria-label={t("playAll")}><Play size={22} fill="currentColor" /></button></div>
          <div>{likedTracks.map((tr, i) => <TrackRow key={tr.id} track={tr} index={i} list={likedTracks} showAlbum onRemove={() => handleUnlike(tr)} removeLabel={t("menuRemoveLiked")} queueMode="context" />)}</div>
        </>
      ) : (
        <div className="aivy-empty"><Heart size={38} color="var(--ink-faint)" /><div className="title">{t("noLikedYet")}</div><div className="sub">{t("noLikedYetSub")}</div></div>
      )}
    </div>
  );
}

export function PlaylistPage() {
  const { params } = useRouter();
  const { playlists, playList, removeFromPlaylist, deletePlaylist, setPlaylistDetail } = usePlayer();
  const { navigate } = useRouter();
  const { t } = useUI();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const pl = playlists.find((p) => String(p.id) === String(params.id));

  React.useEffect(() => {
    if (!params.id) return;
    import("../lib/api.js").then(({ Api }) =>
      Api.playlist(params.id)
        .then((detail) => setPlaylistDetail(detail))
        .catch(() => {})
    );
  }, [params.id]);

  if (!pl) return <ViewNotFound label={t("playlistLabel")} />;
  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art">
          {pl.songs?.[0]?.cover ? <SmartCover src={pl.songs[0].cover} seed={"pl" + pl.id} size={176} radius={16} style={{ width: 176, height: 176 }} /> : (
            <div style={{ width: 176, height: 176, borderRadius: "var(--radius-lg)", background: "var(--bg-elev-2)", display: "flex", alignItems: "center", justifyContent: "center" }}><LibraryIcon size={40} color="var(--ink-faint)" /></div>
          )}
        </div>
        <div className="aivy-hero-meta"><div className="eyebrow">{t("playlistLabel")}</div><h1 className="font-display">{pl.name}</h1><div className="stats"><span>{pl.songs?.length || 0} {t("songsCount")}</span></div></div>
      </div>
      <div className="aivy-hero-actions">
        {pl.songs?.length > 0 && <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(pl.songs, 0)} aria-label={t("playAll")}><Play size={22} fill="currentColor" /></button>}
        <button className="aivy-btn-ghost" onClick={() => setConfirmDelete(true)}>{t("deletePlaylistBtn")}</button>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={`${t("deletePlaylistConfirmTitle")} "${pl.name}"?`}
        message={t("deletePlaylistConfirmMsg")}
        confirmLabel={t("yesDelete")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); deletePlaylist(pl.id); navigate("library"); }}
      />
      {pl.songs?.length > 0 ? (
        <div>{pl.songs.map((tr, i) => <TrackRow key={tr.id} track={tr} index={i} list={pl.songs} showAlbum onRemove={() => removeFromPlaylist(pl.id, tr.id)} removeLabel={t("removeFromThisPlaylist")} queueMode="context" />)}</div>
      ) : (
        <div className="aivy-empty"><div className="title">{t("playlistEmpty")}</div><div className="sub">{t("playlistEmptySub")}</div></div>
      )}
    </div>
  );
}
