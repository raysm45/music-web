import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { Api } from "../lib/api.js";
import { useUI } from "../context.jsx";
import { TrackRow, SkeletonList } from "../components.jsx";
import { debounce } from "../lib/utils.js";

const GENRE_SHORTCUTS = ["Pop", "Hip-Hop", "R&B", "Indie", "Rock", "Electronic", "Jazz", "Dangdut", "K-Pop", "Reggae", "Klasik", "Akustik"];

export function SearchPage() {
  const { authUser, settings, t } = useUI();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [lyricsMap, setLyricsMap] = useState({}); // { [trackId]: true | false } - dipakai buat naikin lagu yang ada liriknya ke atas
  const inputRef = useRef(null);

  // Cuma buat dropdown saran ketikan (typeahead) - ringan, bukan hasil
  // pencarian beneran, jadi aman tetep jalan tiap ketik.
  const debouncedSuggest = useRef(debounce((q) => {
    if (!authUser || settings.searchHistoryEnabled === false) return;
    Api.suggestSearches(q).then(setSuggestions).catch(() => {});
  }, 200)).current;

  // FIX bug "kadang hasil pencarian tidak ada, padahal di response ada
  // hasilnya": dulu tiap ketikan langsung nembak Api.search lewat
  // setTimeout, dan kalau ketikan/jaringan ga stabil, response yang LEBIH
  // LAMA bisa nyampe SETELAH response yang lebih baru & nimpa hasil yang
  // udah bener jadi kosong (classic race condition). requestSeqRef di
  // bawah nolak response basi - cuma response dari request PALING TERAKHIR
  // yang boleh nge-set state.
  const requestSeqRef = useRef(0);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (authUser && settings.searchHistoryEnabled !== false) Api.recentSearches(8).then(setRecent).catch(() => {});
  }, [authUser, settings.searchHistoryEnabled]);

  // GANTI "dynamic search" (nyari tiap ketikan) jadi cuma nyari pas user
  // benar-benar niat cari (tekan Enter / pilih saran / klik chip). Ini
  // yang bikin pencarian kerasa "ultra cepet": ga ada lagi request
  // menumpuk tiap huruf yang diketik, cuma 1 request pas user submit.
  const doSearch = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setHasSearched(false); setSearching(false); return; }
    const seq = ++requestSeqRef.current;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await Api.search(trimmed);
      if (seq !== requestSeqRef.current) return; // response basi, buang
      setResults(res || []);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setResults([]);
    } finally {
      if (seq === requestSeqRef.current) setSearching(false);
    }
  };

  const onChangeQuery = (val) => {
    setQuery(val);
    if (!val.trim()) { debouncedSuggest.cancel?.(); setSuggestions([]); setResults([]); setHasSearched(false); return; }
    debouncedSuggest(val.trim());
  };

  const runSearch = (q) => {
    setQuery(q);
    setFocused(false);
    setSuggestions([]);
    if (authUser && settings.searchHistoryEnabled !== false) {
      Api.recordSearch(q).then(() => Api.recentSearches(8).then(setRecent)).catch(() => {});
    }
    doSearch(q);
  };

  const removeRecent = (q, e) => {
    e.stopPropagation();
    setRecent((r) => r.filter((x) => x.query !== q));
    Api.deleteSearch(q).catch(() => {});
  };

  const showBrowse = !query.trim() && !hasSearched;
  const list = results.map((r) => (r.videoId ? { id: r.videoId, videoId: r.videoId, title: r.title, cover: r.thumbnail, duration: r.duration || null, artist: null } : r));

  // Cek ketersediaan lirik buat tiap hasil pencarian (lewat /api/lyrics),
  // lalu naikin lagu-lagu yang liriknya ketemu ke paling atas. Jalan
  // paralel dengan concurrency dibatasin biar ga nembak API kebanyakan
  // request bareng, dan hasil urutan barunya baru di-apply sekali abis
  // SEMUA lagu keceked - biar list-nya ga lompat-lompat urutan tiap
  // sebentar-sebentar pas lagi discroll.
  useEffect(() => {
    if (!results.length) { setLyricsMap({}); return; }
    let cancelled = false;
    setLyricsMap({});
    const items = results.map((r) => (r.videoId ? { id: r.videoId, title: r.title, artist: null, duration: r.duration || null } : r));
    const found = {};
    const CONCURRENCY = 5;
    let cursor = 0;
    const worker = async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        try {
          const res = await Api.lyrics({ title: item.title, artist: item.artist?.name, duration: item.duration });
          found[item.id] = !!(res?.synced || res?.plain);
        } catch {
          found[item.id] = false;
        }
      }
    };
    Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker)).then(() => {
      if (!cancelled) setLyricsMap({ ...found });
    });
    return () => { cancelled = true; };
  }, [results]);

  const sortedList = useMemo(() => {
    return [...list].sort((a, b) => (lyricsMap[a.id] ? 0 : 1) - (lyricsMap[b.id] ? 0 : 1));
  }, [list, lyricsMap]);

  return (
    <div className="aivy-view-enter">
      <div className="aivy-search-head">
        <div className="aivy-search-box">
          <Search size={16} />
          <input
            ref={inputRef} className="aivy-input" placeholder={t("searchPlaceholder")}
            value={query} onChange={(e) => onChangeQuery(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) runSearch(query.trim()); }}
          />
          {query && <button className="aivy-icon-btn sm" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }} onClick={() => { setQuery(""); setResults([]); setHasSearched(false); setSuggestions([]); }} aria-label={t("clear")}><X size={14} /></button>}
        </div>

        {focused && query.trim() && suggestions.length > 0 && (
          <div className="aivy-suggest-drop">
            {suggestions.map((s) => (
              <button key={s.query} className="aivy-suggest-item" onMouseDown={() => runSearch(s.query)}>
                <TrendingUp size={13} color="var(--ink-faint)" /><span>{s.query}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showBrowse && (
        <>
          {recent.length > 0 && (
            <section className="aivy-section" style={{ marginTop: 0 }}>
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("recentSearches")}</h2>
                <button className="aivy-section-link" onClick={() => { Api.clearSearchHistory().catch(() => {}); setRecent([]); }}>{t("clearAll")}</button>
              </div>
              <div className="aivy-recent-list">
                {recent.map((r) => (
                  <button key={r.query} className="aivy-recent-chip" onClick={() => runSearch(r.query)}>
                    <Clock size={13} /><span>{r.query}</span>
                    <span className="x" onClick={(e) => removeRecent(r.query, e)}><X size={12} /></span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="aivy-section" style={{ marginTop: 4 }}>
            <div className="aivy-section-head"><h2 className="aivy-section-title">{t("exploreGenre")}</h2></div>
            <div className="aivy-genre-chips">
              {GENRE_SHORTCUTS.map((g) => <button key={g} className="aivy-chip" onClick={() => runSearch(g)}>{g}</button>)}
            </div>
          </section>
        </>
      )}

      {hasSearched && (
        <div style={{ padding: "4px 2px 12px" }}>
          {searching ? <span className="eyebrow">{t("searching")}</span> : <span className="eyebrow">{results.length} {t("resultsFor")} "{query}"</span>}
        </div>
      )}

      {hasSearched && (
        searching ? <SkeletonList count={8} /> : (
          sortedList.length ? <div>{sortedList.map((tr, i) => <TrackRow key={tr.id + i} track={tr} index={i} list={sortedList} queueMode="radio" />)}</div> : (
            <div className="aivy-empty"><Search size={34} color="var(--ink-faint)" /><div className="title">{t("noResults")}</div><div className="sub">{t("noResultsSub")}</div></div>
          )
        )
      )}
    </div>
  );
}
