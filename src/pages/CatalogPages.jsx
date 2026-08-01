import React, { useState, useEffect } from "react";
import { Play, Shuffle, Check } from "lucide-react";
import { Api } from "../lib/api.js";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";
import { TrackRow, CardAlbum, CardArtist, ViewLoading, ViewNotFound } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";

export function ArtistPage() {
  const { params } = useRouter();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const { playList } = usePlayer();
  const { pushToast } = useUI();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setShowAllTracks(false);
    Api.artist(params.id).then((res) => { if (alive) { setArtist(res); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  if (loading) return <ViewLoading />;
  if (!artist) return <ViewNotFound label="Artist" />;

  const tracks = showAllTracks ? artist.topTracks : artist.topTracks.slice(0, 5);

  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art round"><SmartCover src={artist.image} seed={"artist" + artist.id + artist.name} size={176} radius={999} style={{ width: 176, height: 176, borderRadius: "50%" }} /></div>
        <div className="aivy-hero-meta">
          <div className="eyebrow">Artist</div>
          <h1 className="font-display">{artist.name}</h1>
          <div className="stats"><span>{artist.listeners?.toLocaleString("id-ID")} pendengar bulanan</span></div>
        </div>
      </div>
      <div className="aivy-hero-actions">
        <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => artist.topTracks?.length && playList(artist.topTracks, 0)} aria-label="Putar semua"><Play size={22} fill="currentColor" /></button>
        <button className={following ? "aivy-chip active" : "aivy-btn-ghost"} onClick={() => { setFollowing((f) => !f); pushToast(following ? `Berhenti ikuti ${artist.name}` : `Mengikuti ${artist.name}`); }}>
          {following ? <><Check size={14} /> Mengikuti</> : "Ikuti"}
        </button>
      </div>
      {artist.tags?.length > 0 && <div className="aivy-tagrow">{artist.tags.map((t) => <span key={t} className="aivy-chip">{t}</span>)}</div>}
      {tracks?.length > 0 && (
        <section className="aivy-section">
          <div className="aivy-section-head"><h2 className="aivy-section-title">Lagu Populer</h2></div>
          <div>{tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} list={artist.topTracks} showAlbum queueMode="context" />)}</div>
          {artist.topTracks.length > 5 && <button className="aivy-chip" style={{ marginTop: 10 }} onClick={() => setShowAllTracks((s) => !s)}>{showAllTracks ? "Tampilkan lebih sedikit" : `Tampilkan ${artist.topTracks.length - 5} lagi`}</button>}
        </section>
      )}
      {artist.albums?.length > 0 && (
        <section className="aivy-section"><div className="aivy-section-head"><h2 className="aivy-section-title">Album</h2></div>
          <div className="aivy-hrow aivy-scroll">{artist.albums.map((a) => <CardAlbum key={a.id} album={a} />)}</div>
        </section>
      )}
      {artist.relatedArtists?.length > 0 && (
        <section className="aivy-section"><div className="aivy-section-head"><h2 className="aivy-section-title">Mirip dengan {artist.name}</h2></div>
          <div className="aivy-hrow aivy-scroll">{artist.relatedArtists.map((a) => <CardArtist key={a.id} artist={a} />)}</div>
        </section>
      )}
      {artist.bio && <p className="aivy-bio">{artist.bio}</p>}
    </div>
  );
}

export function AlbumPage() {
  const { params } = useRouter();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playList, toggleShuffle } = usePlayer();
  const { navigate } = useRouter();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Api.album(params.id).then((res) => { if (alive) { setAlbum(res); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  if (loading) return <ViewLoading />;
  if (!album) return <ViewNotFound label="Album" />;

  const totalMin = Math.round((album.tracks || []).reduce((s, t) => s + (t.duration || 0), 0) / 60);

  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art"><SmartCover src={album.cover} seed={"album" + album.id + album.title} size={176} radius={16} style={{ width: 176, height: 176 }} /></div>
        <div className="aivy-hero-meta">
          <div className="eyebrow">Album</div>
          <h1 className="font-display">{album.title}</h1>
          <div className="stats">
            <span onClick={() => navigate("artist", { params: { id: album.artist.id } })} style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 600 }}>{album.artist?.name}</span>
            <span>{album.releaseDate ? `\u00b7 ${String(album.releaseDate).slice(0, 4)}` : ""}</span>
            <span>{`\u00b7 ${album.trackCount || album.tracks?.length || 0} lagu, ${totalMin} mnt`}</span>
          </div>
        </div>
      </div>
      <div className="aivy-hero-actions">
        <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(album.tracks, 0)} aria-label="Putar album"><Play size={22} fill="currentColor" /></button>
        <button className="aivy-icon-btn" onClick={() => { toggleShuffle(); playList(album.tracks, 0); }} aria-label="Acak & putar"><Shuffle size={18} /></button>
      </div>
      <div>{(album.tracks || []).map((t, i) => <TrackRow key={t.id} track={t} index={i} list={album.tracks} queueMode="context" />)}</div>
    </div>
  );
}
