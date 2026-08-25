import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Play, RefreshCw } from "lucide-react";
import { Api } from "../lib/api.js";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";
import { CardAlbum, CardArtist, filterExplicit, useTrackMenuItems } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";
import { IvyFallLoader } from "../lib/brand.jsx";
import { uid, formatDuration } from "../lib/utils.js";

function greetingSubKey() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return "greetMorningSub";
  if (h >= 11 && h < 15) return "greetNoonSub";
  if (h >= 15 && h < 18) return "greetAfternoonSub";
  if (h >= 18 && h < 23) return "greetEveningSub";
  return "greetNightSub";
}

function useDiscoverRow(seed, limit = 12, type = null, enabled = true) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    if (!enabled) { setItems(null); return; }
    let alive = true;
    setItems(null);
    Api.discover(seed, 0, limit, type).then((res) => { if (alive) setItems(res.items || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [seed, limit, type, enabled]);
  return items;
}

function Row({ title, items, render, scroll = false, action = null }) {
  const wrapClass = scroll ? "aivy-hrow aivy-scroll" : "aivy-grid";
  if (items === null) return (
    <section className="aivy-section"><div className="aivy-section-head"><h2 className="aivy-section-title">{title}</h2>{action}</div>
      <div className={wrapClass}><IvyFallLoader size={26} /></div>
    </section>
  );
  if (!items.length) return null;
  return (
    <section className="aivy-section">
      <div className="aivy-section-head"><h2 className="aivy-section-title">{title}</h2>{action}</div>
      <div className={wrapClass}>{items.map(render)}</div>
    </section>
  );
}

function mapHistoryRow(row) {
  return {
    id: row.video_id, videoId: row.video_id, title: row.title,
    artist: row.artist_name ? { name: row.artist_name } : null,
    cover: row.thumbnail || null, duration: row.duration || null,
  };
}

function SongListRow({ track, list }) {
  const { currentTrack, isPlaying, togglePlay, playList } = usePlayer();
  const { openContextMenu } = useUI();
  const isCurrent = currentTrack && currentTrack.id === track.id;
  const items = useTrackMenuItems(track);
  const handlePlay = () => {
    if (isCurrent) { togglePlay(); return; }
    const idx = list.findIndex((x) => x.id === track.id);
    playList(list, idx === -1 ? 0 : idx);
  };
  return (
    <div
      className={`aivy-songlist-row ${isCurrent ? "current" : ""}`}
      onClick={handlePlay}
      onContextMenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, items); }}
    >
      <span className="cover">
        <SmartCover src={track.cover} seed={track.id + track.title} size={80} radius={6} style={{ width: "100%", height: "100%" }} />
      </span>
      <span className="meta">
        <span className="t">{track.title}</span>
        <span className="a">{track.artist?.name || "\u2014"}</span>
      </span>
      <span className="dur font-mono">{formatDuration(track.duration)}</span>
    </div>
  );
}

