import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Clock, TrendingUp, ArrowLeft, ArrowUpLeft, Mic, Music2, Smile, Globe } from "lucide-react";
import { Api } from "../lib/api.js";
import { useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";
import { TrackRow, SkeletonList } from "../components.jsx";
import { SmartCover } from "../lib/brand.jsx";
import { usePlayer } from "../context.jsx";
import {
  debounce, isRelevantArtistMatch, cleanTrackTitleForLyrics,
  getRecentSearchThumbs, saveRecentSearchThumb, removeRecentSearchThumb, clearRecentSearchThumbs,
} from "../lib/utils.js";

const GENRE_SHORTCUTS = ["Pop", "Hip-Hop", "R&B", "Indie", "Rock", "Electronic", "Jazz", "Dangdut", "K-Pop", "Reggae", "Klasik", "Akustik"];

export function SearchPage() {
  const { authUser, settings, t } = useUI();
  const { navigate, back } = useRouter();
  const { playRadio } = usePlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState([]);
  const [recentThumbs, setRecentThumbs] = useState(() => getRecentSearchThumbs());
  const [suggestions, setSuggestions] = useState([]);
  const [lyricsMap, setLyricsMap] = useState({});
  const [checkingLyrics, setCheckingLyrics] = useState(false);
  const [artistHit, setArtistHit] = useState(null);
  const [genresOpen, setGenresOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const tt = useMemo(() => {
    const en = settings.language === "en";
    return (idText, enText) => (en ? enText : idText);
  }, [settings.language]);

  const debouncedSuggest = useRef(debounce((q) => {
    if (!authUser || settings.searchHistoryEnabled === false) return;
    Api.suggestSearches(q).then(setSuggestions).catch(() => {});
  }, 200)).current;

  const requestSeqRef = useRef(0);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => () => { try { recognitionRef.current?.stop(); } catch { /* ignore */ } }, []);
  useEffect(() => {
    if (authUser && settings.searchHistoryEnabled !== false) Api.recentSearches(8).then(setRecent).catch(() => {});
  }, [authUser, settings.searchHistoryEnabled]);

  // Sync search box with ?q= from the URL (e.g. deep link or browser back/forward)
  useEffect(() => {
    const initialQ = new URLSearchParams(window.location.search).get("q");
    if (initialQ && initialQ.trim()) {
      setQuery(initialQ);
      doSearch(initialQ);
    }
    const onPop = () => {
      const q = new URLSearchParams(window.location.search).get("q") || "";
      setQuery(q);
      if (q.trim()) doSearch(q); else { setResults([]); setHasSearched(false); setArtistHit(null); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncUrlQuery = (q) => {
    const url = new URL(window.location.href);
    if (q && q.trim()) url.searchParams.set("q", q.trim());
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const doSearch = async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setHasSearched(false); setSearching(false); setArtistHit(null); return; }
    const seq = ++requestSeqRef.current;
    setSearching(true);
    setHasSearched(true);
    setSearchedQuery(trimmed);
    setArtistHit(null);

    Api.artistQuick(trimmed).then((res) => {
      if (seq !== requestSeqRef.current) return;
      setArtistHit(res && isRelevantArtistMatch(res.name, trimmed) ? res : null);
    }).catch(() => {
      if (seq !== requestSeqRef.current) return;
      setArtistHit(null);
    });

    try {
      const res = await Api.search(trimmed);
      if (seq !== requestSeqRef.current)
        return;
      setResults(res || []);
      if (res && res[0] && res[0].videoId) {
        saveRecentSearchThumb(trimmed, res[0]);
        setRecentThumbs(getRecentSearchThumbs());
      }
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
    syncUrlQuery(q);
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

  const removeRecentThumb = (q, e) => {
    e.stopPropagation();
    removeRecentSearchThumb(q);
    setRecentThumbs(getRecentSearchThumbs());
  };

  const playRecentThumb = (thumb) => {
    playRadio(
      { id: thumb.videoId, videoId: thumb.videoId, title: thumb.title, cover: thumb.thumbnail, artist: thumb.artist ? { name: thumb.artist } : null },
      { type: "search" }
    );
  };

  const fillQuery = (q, e) => {
    e?.stopPropagation();
    setQuery(q);
    onChangeQuery(q);
    inputRef.current?.focus();
  };

  const handleVoiceSearch = () => {
    if (listening) { stopVoiceSearch(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = settings.language === "en" ? "en-US" : "id-ID";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const heard = e.results?.[0]?.[0]?.transcript;
      if (heard && heard.trim()) runSearch(heard.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    try { rec.start(); } catch { setListening(false); }
  };

  const stopVoiceSearch = () => {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  };

  const showBrowse = !query.trim() && !hasSearched;
  const list = results.map((r) => (r.videoId ? { id: r.videoId, videoId: r.videoId, title: r.title, cover: r.thumbnail, duration: r.duration || null, artist: r.artist ? { name: r.artist } : null } : r));

  useEffect(() => {
    if (!results.length) { setLyricsMap({}); setCheckingLyrics(false); return; }
    let cancelled = false;
    setLyricsMap({});
    setCheckingLyrics(true);
    const items = results.map((r) => (r.videoId ? { id: r.videoId, title: r.title, artist: r.artist ? { name: r.artist } : null, duration: r.duration || null } : r));
    const found = {};
    const CONCURRENCY = 5;
    let cursor = 0;
    const worker = async () => {
      while (!cancelled && cursor < items.length) {
        const item = items[cursor++];
        try {
          const cleanedTitle = cleanTrackTitleForLyrics(item.title, item.artist?.name);
          const res = await Api.lyrics({ title: cleanedTitle, artist: item.artist?.name, duration: item.duration });
          found[item.id] = !!(res?.synced || res?.plain);
        } catch {
          found[item.id] = false;
        }
      }
    };
    Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker)).then(() => {
      if (!cancelled) { setLyricsMap({ ...found }); setCheckingLyrics(false); }
    });
    return () => { cancelled = true; };
  }, [results]);

  // Urutan final (lirik duluan) baru dipakai setelah pengecekan lirik selesai,
  // supaya hasil pencarian yang sudah tampil tidak tiba-tiba lompat/geser
  // posisinya saat data lirik baru masuk belakangan.
  const sortedList = useMemo(() => {
    if (checkingLyrics) return list;
    return [...list].sort((a, b) => (lyricsMap[a.id] ? 0 : 1) - (lyricsMap[b.id] ? 0 : 1));
  }, [list, lyricsMap, checkingLyrics]);

  return (
    <div className="aivy-view-enter">
      <div className="aivy-search-head-v2">
        <button className="aivy-icon-btn" onClick={() => back()} aria-label={t("previous")}><ArrowLeft size={18} /></button>

        <div className="aivy-search-box-v2">
          <Search size={16} />
          <input
            ref={inputRef} className="aivy-input" placeholder={t("searchPlaceholder")}
            value={query} onChange={(e) => onChangeQuery(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) runSearch(query.trim()); }}
          />
          {query ? (
            <button className="aivy-icon-btn sm" onClick={() => { setQuery(""); setResults([]); setHasSearched(false); setSuggestions([]); syncUrlQuery(""); }} aria-label={t("clear")}><X size={15} /></button>
          ) : (
            <button className={`aivy-icon-btn sm ${listening ? "active" : ""}`} onClick={handleVoiceSearch} aria-label={listening ? t("stopVoiceSearch") : t("searchWithVoice")}><Mic size={16} /></button>
          )}
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
          {(recent.length > 0 || recentThumbs.length > 0) && (
            <section className="aivy-search-recent-v2">
              <h2 className="aivy-search-subtitle">{t("recentSearches")}</h2>

              {recentThumbs.length > 0 && (
                <div className="aivy-recent-thumbs aivy-scroll">
                  {recentThumbs.map((th) => (
                    <button key={th.query} className="aivy-recent-thumb-card" onClick={() => playRecentThumb(th)} title={th.title}>
                      <span className="rm" onClick={(e) => removeRecentThumb(th.query, e)} aria-label={t("clear")}><X size={12} /></span>
                      <SmartCover src={th.thumbnail} seed={th.videoId + th.title} size={140} radius={10} style={{ width: "100%", aspectRatio: "1 / 1" }} />
                      <span className="cap">{th.title}</span>
                    </button>
                  ))}
                </div>
              )}

              <div>
                {recent.map((r) => (
                  <div key={r.query} className="aivy-recent-row-v2" onClick={() => runSearch(r.query)}>
                    <span className="ic"><Clock size={17} /></span>
                    <span className="txt">{r.query}</span>
                    <button className="fill" onClick={(e) => fillQuery(r.query, e)} aria-label={t("fillSearchBox")}><ArrowUpLeft size={16} /></button>
                  </div>
                ))}
              </div>
              <button className="aivy-search-clearall" onClick={() => { Api.clearSearchHistory().catch(() => {}); setRecent([]); clearRecentSearchThumbs(); setRecentThumbs([]); }}>{t("clearAll")}</button>
            </section>
          )}

          <section className="aivy-search-shortcuts">
            <button className="aivy-shortcut-card" onClick={() => runSearch(tt("rilis baru", "new releases"))}><span className="ic"><Music2 size={18} /></span><span className="lbl">Rilis baru</span></button>
            <button className="aivy-shortcut-card" onClick={() => runSearch(tt("tangga lagu", "top charts"))}><span className="ic"><TrendingUp size={18} /></span><span className="lbl">Tangga lagu</span></button>
            <button className="aivy-shortcut-card" onClick={() => setGenresOpen((v) => !v)}><span className="ic"><Smile size={18} /></span><span className="lbl">Jenis musik &amp; suasana</span></button>
          </section>

          {genresOpen && (
            <section className="aivy-section" style={{ marginTop: 4 }}>
              <div className="aivy-section-head"><h2 className="aivy-section-title">{t("exploreGenre")}</h2></div>
              <div className="aivy-genre-chips">
                {GENRE_SHORTCUTS.map((g) => <button key={g} className="aivy-chip" onClick={() => runSearch(g)}>{g}</button>)}
              </div>
            </section>
          )}
        </>
      )}

      {hasSearched && artistHit && (
        <section className="aivy-section" style={{ marginTop: 4 }}>
          <div className="aivy-section-head"><h2 className="aivy-section-title">{t("artistLabel")}</h2></div>
          <div
            className="aivy-row"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("artist", { params: { id: artistHit.id } })}
          >
            <SmartCover
              src={artistHit.image} seed={"artist" + artistHit.id + artistHit.name} size={48} radius={999}
              style={{ width: 48, height: 48, borderRadius: "50%" }}
            />
            <div className="meta">
              <span className="t">{artistHit.name}</span>
              <span className="a">{t("artistLabel")}</span>
            </div>
          </div>
        </section>
      )}

      {hasSearched && (
        <div style={{ padding: "4px 2px 12px" }}>
          {searching ? <span className="eyebrow">{t("searching")}</span> : <span className="eyebrow">{results.length} {t("resultsFor")} "{searchedQuery}"</span>}
        </div>
      )}

      {hasSearched && (
        (searching || checkingLyrics) ? <SkeletonList count={8} /> : (
          sortedList.length ? <div>{sortedList.map((tr, i) => <TrackRow key={`${tr.id}-${i}`} track={tr} index={i} list={sortedList} queueMode="radio" source={{ type: "search" }} />)}</div> : (
            <div className="aivy-empty"><Search size={34} color="var(--ink-faint)" /><div className="title">{t("noResults")}</div><div className="sub">{t("noResultsSub")}</div></div>
          )
        )
      )}

      {listening && (
        <div className="aivy-voice-overlay">
          <div className="aivy-voice-backdrop" onClick={stopVoiceSearch} />
          <div className="aivy-voice-sheet">
            <div className="aivy-voice-handle" />
            <div className="aivy-voice-lang"><Globe size={14} /><span>{settings.language === "en" ? "English (United States)" : "Bahasa Indonesia (Indonesia)"}</span></div>
            <div className="aivy-voice-title">{tt("Dengerin, ya…", "Listening…")}</div>
            <div className="aivy-voice-stage">
              <span className="aivy-voice-ring r1" />
              <span className="aivy-voice-ring r2" />
              <span className="aivy-voice-ring r3" />
              <button className="aivy-voice-mic" onClick={stopVoiceSearch} aria-label={tt("Batalkan", "Cancel")}><Mic size={24} /></button>
            </div>
            <span className="aivy-voice-hint">{tt("Ketuk mic buat berhenti", "Tap the mic to stop")}</span>
          </div>
        </div>
      )}
    </div>
  );
}