import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Shuffle, Check, Mic2, UserPlus } from "lucide-react";
import { Api } from "../lib/api.js";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";
import { TrackRow, CardAlbum, CardArtist, ViewNotFound, SkeletonHeroPage, filterExplicit, FlipList, shuffleArray } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";

export function ArtistPage() {
  const { params } = useRouter();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [heroVideoUrl, setHeroVideoUrl] = useState(null);
  const [videoBroken, setVideoBroken] = useState(false);
  const mediaRef = useRef(null);
  const pageRef = useRef(null);
  const { playList } = usePlayer();
  const { pushToast, t, settings } = useUI();

  // Mode immersive: ubah sidebar kiri & panel kanan jadi glassmorphism
  useEffect(() => {
    document.body.classList.add("aivy-artist-immersive");
    return () => document.body.classList.remove("aivy-artist-immersive");
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setShowAllTracks(false);
    setVideoBroken(false);
    Api.artist(params.id).then((res) => {
      if (!alive) return;
      setArtist(res);
      setLoading(false);
      if (res?.name) {
        Api.appleMusicHero(res.name)
          .then((h) => { if (alive && h?.video?.url) setHeroVideoUrl(Api.appleMusicVideoUrl(h.video.url)); })
          .catch(() => {});
      } else {
        setHeroVideoUrl(null);
      }
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  // Scroll to blur: semakin jauh discroll, background hero makin blur
  useEffect(() => {
    const scroller = document.getElementById("aivy-content-scroll");
    if (!scroller) return;
    const onScroll = () => {
      const top = scroller.scrollTop;
      const h = window.innerHeight || 800;
      const progress = Math.min(1, top / (h * 0.9));
      const blur = Math.round(progress * 32);
      const zoom = (1.05 + progress * 0.07).toFixed(3);
      if (mediaRef.current) {
        mediaRef.current.style.setProperty("--blur-px", `${blur}px`);
        mediaRef.current.style.setProperty("--zoom", zoom);
      }
      if (pageRef.current) pageRef.current.style.setProperty("--hero-dim", progress.toFixed(3));
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const topTracks = useMemo(() => filterExplicit(artist?.topTracks, settings) || [], [artist, settings]);

  if (loading) return <SkeletonHeroPage round rows={5} />;
  if (!artist) return <ViewNotFound label={t("artistLabel")} />;

  const tracks = showAllTracks ? topTracks : topTracks.slice(0, 5);
  const posterImg = artist.banner || artist.image;
  const showHeroVideo = heroVideoUrl && !videoBroken;

  return (
    <div ref={pageRef} className="aivy-view-enter aivy-artist-page">
      <div ref={mediaRef} className="aivy-artist-media" aria-hidden="true">
        {showHeroVideo ? (
          <video
            src={heroVideoUrl}
            poster={posterImg}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setVideoBroken(true)}
          />
        ) : (
          <div className="aivy-artist-bg-img">
            <SmartCover src={posterImg} seed={"artist-bg" + artist.id + artist.name} size={1400} radius={0} style={{ width: "100%", height: "100%" }} />
          </div>
        )}
        <div className="aivy-artist-media-shade" />
      </div>

      <header className="aivy-artist-hero">
        <div className="aivy-artist-hero-inner">
          <div className="eyebrow aivy-artist-eyebrow"><Mic2 size={13} /> {t("artistLabel")}</div>
          <h1 className="aivy-artist-title">{artist.name}</h1>
          {artist.listeners ? (
            <div className="aivy-artist-stats">
              {artist.listeners.toLocaleString(settings.language === "en" ? "en-US" : "id-ID")} {t("listenersMonthly")}
            </div>
          ) : null}
          <div className="aivy-artist-actions">
            <button
              className="aivy-play-btn is-hero aivy-artist-play"
              style={{ width: 62, height: 62 }}
              onClick={() => topTracks.length && playList(topTracks, 0)}
              aria-label={t("playAll")}
              title={t("playAll")}
            >
              <Play size={26} fill="currentColor" />
            </button>
            <button
              className={`aivy-icon-btn-solid aivy-artist-ghost-btn ${following ? "active" : ""}`}
              onClick={() => { setFollowing((f) => !f); pushToast(following ? `${t("unfollowedToast")} ${artist.name}` : `${t("followedToast")} ${artist.name}`); }}
            >
              {following ? <Check size={18} /> : <UserPlus size={18} />}
              <span>{following ? t("following") : t("follow")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="aivy-artist-body">
        <div className="aivy-artist-body-inner">
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
            <section className="aivy-section">
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("latestRelease")}</h2></div>
              <div className="aivy-grid">{artist.albums.map((a) => <CardAlbum key={a.id} album={a} />)}</div>
            </section>
          )}

          {artist.relatedArtists?.length > 0 && (
            <section className="aivy-section">
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("similarTo")} {artist.name}</h2></div>
              <div className="aivy-grid">{artist.relatedArtists.map((a) => <CardArtist key={a.id} artist={a} />)}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlbumPage() {
  const { params } = useRouter();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const { playList } = usePlayer();
  const { navigate } = useRouter();
  const { t, settings } = useUI();
  const [localShuffle, setLocalShuffle] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Api.album(params.id).then((res) => { if (alive) { setAlbum(res); setLoading(false); } }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [params.id]);

  const albumTracks = useMemo(() => filterExplicit(album?.tracks, settings) || [], [album, settings]);
  const totalMin = Math.round(albumTracks.reduce((s, tr) => s + (tr.duration || 0), 0) / 60);
  const [displayTracks, setDisplayTracks] = useState(albumTracks);

  useEffect(() => {
    setDisplayTracks(localShuffle ? shuffleArray(albumTracks) : albumTracks);
  }, [albumTracks, localShuffle]);

  if (loading) return <SkeletonHeroPage rows={7} />;
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
        <button className="aivy-play-btn is-hero" style={{ width: 52, height: 52 }} onClick={() => playList(albumTracks, 0, null, localShuffle)} aria-label={t("playAlbum")}><Play size={22} fill="currentColor" /></button>
        <button className={`aivy-icon-btn-solid ${localShuffle ? "active" : ""}`} onClick={() => setLocalShuffle((s) => !s)} aria-label={t("shuffle")} aria-pressed={localShuffle} title={t("shuffle")}><Shuffle size={18} /></button>
      </div>
      <FlipList
        items={displayTracks}
        getKey={(tr) => tr.id}
        renderItem={(tr) => <TrackRow track={tr} index={albumTracks.indexOf(tr)} list={albumTracks} queueMode="context" shuffleOverride={localShuffle} />}
      />
    </div>
  );
}