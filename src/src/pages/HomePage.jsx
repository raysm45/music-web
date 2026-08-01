import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Api } from "../lib/api.js";
import { usePlayer } from "../context.jsx";
import { CardTrack, CardAlbum, CardArtist } from "../components.jsx";
import { IvyFallLoader } from "../lib/brand.jsx";
import { uid } from "../lib/utils.js";

function greetingText() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return ["Pagi ini mulai dengan apa?", "Beberapa lagu buat nemenin pagi kamu."];
  if (h >= 11 && h < 15) return ["Siang santai.", "Putar sesuatu buat nemenin jam istirahat."];
  if (h >= 15 && h < 18) return ["Sore ini enaknya dengerin apa?", "Kumpulan yang pas buat jam-jam segini."];
  if (h >= 18 && h < 23) return ["Malam ini, temenin dengan musik.", "Pelan-pelan aja, nggak usah buru-buru."];
  return ["Masih kebangun?", "Beberapa pilihan yang cocok buat begadang."];
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
  const [greet1, greet2] = useMemo(greetingText, []);
  const { liked, history: playedHistory } = usePlayer();

  const trending = useDiscoverRow("trending-" + new Date().toDateString());
  const fresh = useDiscoverRow("fresh-" + Math.floor(Date.now() / 3600000));
  const moodCalm = useDiscoverRow("mood-santai");

  const trendingTracks = useMemo(() => (trending || []).filter((i) => i.type === "track").slice(0, 12), [trending]);
  const freshAlbums = useMemo(() => (fresh || []).filter((i) => i.type === "album").slice(0, 12), [fresh]);
  const artists = useMemo(() => (moodCalm || []).filter((i) => i.type === "artist").slice(0, 12), [moodCalm]);

  const [similarItems, setSimilarItems] = useState(null);
  useEffect(() => {
    const likedIds = [...liked];
    if (!likedIds.length) { setSimilarItems([]); return; }
    const seedId = likedIds[Math.floor(Math.random() * likedIds.length)];
    Api.similar({ trackId: seedId }).then((res) => setSimilarItems(res.items || [])).catch(() => setSimilarItems([]));
  }, [liked]);

  // --- feed campuran tak berujung ---
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

  useEffect(() => { loadMore(); }, []); // eslint-disable-line

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const exploreTracks = useMemo(() => items.filter((i) => i.type === "track"), [items]);

  return (
    <div className="aivy-view-enter">
      <div className="aivy-greet"><h1 className="font-display">{greet1}</h1><p>{greet2}</p></div>

      {playedHistory.length > 0 && (
        <Row title="Lanjutkan dengerin" items={playedHistory.slice(0, 12)} render={(t) => <CardTrack key={t.id} track={t} list={playedHistory} />} />
      )}
      <Row title="Lagi Ramai" items={trending === null ? null : trendingTracks} render={(t) => <CardTrack key={t.id} track={t} list={trendingTracks} />} />
      {similarItems && similarItems.length > 0 && (
        <Row title="Karena kamu suka lagu ini" items={similarItems} render={(t) => <CardTrack key={t.id} track={t} list={similarItems} />} />
      )}
      <Row title="Album buat dijelajah" items={fresh === null ? null : freshAlbums} render={(a) => <CardAlbum key={a.id} album={a} />} />
      <Row title="Artist untuk kamu" items={moodCalm === null ? null : artists} render={(a) => <CardArtist key={a.id} artist={a} />} />

      <section className="aivy-section">
        <div className="aivy-section-head"><h2 className="aivy-section-title">Jelajahi</h2></div>
        <div className="aivy-grid">
          {items.map((item, i) => {
            if (item.type === "track") return <CardTrack key={`t-${item.id}-${i}`} track={item} list={exploreTracks} />;
            if (item.type === "album") return <CardAlbum key={`a-${item.id}-${i}`} album={item} />;
            return <CardArtist key={`ar-${item.id}-${i}`} artist={item} />;
          })}
        </div>
        <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "26px 0" }}>
          {loading && <IvyFallLoader size={28} />}
          {done && items.length > 0 && <span className="eyebrow">Kamu udah sampai ujung jelajahan hari ini</span>}
        </div>
      </section>
    </div>
  );
}
