import React, { useMemo } from "react";
import { Heart, Play, Library as LibraryIcon } from "lucide-react";
import { usePlayer } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";
import { TrackRow, ViewNotFound } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";

export function LibraryPage() {
  const { playlists, liked } = usePlayer();
  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet" style={{ paddingBottom: 10 }}><h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>Koleksi kamu</h1></div>
      <div className="aivy-grid">
        <Link to="liked" className="aivy-card" style={{ textAlign: "left" }}>
          <div className="art-wrap">
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "var(--radius-md)", background: "linear-gradient(135deg, var(--berry), var(--bg-elev-3))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Heart size={30} color="var(--moss-ink)" fill="var(--moss-ink)" />
            </div>
          </div>
          <div className="title">Lagu Disukai</div><div className="sub">{liked.size} lagu</div>
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
            <div className="title">{pl.name}</div><div className="sub">{pl.songs?.length || 0} lagu</div>
          </Link>
        ))}
      </div>
      {playlists.length === 0 && <p className="eyebrow" style={{ padding: "8px 2px" }}>{"Belum ada playlist \u2014 bikin dari sidebar, atau lewat menu klik-kanan lagu."}</p>}
    </div>
  );
}

export function LikedPage() {
  const { liked, playlists, playList } = usePlayer();
  // liked cuma nyimpen ID di context; detail track-nya kita ambil dari histori playlist/queue kalau ada,
  // tapi sumber paling lengkap tetap dari endpoint /api/me/likes langsung.
  const [likedTracks, setLikedTracks] = React.useState(null);
  React.useEffect(() => {
    import("../lib/api.js").then(({ Api }) => Api.likes().then(setLikedTracks).catch(() => setLikedTracks([])));
  }, [liked.size]);

  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art"><div style={{ width: 176, height: 176, borderRadius: "var(--radius-lg)", background: "linear-gradient(150deg, var(--berry), var(--bg-elev-3))", display: "flex", alignItems: "center", justifyContent: "center" }}><Heart size={54} color="var(--moss-ink)" fill="var(--moss-ink)" /></div></div>
        <div className="aivy-hero-meta"><div className="eyebrow">Playlist</div><h1 className="font-display">Lagu Disukai</h1><div className="stats"><span>{liked.size} lagu</span></div></div>
      </div>
      {likedTracks === null ? null : likedTracks.length > 0 ? (
        <>
          <div className="aivy-hero-actions"><button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(likedTracks, 0)} aria-label="Putar semua"><Play size={22} fill="currentColor" /></button></div>
          <div>{likedTracks.map((t, i) => <TrackRow key={t.videoId || t.id} track={{ ...t, id: t.videoId || t.id }} index={i} list={likedTracks} showAlbum />)}</div>
        </>
      ) : (
        <div className="aivy-empty"><Heart size={38} color="var(--ink-faint)" /><div className="title">Belum ada yang disukai</div><div className="sub">Tekan ikon hati di lagu mana pun buat nyimpen di sini.</div></div>
      )}
    </div>
  );
}

export function PlaylistPage() {
  const { params } = useRouter();
  const { playlists, playList, removeFromPlaylist, deletePlaylist } = usePlayer();
  const { navigate } = useRouter();
  const pl = playlists.find((p) => String(p.id) === String(params.id));
  if (!pl) return <ViewNotFound label="Playlist" />;
  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art">
          {pl.songs?.[0]?.cover ? <SmartCover src={pl.songs[0].cover} seed={"pl" + pl.id} size={176} radius={16} style={{ width: 176, height: 176 }} /> : (
            <div style={{ width: 176, height: 176, borderRadius: "var(--radius-lg)", background: "var(--bg-elev-2)", display: "flex", alignItems: "center", justifyContent: "center" }}><LibraryIcon size={40} color="var(--ink-faint)" /></div>
          )}
        </div>
        <div className="aivy-hero-meta"><div className="eyebrow">Playlist</div><h1 className="font-display">{pl.name}</h1><div className="stats"><span>{pl.songs?.length || 0} lagu</span></div></div>
      </div>
      <div className="aivy-hero-actions">
        {pl.songs?.length > 0 && <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(pl.songs, 0)} aria-label="Putar semua"><Play size={22} fill="currentColor" /></button>}
        <button className="aivy-btn-ghost" onClick={() => { deletePlaylist(pl.id); navigate("library"); }}>Hapus playlist</button>
      </div>
      {pl.songs?.length > 0 ? (
        <div>{pl.songs.map((t, i) => <TrackRow key={t.id} track={t} index={i} list={pl.songs} showAlbum onRemove={() => removeFromPlaylist(pl.id, t.id)} removeLabel="Hapus dari playlist ini" />)}</div>
      ) : (
        <div className="aivy-empty"><div className="title">Playlist ini masih kosong</div><div className="sub">Cari lagu, lalu pilih "Tambah ke playlist" dari menu lagu.</div></div>
      )}
    </div>
  );
}
