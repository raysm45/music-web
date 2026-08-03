import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Api } from "../lib/api.js";
import { usePlayer, useUI } from "../context.jsx";
import { CardTrack, CardAlbum, CardArtist, filterExplicit } from "../components.jsx";
import { IvyFallLoader } from "../lib/brand.jsx";
import { uid } from "../lib/utils.js";

function greetingKeys() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return ["greetMorningTitle", "greetMorningSub"];
  if (h >= 11 && h < 15) return ["greetNoonTitle", "greetNoonSub"];
  if (h >= 15 && h < 18) return ["greetAfternoonTitle", "greetAfternoonSub"];
  if (h >= 18 && h < 23) return ["greetEveningTitle", "greetEveningSub"];
  return ["greetNightTitle", "greetNightSub"];
}

function useDiscoverRow(seed, limit = 14) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    let alive = true;
    Api.discover(seed, 0, limit).then((res) => { if (alive) setItems(res.items || []); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [seed, limit]);
  return items;
}

function Row({ title, items, render }) {
  if (items === null) return (
    <section className="aivy-section"><div className="aivy-section-head"><h2 className="aivy-section-title">{title}</h2></div>
      <div className="aivy-hrow"><IvyFallLoader size={26} /></div>
    </section>
  );
  if (!items.length) return null;
  return (
    <section className="aivy-section">
      <div className="aivy-section-head"><h2 className="aivy-section-title">{title}</h2></div>
      <div className="aivy-hrow aivy-scroll">{items.map(render)}</div>
    </section>
  );
}

export function HomePage() {
  const { t, settings } = useUI();
  const [greetKey1, greetKey2] = useMemo(greetingKeys, []);
  const { liked, history: playedHistory } = usePlayer();

  const trending = useDiscoverRow("trending-" + new Date().toDateString());
  const fresh = useDiscoverRow("fresh-" + Math.floor(Date.now() / 3600000));
  const moodCalm = useDiscoverRow("mood-santai");

  const trendingTracks = useMemo(() => filterExplicit((trending || []).filter((i) => i.type === "track"), settings).slice(0, 12), [trending, settings]);
  const freshAlbums = useMemo(() => (fresh || []).filter((i) => i.type === "album").slice(0, 12), [fresh]);
  const artists = useMemo(() => (moodCalm || []).filter((i) => i.type === "artist").slice(0, 12), [moodCalm]);

  const [similarItems, setSimilarItems] = useState(null);
  useEffect(() => {
    const likedIds = [...liked];
    if (!likedIds.length) { setSimilarItems([]); return; }
    const seedId = likedIds[Math.floor(Math.random() * likedIds.length)];
    Api.similar({ trackId: seedId }).then((res) => setSimilarItems(filterExplicit(res.items || [], settings))).catch(() => setSimilarItems([]));
  }, [liked]);

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
    <div className="aivy-view-enter">
      <div className="aivy-greet"><h1 className="font-display">{t(greetKey1)}</h1><p>{t(greetKey2)}</p></div>

      {playedHistory.length > 0 && (
        <Row title={t("rowContinueListening")} items={playedHistory.slice(0, 12)} render={(tr) => <CardTrack key={tr.id} track={tr} list={playedHistory} />} />
      )}
      <Row title={t("rowTrending")} items={trending === null ? null : trendingTracks} render={(tr) => <CardTrack key={tr.id} track={tr} list={trendingTracks} />} />
      {similarItems && similarItems.length > 0 && (
        <Row title={t("rowBecauseYouLiked")} items={similarItems} render={(tr) => <CardTrack key={tr.id} track={tr} list={similarItems} />} />
      )}
      <Row title={t("rowAlbumsToExplore")} items={fresh === null ? null : freshAlbums} render={(a) => <CardAlbum key={a.id} album={a} />} />
      <Row title={t("rowArtistsForYou")} items={moodCalm === null ? null : artists} render={(a) => <CardArtist key={a.id} artist={a} />} />

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
  );
}
