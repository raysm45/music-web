import React, { useState, useEffect, useRef } from "react";
import { Search, X, Clock, TrendingUp } from "lucide-react";
import { Api } from "../lib/api.js";
import { useUI } from "../context.jsx";
import { TrackRow } from "../components.jsx";
import { debounce } from "../lib/utils.js";

const GENRE_SHORTCUTS = ["Pop", "Hip-Hop", "R&B", "Indie", "Rock", "Electronic", "Jazz", "Dangdut", "K-Pop", "Reggae", "Klasik", "Akustik"];

export function SearchPage() {
  const { authUser, settings } = useUI();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const debouncedSuggest = useRef(debounce((q) => {
    if (!authUser || settings.searchHistoryEnabled === false) return;
    Api.suggestSearches(q).then(setSuggestions).catch(() => {});
  }, 200)).current;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (authUser && settings.searchHistoryEnabled !== false) Api.recentSearches(8).then(setRecent).catch(() => {});
  }, [authUser, settings.searchHistoryEnabled]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); debouncedSuggest.cancel?.(); setSuggestions([]); return; }
    debouncedSuggest(query.trim());
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await Api.search(query)); } catch { setResults([]); }
      setSearching(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = (q) => {
    setQuery(q);
    if (authUser && settings.searchHistoryEnabled !== false) {
      Api.recordSearch(q).then(() => Api.recentSearches(8).then(setRecent)).catch(() => {});
    }
  };

  const removeRecent = (q, e) => {
    e.stopPropagation();
    setRecent((r) => r.filter((x) => x.query !== q));
    Api.deleteSearch(q).catch(() => {});
  };

  const showBrowse = !query.trim();
  const list = results.map((r) => (r.videoId ? { id: r.videoId, videoId: r.videoId, title: r.title, cover: r.thumbnail, duration: r.duration || null, artist: null } : r));

  return (
    <div className="aivy-view-enter">
      <div className="aivy-search-head">
        <div className="aivy-search-box">
          <Search size={16} />
          <input
            ref={inputRef} className="aivy-input" placeholder="Cari lagu atau artist"
            value={query} onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) runSearch(query.trim()); }}
          />
          {query && <button className="aivy-icon-btn sm" style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)" }} onClick={() => setQuery("")} aria-label="Bersihin"><X size={14} /></button>}
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
              <div className="aivy-section-head"><h2 className="aivy-section-title">Pencarian terakhir</h2>
                <button className="aivy-section-link" onClick={() => { Api.clearSearchHistory().catch(() => {}); setRecent([]); }}>Bersihin semua</button>
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
            <div className="aivy-section-head"><h2 className="aivy-section-title">Jelajahi genre</h2></div>
            <div className="aivy-genre-chips">
              {GENRE_SHORTCUTS.map((g) => <button key={g} className="aivy-chip" onClick={() => runSearch(g)}>{g}</button>)}
            </div>
          </section>
        </>
      )}

      {query.trim() && (
        <div style={{ padding: "4px 2px 12px" }}>
          {searching ? <span className="eyebrow">Mencari…</span> : <span className="eyebrow">{results.length} hasil buat "{query}"</span>}
        </div>
      )}

      {!showBrowse && (
        list.length ? <div>{list.map((t, i) => <TrackRow key={t.id + i} track={t} index={i} list={list} />)}</div> : (!searching && (
          <div className="aivy-empty"><Search size={34} color="var(--ink-faint)" /><div className="title">Ga ketemu apa-apa</div><div className="sub">Coba kata kunci lain, atau cek ejaannya.</div></div>
        ))
      )}
    </div>
  );
}