export function HomePage() {
  const { t, settings, authUser, pushToast } = useUI();
  const subKey = useMemo(greetingSubKey, []);
  const { liked, history: sessionHistory, playRadio, currentTrack } = usePlayer();
  const { navigate } = useRouter();
  const [homeTab, setHomeTab] = useState("home");
  const [savedHistory, setSavedHistory] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!authUser) { setSavedHistory([]); return; }
    Api.history(12)
      .then((rows) => { if (alive) setSavedHistory((rows || []).map(mapHistoryRow)); })
      .catch(() => { if (alive) setSavedHistory([]); });
    return () => { alive = false; };
  }, [authUser]);
  const playedHistory = authUser ? savedHistory : sessionHistory;
  const nothingPlayed = !playedHistory || playedHistory.length === 0;

  const [trendingSeed, setTrendingSeed] = useState("trending-" + new Date().toDateString());
  const [albumSeed, setAlbumSeed] = useState("fresh-" + Math.floor(Date.now() / 3600000));
  const trending = useDiscoverRow(trendingSeed, 12, "track");
  const fresh = useDiscoverRow(albumSeed, 12, "album");
  const moodCalm = useDiscoverRow("mood-santai", 12, "artist");
  const trendingTracks = useMemo(() => filterExplicit(trending || [], settings).slice(0, 12), [trending, settings]);
  const freshAlbums = useMemo(() => (fresh || []).slice(0, 12), [fresh]);
  const artists = useMemo(() => (moodCalm || []).slice(0, 12), [moodCalm]);

  const hotTracks = useDiscoverRow("hot-new-tracks", 12, "track", homeTab === "hot");
  const hotAlbums = useDiscoverRow("hot-new-albums", 24, "album", homeTab === "hot");
  const pickAlbums = useDiscoverRow("editors-pick-" + new Date().toDateString(), 24, "album", homeTab === "picks");
  const aotyAlbums = useDiscoverRow("aoty-" + new Date().getFullYear(), 24, "album", homeTab === "aoty");

  const bgCover = currentTrack?.cover || (!nothingPlayed && playedHistory[0]?.cover) || null;

  const seedRef = useRef(uid("home-seed"));
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef(null);
  const seenIds = useRef(new Set());

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await Api.discover(seedRef.current, cursor, 18);
      const fresh = (res.items || []).filter((it) => {
        const key = `${it.type}:${it.id}`;
        if (seenIds.current.has(key)) return false;
        seenIds.current.add(key);
        return true;
      });
      setItems((prev) => [...prev, ...fresh]);
      setCursor(res.nextCursor);
      if (!res.items || res.items.length === 0) setDone(true);
    } catch { setDone(true); }
    setLoading(false);
  }, [cursor, loading, done]);

  useEffect(() => { loadMore(); }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const visibleItems = useMemo(() => items.filter((i) => i.type !== "track" || settings.explicitContent !== false || !i.explicit), [items, settings.explicitContent]);
  const exploreTracks = useMemo(() => visibleItems.filter((i) => i.type === "track"), [visibleItems]);

  const startRadio = () => {
    if (!trendingTracks.length) return;
    playRadio(trendingTracks[0]);
    pushToast(t("toastPlayingFullSong"));
  };

  return (
    <div className="aivy-view-enter aivy-home">
      {bgCover && <div className="aivy-home-bg" style={{ backgroundImage: `url(${bgCover})` }} aria-hidden="true" />}
      <div className="aivy-home-inner">
        <div className="aivy-home-tabs">
          {[["home", t("tabHome")], ["hot", t("tabHotNew")], ["picks", t("tabEditorsPicks")], ["aoty", "AOTY"]].map(([id, label]) => (
            <button key={id} className={homeTab === id ? "active" : ""} onClick={() => setHomeTab(id)}>{label}</button>
          ))}
        </div>

        {homeTab === "home" && (
          <>
            {nothingPlayed && (
              <div className="aivy-home-welcome">
                <h1 className="font-display">{t("homeWelcome")}</h1>
                <p>{t("homeWelcomeEmpty")}</p>
              </div>
            )}

            <section className="aivy-section" style={{ marginTop: 0 }}>
              <div className="aivy-section-head">
                <div className="aivy-home-head-left">
                  <h2 className="aivy-section-title">{t("recoSongs")}</h2>
                  {trendingTracks.length > 0 && (
                    <button className="aivy-chip" onClick={startRadio}>
                      <Play size={11} /> {t("startInfiniteRadio")}
                    </button>
                  )}
                </div>
                <button className="aivy-icon-btn bare" onClick={() => setTrendingSeed("trending-" + Date.now())} aria-label="Refresh" title="Refresh">
                  <RefreshCw size={15} />
                </button>
              </div>
              <div className="aivy-songlist-grid">
                {trending === null
                  ? <div className="aivy-songlist-loading"><IvyFallLoader size={26} /></div>
                  : trendingTracks.map((tr) => <SongListRow key={tr.id} track={tr} list={trendingTracks} />)}
              </div>
            </section>

            <Row
              title={t("recoAlbums")}
              items={fresh === null ? null : freshAlbums}
              action={
                <button className="aivy-icon-btn bare" onClick={() => setAlbumSeed("fresh-" + Date.now())} aria-label="Refresh" title="Refresh">
                  <RefreshCw size={15} />
                </button>
              }
              render={(a) => <CardAlbum key={a.id} album={a} />}
            />

            <Row title={t("recoArtists")} items={moodCalm === null ? null : artists} render={(a) => <CardArtist key={a.id} artist={a} />} />

            {playedHistory === null || playedHistory.length > 0 ? (
              <Row scroll title={t("rowContinueListening")} items={playedHistory === null ? null : playedHistory.slice(0, 12)} render={(tr) => <CardTrack key={tr.id} track={tr} list={playedHistory} />} />
            ) : null}

            <section className="aivy-section">
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("listeningParties")}</h2></div>
              <div className="aivy-parties-cta">
                <p>{t("partiesSub")}</p>
                <div className="acts">
                  <button className="aivy-btn-primary" onClick={() => navigate("roomLobby")}>{t("createRoom")}</button>
                  <button className="aivy-btn-ghost" onClick={() => navigate("roomLobby")}>{t("joinRoom")}</button>
                </div>
              </div>
            </section>

            <section className="aivy-section">
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("rowExplore")}</h2></div>
              <div className="aivy-grid">
                {visibleItems.map((item, i) => {
                  if (item.type === "track") return <CardTrack key={`t-${item.id}-${i}`} track={item} list={exploreTracks} />;
                  if (item.type === "album") return <CardAlbum key={`a-${item.id}-${i}`} album={item} />;
                  return <CardArtist key={`ar-${item.id}-${i}`} artist={item} />;
                })}
              </div>
              <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "26px 0" }}>
                {loading && <IvyFallLoader size={28} />}
                {done && items.length > 0 && <span className="eyebrow">{t("exploreEnd")}</span>}
              </div>
            </section>
          </>
        )}

        {homeTab === "hot" && (
          <>
            <section className="aivy-section" style={{ marginTop: 0 }}>
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("tabHotNew")}</h2></div>
              <div className="aivy-songlist-grid">
                {hotTracks === null
                  ? <div className="aivy-songlist-loading"><IvyFallLoader size={26} /></div>
                  : (hotTracks || []).map((tr) => <SongListRow key={tr.id} track={tr} list={hotTracks} />)}
              </div>
            </section>
            <Row title={t("recoAlbums")} items={hotAlbums} render={(a) => <CardAlbum key={a.id} album={a} />} />
          </>
        )}

        {homeTab === "picks" && (
          <Row title={t("tabEditorsPicks")} items={pickAlbums} render={(a) => <CardAlbum key={a.id} album={a} />} />
        )}

        {homeTab === "aoty" && (
          <Row title="AOTY" items={aotyAlbums} render={(a) => <CardAlbum key={a.id} album={a} />} />
        )}
      </div>
    </div>
  );
}
