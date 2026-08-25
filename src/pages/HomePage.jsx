import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Play } from "lucide-react";
import { Api } from "../lib/api.js";
import { usePlayer, useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";
import { CardTrack, CardAlbum, CardArtist, filterExplicit } from "../components.jsx";
import { IvyFallLoader } from "../lib/brand.jsx";
import { uid } from "../lib/utils.js";

function greetingSubKey() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return "greetMorningSub";
  if (h >= 11 && h < 15) return "greetNoonSub";
  if (h >= 15 && h < 18) return "greetAfternoonSub";
  if (h >= 18 && h < 23) return "greetEveningSub";
  return "greetNightSub";
}

function useDiscoverRow(seed, limit = 12, type = null) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    Api.discover(seed, 0, limit, type).then((res) => { if (alive) setItems(res.items || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [seed, limit, type]);
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

export function HomePage() {
  const { t, settings, authUser } = useUI();
  const subKey = useMemo(greetingSubKey, []);
  const { liked, history: sessionHistory, playRadio, currentTrack } = usePlayer();
  const { navigate } = useRouter();
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

  const trending = useDiscoverRow("trending-" + new Date().toDateString(), 12, "track");
  const fresh = useDiscoverRow("fresh-" + Math.floor(Date.now() / 3600000), 12, "album");
  const moodCalm = useDiscoverRow("mood-santai", 12, "artist");
  const trendingTracks = useMemo(() => filterExplicit(trending || [], settings).slice(0, 12), [trending, settings]);
  const freshAlbums = useMemo(() => (fresh || []).slice(0, 12), [fresh]);
  const artists = useMemo(() => (moodCalm || []).slice(0, 12), [moodCalm]);

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

  return (
    <div className="aivy-view-enter aivy-home">
      {bgCover && <div className="aivy-home-bg" style={{ backgroundImage: `url(${bgCover})` }} aria-hidden="true" />}
      <div className="aivy-home-inner">
        <div className="aivy-home-welcome">
          <h1 className="font-display">{t("homeWelcome")}</h1>
          <p>{nothingPlayed ? t("homeWelcomeEmpty") : t(subKey)}</p>
        </div>

        <Row
          title={t("recoSongs")}
          items={trending === null ? null : trendingTracks}
          action={trendingTracks.length > 0 ? (
            <button className="aivy-chip" onClick={() => playRadio(trendingTracks[0])}>
              <Play size={12} /> {t("startInfiniteRadio")}
            </button>
          ) : null}
          render={(tr) => <CardTrack key={tr.id} track={tr} list={trendingTracks} />}
        />
        <Row title={t("recoAlbums")} items={fresh === null ? null : freshAlbums} render={(a) => <CardAlbum key={a.id} album={a} />} />
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
      </div>
    </div>
  );
}
