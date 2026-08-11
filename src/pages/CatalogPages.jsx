import React, { useState, useEffect, useMemo } from "react";
import { Play, Shuffle, Check } from "lucide-react";
import { Api } from "../lib/api.js";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";
import { TrackRow, CardAlbum, CardArtist, ViewLoading, ViewNotFound, filterExplicit } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";

export function ArtistPage() {
  const { params } = useRouter();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const { playList } = usePlayer();
  const { pushToast, t, settings } = useUI();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setShowAllTracks(false);
    Api.artist(params.id).then((res) => { if (alive) { setArtist(res); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  const topTracks = useMemo(() => filterExplicit(artist?.topTracks, settings) || [], [artist, settings]);

  if (loading) return <ViewLoading />;
  if (!artist) return <ViewNotFound label={t("artistLabel")} />;

  const tracks = showAllTracks ? topTracks : topTracks.slice(0, 5);

  return (
    <div className="aivy-view-enter aivy-artist-page">
      <div className="aivy-artist-banner">
        <SmartCover src={artist.banner || artist.image} seed={"banner" + artist.id + artist.name} size={1200} radius={0} style={{ width: "100%", height: "100%" }} />
        <div className="aivy-artist-banner-fade" />
      </div>
      <div className="aivy-hero aivy-artist-hero">
        <div className="art round"><SmartCover src={artist.image} seed={"artist" + artist.id + artist.name} size={176} radius={999} style={{ width: 176, height: 176, borderRadius: "50%" }} /></div>
        <div className="aivy-hero-meta">
          <div className="eyebrow">{t("artistLabel")}</div>
          <h1 className="font-display">{artist.name}</h1>
          <div className="stats"><span>{artist.listeners?.toLocaleString(settings.language === "en" ? "en-US" : "id-ID")} {t("listenersMonthly")}</span></div>
        </div>
      </div>
      <div className="aivy-hero-actions">
        <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => topTracks.length && playList(topTracks, 0)} aria-label={t("playAll")}><Play size={22} fill="currentColor" /></button>
        <button className={following ? "aivy-chip active" : "aivy-btn-ghost"} onClick={() => { setFollowing((f) => !f); pushToast(following ? `${t("unfollowedToast")} ${artist.name}` : `${t("followedToast")} ${artist.name}`); }}>
          {following ? <><Check size={14} /> {t("following")}</> : t("follow")}
        </button>
      </div>
      {artist.tags?.length > 0 && <div className="aivy-tagrow">{artist.tags.map((tag) => <span key={tag} className="aivy-chip">{tag}</span>)}</div>}
      {artist.bio && <p className="aivy-bio">{artist.bio}</p>}
      {tracks?.length > 0 && (
        <section className="aivy-section">
          <div className="aivy-section-head"><h2 className="aivy-section-title">{t("popularSongs")}</h2></div>
          <div>{tracks.map((tr, i) => <TrackRow key={tr.id} track={tr} index={i} list={topTracks} showAlbum queueMode="context" />)}</div>
          {topTracks.length > 5 && <button className="aivy-chip" style={{ marginTop: 10 }} onClick={() => setShowAllTracks((s) => !s)}>{showAllTracks ? t("showLess") : `${t("showMore")} ${topTracks.length - 5} ${t("more")}`}</button>}
        </section>
      )}
      {artist.albums?.length > 0 && (
        <section className="aivy-section"><div className="aivy-section-head"><h2 className="aivy-section-title">{t("albumsLabel")}</h2></div>
          <div className="aivy-hrow aivy-scroll">{artist.albums.map((a) => <CardAlbum key={a.id} album={a} />)}</div>
        </section>
      )}
      {artist.relatedArtists?.length > 0 && (
        <section className="aivy-section"><div className="aivy-section-head"><h2 className="aivy-section-title">{t("similarTo")} {artist.name}</h2></div>
          <div className="aivy-hrow aivy-scroll">{artist.relatedArtists.map((a) => <CardArtist key={a.id} artist={a} />)}</div>
        </section>
      )}
    </div>
  );
}

export function AlbumPage() {
  const { params } = useRouter();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playList, toggleShuffle } = usePlayer();
  const { navigate } = useRouter();
  const { t, settings } = useUI();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Api.album(params.id).then((res) => { if (alive) { setAlbum(res); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  const albumTracks = useMemo(() => filterExplicit(album?.tracks, settings) || [], [album, settings]);
  const totalMin = Math.round(albumTracks.reduce((s, tr) => s + (tr.duration || 0), 0) / 60);

  if (loading) return <ViewLoading />;
  if (!album) return <ViewNotFound label={t("albumLabel")} />;

  return (
    <div className="aivy-view-enter">
      <div className="aivy-hero">
        <div className="art"><SmartCover src={album.cover} seed={"album" + album.id + album.title} size={176} radius={16} style={{ width: 176, height: 176 }} /></div>
        <div className="aivy-hero-meta">
          <div className="eyebrow">{t("albumLabel")}</div>
          <h1 className="font-display">{album.title}</h1>
          <div className="stats">
            <span onClick={() => navigate("artist", { params: { id: album.artist.id } })} style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 600 }}>{album.artist?.name}</span>
            <span>{album.releaseDate ? `\u00b7 ${String(album.releaseDate).slice(0, 4)}` : ""}</span>
            <span>{`\u00b7 ${albumTracks.length} ${t("trackCountLabel")}, ${totalMin} ${t("minutesLabel")}`}</span>
          </div>
        </div>
      </div>
      <div className="aivy-hero-actions">
        <button className="aivy-play-btn" style={{ width: 52, height: 52 }} onClick={() => playList(albumTracks, 0)} aria-label={t("playAlbum")}><Play size={22} fill="currentColor" /></button>
        <button className="aivy-icon-btn" onClick={() => { toggleShuffle(); playList(albumTracks, 0); }} aria-label={t("shufflePlay")}><Shuffle size={18} /></button>
      </div>
      <div>{albumTracks.map((tr, i) => <TrackRow key={tr.id} track={tr} index={i} list={albumTracks} queueMode="context" />)}</div>
    </div>
  );
}