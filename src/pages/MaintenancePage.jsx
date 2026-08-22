import React, { useCallback, useEffect, useRef, useState } from "react";
import { LEAF_PATH, LeafMark } from "../lib/brand.jsx";
import { clamp } from "../lib/utils.js";

/*
 * MaintenancePage
 * ----------------
 * Halaman "Dalam Pemeliharaan" berupa ilustrasi ruang tamu yang bisa diutak-atik.
 * Semua perabotan (TV, sofa, meja, lampu, rak buku, tanaman) dan maskot "Lumi"
 * bisa diseret bebas ke mana saja. Ekspresi Lumi berubah mengikuti interaksi:
 *   - diam (neutral)   -> keadaan default
 *   - disentuh/hover   -> senang sesaat
 *   - diseret          -> kaget (mata besar)
 *   - dilepas di karpet ("titik aman") -> senang
 *   - dilepas di luar karpet           -> sedih
 *
 * Tidak ada dependency baru: hanya React + pointer events + CSS murni,
 * jadi file ini aman ditempel langsung tanpa perlu install paket tambahan.
 */

// ---------------------------------------------------------------------------
// Konfigurasi ruangan
// ---------------------------------------------------------------------------

const ITEM_IDS = ["bookshelf", "plant", "tv", "lamp", "sofa", "table", "character"];

// Ukuran (px) tiap elemen — dipakai sebagai lebar/tinggi kotak drag-nya.
const ITEM_SIZE = {
  bookshelf: { w: 136, h: 188 },
  plant: { w: 92, h: 152 },
  tv: { w: 210, h: 150 },
  lamp: { w: 66, h: 182 },
  sofa: { w: 280, h: 132 },
  table: { w: 168, h: 66 },
  character: { w: 112, h: 132 },
};

// Posisi awal, dalam persen (%) relatif terhadap panggung (scene), anchor di tengah elemen.
const DEFAULT_POSITIONS = {
  bookshelf: { x: 13, y: 32 },
  plant: { x: 91, y: 62 },
  tv: { x: 46, y: 27 },
  lamp: { x: 84, y: 44 },
  sofa: { x: 47, y: 65 },
  table: { x: 47, y: 87 },
  character: { x: 27, y: 79 },
};

// Urutan tumpuk (semakin besar semakin depan). Item yang sedang diseret otomatis paling depan.
const BASE_Z = { bookshelf: 2, plant: 3, tv: 4, lamp: 5, sofa: 6, table: 7, character: 12 };

// "Titik aman" (karpet) — kotak batas (persen) yang menentukan Lumi senang atau sedih saat dilepas.
const SAFE_ZONE = { xMin: 22, xMax: 68, yMin: 62, yMax: 92 };

// Elemen boleh diseret sedikit melewati tepi panggung supaya ada efek "hampir jatuh".
const DRAG_MARGIN = 9; // persen

const MOOD_LINES = {
  dragging: "Whoaa—!",
  happy: "Hehe, nyaman~",
  sad: "Duh... dingin di sini.",
};

// ---------------------------------------------------------------------------
// Ilustrasi perabotan (murni CSS, tanpa gambar eksternal)
// ---------------------------------------------------------------------------

function TVUnit() {
  return (
    <div className="maint-tv">
      <div className="maint-tv-bezel">
        <div className="maint-tv-screen">
          <div className="maint-tv-scanlines" />
          <div className="maint-tv-glow" />
          <div className="maint-tv-text">
            <span className="maint-tv-eyebrow">AIVY &middot; STUDIO</span>
            <span className="maint-tv-title">DALAM&nbsp;PEMELIHARAAN</span>
            <span className="maint-tv-sub">
              Kami sedang menata ulang ruangan
              <span className="maint-tv-dots"><i /><i /><i /></span>
            </span>
          </div>
        </div>
        <div className="maint-tv-led" />
      </div>
      <div className="maint-tv-stand" />
    </div>
  );
}

function SofaUnit() {
  return (
    <div className="maint-sofa">
      <div className="maint-sofa-back" />
      <div className="maint-sofa-seat">
        <div className="maint-sofa-cushion" />
        <div className="maint-sofa-cushion" />
      </div>
      <div className="maint-sofa-arm left" />
      <div className="maint-sofa-arm right" />
      <div className="maint-sofa-pillow" />
      <div className="maint-sofa-leg left" />
      <div className="maint-sofa-leg right" />
    </div>
  );
}

function TableUnit() {
  return (
    <div className="maint-table">
      <div className="maint-table-top">
        <div className="maint-table-mug" />
        <div className="maint-table-book" />
      </div>
      <div className="maint-table-leg tl" />
      <div className="maint-table-leg tr" />
      <div className="maint-table-leg bl" />
      <div className="maint-table-leg br" />
    </div>
  );
}

function LampUnit() {
  return (
    <div className="maint-lamp">
      <div className="maint-lamp-glow" />
      <div className="maint-lamp-shade" />
      <div className="maint-lamp-pole" />
      <div className="maint-lamp-base" />
    </div>
  );
}

function BookshelfUnit() {
  const rows = [
    ["#8CA37C", "#C97B6B", "#D3B673", "#ADC79C"],
    ["#D3B673", "#8CA37C", "#8CA37C", "#C97B6B", "#ADC79C"],
    ["#C97B6B", "#ADC79C", "#D3B673"],
  ];
  return (
    <div className="maint-shelf">
      {rows.map((row, ri) => (
        <div className="maint-shelf-row" key={ri}>
          {row.map((c, i) => (
            <span
              key={i}
              className="maint-shelf-book"
              style={{ background: c, height: `${58 + ((i + ri * 3) % 3) * 8}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PlantUnit() {
  return (
    <div className="maint-plant">
      <svg viewBox="0 0 32 32" className="maint-plant-leaf a" aria-hidden="true">
        <path d={LEAF_PATH} fill="var(--moss, #8CA37C)" />
      </svg>
      <svg viewBox="0 0 32 32" className="maint-plant-leaf b" aria-hidden="true">
        <path d={LEAF_PATH} fill="var(--moss-strong, #ADC79C)" />
      </svg>
      <svg viewBox="0 0 32 32" className="maint-plant-leaf c" aria-hidden="true">
        <path d={LEAF_PATH} fill="var(--moss, #8CA37C)" />
      </svg>
      <div className="maint-plant-pot" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Karakter "Lumi" — maskot moss kecil bermata besar, ekspresi berganti sesuai state
// ---------------------------------------------------------------------------

function FaceNeutral() {
  return (
    <g>
      <circle cx="47" cy="76" r="5.4" fill="var(--moss-ink, #14170F)" />
      <circle cx="87" cy="76" r="5.4" fill="var(--moss-ink, #14170F)" />
      <circle cx="45.3" cy="74" r="1.6" fill="#fff" opacity=".85" />
      <circle cx="85.3" cy="74" r="1.6" fill="#fff" opacity=".85" />
      <path d="M58,97 Q67,101 76,97" stroke="var(--moss-ink, #14170F)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

function FaceHappy() {
  return (
    <g>
      <path d="M39,78 Q47,68 55,78" stroke="var(--moss-ink, #14170F)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M79,78 Q87,68 95,78" stroke="var(--moss-ink, #14170F)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M52,93 Q67,115 82,93 Q67,104 52,93 Z" fill="var(--moss-ink, #14170F)" />
      <ellipse cx="38" cy="90" rx="7" ry="4.5" fill="var(--berry, #C97B6B)" opacity=".5" />
      <ellipse cx="96" cy="90" rx="7" ry="4.5" fill="var(--berry, #C97B6B)" opacity=".5" />
    </g>
  );
}

function FaceSad() {
  return (
    <g>
      <path d="M40,70 Q47,65 54,71" stroke="var(--moss-ink, #14170F)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M80,71 Q87,65 94,70" stroke="var(--moss-ink, #14170F)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="47" cy="79" r="5" fill="var(--moss-ink, #14170F)" />
      <circle cx="87" cy="79" r="5" fill="var(--moss-ink, #14170F)" />
      <path d="M58,104 Q67,96 76,104" stroke="var(--moss-ink, #14170F)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path className="maint-tear" d="M91,84 C94,89 94,93 91,95 C88,93 88,89 91,84 Z" fill="#CFE3F2" opacity=".9" />
    </g>
  );
}

function FaceSurprised() {
  return (
    <g>
      <path d="M39,68 Q47,60 55,67" stroke="var(--moss-ink, #14170F)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M79,67 Q87,60 95,68" stroke="var(--moss-ink, #14170F)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="47" cy="78" r="8" fill="#fff" stroke="var(--moss-ink, #14170F)" strokeWidth="2" />
      <circle cx="87" cy="78" r="8" fill="#fff" stroke="var(--moss-ink, #14170F)" strokeWidth="2" />
      <circle cx="48.5" cy="79.5" r="3.4" fill="var(--moss-ink, #14170F)" />
      <circle cx="88.5" cy="79.5" r="3.4" fill="var(--moss-ink, #14170F)" />
      <ellipse cx="67" cy="100" rx="6.5" ry="8.5" fill="var(--moss-ink, #14170F)" />
    </g>
  );
}

function CharacterSprite({ expression }) {
  const Face =
    expression === "happy" ? FaceHappy :
    expression === "sad" ? FaceSad :
    expression === "dragging" ? FaceSurprised :
    FaceNeutral;

  return (
    <svg viewBox="0 0 134 150" className={`maint-char-svg is-${expression}`} aria-hidden="true">
      {/* bayangan lantai */}
      <ellipse cx="67" cy="140" rx="38" ry="7" fill="#000" opacity=".22" />
      {/* kaki */}
      <ellipse className="maint-char-foot" cx="48" cy="132" rx="13" ry="8" fill="var(--moss-ink, #14170F)" opacity=".85" />
      <ellipse className="maint-char-foot" cx="86" cy="132" rx="13" ry="8" fill="var(--moss-ink, #14170F)" opacity=".85" />
      {/* lengan */}
      <ellipse className="maint-char-arm left" cx="16" cy="94" rx="10" ry="15" fill="var(--moss, #8CA37C)" />
      <ellipse className="maint-char-arm right" cx="118" cy="94" rx="10" ry="15" fill="var(--moss, #8CA37C)" />
      {/* badan */}
      <ellipse cx="67" cy="86" rx="54" ry="52" fill="var(--moss, #8CA37C)" />
      <ellipse cx="67" cy="96" rx="34" ry="26" fill="var(--moss-strong, #ADC79C)" opacity=".55" />
      {/* tunas daun di kepala (motif brand Aivy) */}
      <g transform="translate(50,4) scale(1.05)">
        <path d={LEAF_PATH} fill="var(--moss-strong, #ADC79C)" />
      </g>
      {/* wajah */}
      <Face />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export function MaintenancePage() {
  const sceneRef = useRef(null);
  const dragInfo = useRef(null); // { id, startClientX, startClientY, startX, startY, moved }
  const moodTimerRef = useRef(null);

  const [positions, setPositions] = useState(DEFAULT_POSITIONS);
  const [dragId, setDragId] = useState(null);
  const [droppedId, setDroppedId] = useState(null); // untuk animasi "bounce" singkat saat dilepas
  const [expression, setExpression] = useState("neutral");
  const [hoveringChar, setHoveringChar] = useState(false);

  useEffect(() => () => clearTimeout(moodTimerRef.current), []);

  const scheduleReturnToNeutral = useCallback((delay) => {
    clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => setExpression("neutral"), delay);
  }, []);

  const onPointerDown = useCallback((id, e) => {
    const scene = sceneRef.current;
    if (!scene) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragInfo.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: positions[id].x,
      startY: positions[id].y,
      moved: false,
    };
    setDragId(id);
    if (id === "character") {
      clearTimeout(moodTimerRef.current);
    }
  }, [positions]);

  const onPointerMove = useCallback((e) => {
    const info = dragInfo.current;
    const scene = sceneRef.current;
    if (!info || !scene) return;

    const rect = scene.getBoundingClientRect();
    const dxPct = ((e.clientX - info.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - info.startClientY) / rect.height) * 100;

    if (!info.moved && Math.hypot(e.clientX - info.startClientX, e.clientY - info.startClientY) > 5) {
      info.moved = true;
      if (info.id === "character") setExpression("dragging");
    }

    const nextX = clamp(info.startX + dxPct, -DRAG_MARGIN, 100 + DRAG_MARGIN);
    const nextY = clamp(info.startY + dyPct, -DRAG_MARGIN, 100 + DRAG_MARGIN);

    setPositions((prev) => ({ ...prev, [info.id]: { x: nextX, y: nextY } }));
  }, []);

  const onPointerUp = useCallback((e) => {
    const info = dragInfo.current;
    if (!info) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    dragInfo.current = null;
    setDragId(null);

    if (info.id === "character") {
      if (!info.moved) {
        // Sekadar diketuk (bukan diseret) -> beri respons senang sesaat, murni interaksi klik.
        setExpression("happy");
        scheduleReturnToNeutral(1400);
      } else {
        setPositions((prev) => {
          const p = prev.character;
          const isSafe =
            p.x >= SAFE_ZONE.xMin && p.x <= SAFE_ZONE.xMax &&
            p.y >= SAFE_ZONE.yMin && p.y <= SAFE_ZONE.yMax;
          setExpression(isSafe ? "happy" : "sad");
          scheduleReturnToNeutral(isSafe ? 1800 : 2400);
          return prev;
        });
      }
    } else {
      setDroppedId(info.id);
      setTimeout(() => setDroppedId(null), 260);
    }
  }, [scheduleReturnToNeutral]);

  const resetRoom = useCallback(() => {
    setPositions(DEFAULT_POSITIONS);
    setExpression("neutral");
  }, []);

  const renderContent = (id) => {
    switch (id) {
      case "tv": return <TVUnit />;
      case "sofa": return <SofaUnit />;
      case "table": return <TableUnit />;
      case "lamp": return <LampUnit />;
      case "bookshelf": return <BookshelfUnit />;
      case "plant": return <PlantUnit />;
      case "character": return <CharacterSprite expression={expression} />;
      default: return null;
    }
  };

  const moodText = MOOD_LINES[expression] || "";
  const isCharDragging = dragId === "character";

  return (
    <div className="aivy-maint">
      <style>{MAINT_CSS}</style>

      <header className="maint-header">
        <div className="maint-brand">
          <LeafMark size={22} color="var(--moss-strong, #ADC79C)" />
          <span className="maint-brand-word">Aivy</span>
        </div>
        <div className="maint-status-pill">
          <span className="maint-status-dot" />
          Sedang dalam pemeliharaan
        </div>
        <button type="button" className="maint-reset-btn" onClick={resetRoom}>
          Atur ulang ruangan
        </button>
      </header>

      <div
        ref={sceneRef}
        className="maint-scene"
        onPointerMove={onPointerMove}
      >
        <div className="maint-wall">
          <div className="maint-window">
            <span className="maint-moon" />
            <span className="maint-cloud" />
          </div>
        </div>
        <div className="maint-floor" />

        <div
          className={`maint-rug ${isCharDragging ? "is-target" : ""}`}
          style={{
            left: `${(SAFE_ZONE.xMin + SAFE_ZONE.xMax) / 2}%`,
            top: `${(SAFE_ZONE.yMin + SAFE_ZONE.yMax) / 2}%`,
            width: `${SAFE_ZONE.xMax - SAFE_ZONE.xMin}%`,
            height: `${SAFE_ZONE.yMax - SAFE_ZONE.yMin}%`,
          }}
        >
          {isCharDragging && <span className="maint-rug-label">titik aman</span>}
        </div>

        {ITEM_IDS.map((id) => {
          const pos = positions[id];
          const size = ITEM_SIZE[id];
          const isDragging = dragId === id;
          const isChar = id === "character";
          return (
            <div
              key={id}
              className={[
                "maint-item",
                `maint-item-${id}`,
                isDragging ? "is-dragging" : "",
                droppedId === id ? "is-dropped" : "",
              ].join(" ").trim()}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: size.w,
                height: size.h,
                zIndex: isDragging ? 999 : BASE_Z[id],
              }}
              onPointerDown={(e) => onPointerDown(id, e)}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onMouseEnter={() => {
                if (isChar && !dragId) {
                  setHoveringChar(true);
                  setExpression("happy");
                }
              }}
              onMouseLeave={() => {
                if (isChar && !dragId && hoveringChar) {
                  setHoveringChar(false);
                  setExpression("neutral");
                }
              }}
              role={isChar ? "button" : undefined}
              aria-label={isChar ? "Lumi, maskot Aivy — seret atau ketuk untuk berinteraksi" : undefined}
              tabIndex={isChar ? 0 : undefined}
            >
              {renderContent(id)}
              {isChar && moodText && (
                <div className={`maint-bubble is-${expression}`}>{moodText}</div>
              )}
            </div>
          );
        })}
      </div>

      <p className="maint-hint">
        Semua perabotan bisa diseret ke mana saja — termasuk penghuni ruangan ini. Coba lepaskan Lumi di karpet.
      </p>

      <span className="sr-only" aria-live="polite">
        {expression === "happy" && "Lumi tersenyum"}
        {expression === "sad" && "Lumi sedih"}
        {expression === "dragging" && "Lumi sedang diseret"}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSS — memakai variabel tema Aivy (var(--moss), dst) dengan fallback,
// jadi otomatis mengikuti dark/light mode aplikasi kalau file ini dipasang
// di dalam proyek, dan tetap tampil rapi kalau dipakai berdiri sendiri.
// ---------------------------------------------------------------------------

const MAINT_CSS = `
.aivy-maint{
  min-height: 100dvh;
  background: var(--bg, #12140F);
  color: var(--ink, #ECE8D9);
  font-family: var(--font-body, "Plus Jakarta Sans", -apple-system, sans-serif);
  padding: 22px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  overflow-x: hidden;
}
.sr-only{ position:absolute; width:1px;height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }

.maint-header{
  width: 100%; max-width: 1180px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.maint-brand{ display:flex; align-items:center; gap:8px; margin-right:auto; }
.maint-brand-word{ font-family: var(--font-display,"Plus Jakarta Sans",sans-serif); font-weight:700; font-size:18px; letter-spacing:.01em; }
.maint-status-pill{
  display:flex; align-items:center; gap:8px;
  background: var(--bg-elev-2, #21251A); border:1px solid var(--line,#2A2E20);
  color: var(--ink-dim,#9BA08A); font-size:12.5px; font-weight:600;
  padding:7px 14px; border-radius: var(--radius-pill,999px);
}
.maint-status-dot{
  width:7px; height:7px; border-radius:50%; background: var(--gold,#D3B673);
  box-shadow: 0 0 0 0 rgba(211,182,115,.6);
  animation: maint-pulse 1.8s ease-out infinite;
}
.maint-reset-btn{
  font-size:12.5px; font-weight:600; color: var(--ink-dim,#9BA08A);
  background: var(--bg-elev-2,#21251A); border:1px solid var(--line,#2A2E20);
  padding:7px 14px; border-radius: var(--radius-pill,999px);
  transition: background .15s var(--ease,ease), color .15s var(--ease,ease);
}
.maint-reset-btn:hover{ background: var(--bg-elev-3,#282C1F); color: var(--ink,#ECE8D9); }

.maint-scene{
  position: relative;
  width: min(100%, 1180px);
  height: clamp(440px, 72vh, 700px);
  border-radius: var(--radius-lg,20px);
  overflow: hidden;
  border: 1px solid var(--line,#2A2E20);
  box-shadow: var(--shadow-pop, 0 6px 20px rgba(0,0,0,.32));
  touch-action: none;
  user-select: none;
  cursor: default;
}
.maint-wall{
  position:absolute; inset:0 0 42% 0;
  background: linear-gradient(180deg, var(--bg-elev,#191C14), var(--bg-elev-2,#21251A));
}
.maint-wall::after{
  content:""; position:absolute; inset:0;
  background-image: repeating-linear-gradient(135deg, rgba(255,255,255,.015) 0 2px, transparent 2px 26px);
}
.maint-floor{
  position:absolute; inset:58% 0 0 0;
  background: linear-gradient(180deg, var(--bg-elev-3,#282C1F), var(--bg-elev-2,#21251A));
  border-top: 2px solid var(--line,#2A2E20);
}
.maint-floor::after{
  content:""; position:absolute; inset:0;
  background-image: repeating-linear-gradient(90deg, rgba(0,0,0,.10) 0 1px, transparent 1px 84px);
}
.maint-window{
  position:absolute; top:9%; right:8%; width:110px; height:84px;
  border-radius:10px; overflow:hidden;
  background: linear-gradient(160deg,#3A4A63,#232D40);
  border: 6px solid var(--bg-elev-3,#282C1F);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05);
}
.maint-moon{
  position:absolute; top:14px; right:16px; width:22px; height:22px; border-radius:50%;
  background: var(--gold,#D3B673); box-shadow: 0 0 18px 2px rgba(211,182,115,.5);
}
.maint-cloud{
  position:absolute; bottom:14px; left:10px; width:46px; height:12px; border-radius:999px;
  background: rgba(255,255,255,.18);
}
.maint-cloud::before{
  content:""; position:absolute; left:10px; bottom:6px; width:24px; height:12px; border-radius:999px;
  background: rgba(255,255,255,.18);
}

/* --- karpet / titik aman --- */
.maint-rug{
  position:absolute; transform: translate(-50%,-50%);
  border-radius: 50%;
  background:
    radial-gradient(ellipse at center, rgba(201,123,107,.30), rgba(201,123,107,.14) 55%, transparent 78%);
  border: 2px dashed transparent;
  transition: border-color .2s var(--ease,ease), background .2s var(--ease,ease);
  z-index: 1;
  display:flex; align-items:flex-start; justify-content:center;
}
.maint-rug.is-target{
  border-color: var(--gold,#D3B673);
  background:
    radial-gradient(ellipse at center, rgba(211,182,115,.32), rgba(211,182,115,.16) 55%, transparent 78%);
}
.maint-rug-label{
  margin-top:-10px;
  font-family: var(--font-mono,"JetBrains Mono",monospace);
  font-size:10.5px; letter-spacing:.08em; text-transform:uppercase;
  color: var(--gold,#D3B673); background: var(--bg-elev,#191C14);
  padding:3px 9px; border-radius: var(--radius-pill,999px); border:1px solid var(--line,#2A2E20);
}

/* --- item draggable umum --- */
.maint-item{
  position:absolute; transform: translate(-50%,-50%);
  cursor: grab;
  filter: drop-shadow(0 10px 14px rgba(0,0,0,.28));
  transition: filter .15s var(--ease,ease);
}
.maint-item:active{ cursor: grabbing; }
.maint-item.is-dragging{ filter: drop-shadow(0 18px 22px rgba(0,0,0,.4)); }
.maint-item.is-dropped{ animation: maint-bounce .26s var(--ease,ease); }

/* --- TV --- */
.maint-tv{ width:100%; height:100%; display:flex; flex-direction:column; align-items:center; }
.maint-tv-bezel{
  position:relative; width:100%; height:80%;
  background: var(--bg-elev-3,#282C1F); border-radius:14px; padding:9px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
}
.maint-tv-screen{
  position:relative; width:100%; height:100%; border-radius:8px; overflow:hidden;
  background: radial-gradient(circle at 30% 20%, #1c2a1c, #0c0f09 72%);
  display:flex; align-items:center; justify-content:center;
}
.maint-tv-scanlines{
  position:absolute; inset:0;
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px);
  mix-blend-mode: overlay;
}
.maint-tv-glow{
  position:absolute; inset:-20%; background: radial-gradient(circle, rgba(140,163,124,.35), transparent 60%);
  animation: maint-glow 3.4s ease-in-out infinite;
}
.maint-tv-text{ position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; padding:6px 8px; text-align:center; }
.maint-tv-eyebrow{ font-family: var(--font-mono,"JetBrains Mono",monospace); font-size:8px; letter-spacing:.16em; color: var(--moss-strong,#ADC79C); opacity:.75; }
.maint-tv-title{ font-family: var(--font-mono,"JetBrains Mono",monospace); font-weight:700; font-size:12.5px; letter-spacing:.03em; color:#E7F1DD; text-shadow: 0 0 8px rgba(173,199,156,.6); }
.maint-tv-sub{ font-size:8.5px; color: var(--ink-dim,#9BA08A); display:flex; align-items:center; gap:4px; }
.maint-tv-dots{ display:inline-flex; gap:2px; }
.maint-tv-dots i{ width:3px; height:3px; border-radius:50%; background: var(--moss-strong,#ADC79C); animation: maint-dot 1.2s ease-in-out infinite; }
.maint-tv-dots i:nth-child(2){ animation-delay:.15s; }
.maint-tv-dots i:nth-child(3){ animation-delay:.3s; }
.maint-tv-led{ position:absolute; right:12px; bottom:8px; width:5px; height:5px; border-radius:50%; background:#7CD68C; box-shadow:0 0 6px #7CD68C; animation: maint-pulse 2s ease-out infinite; }
.maint-tv-stand{ width:34%; height:10px; background: var(--bg-elev-3,#282C1F); border-radius:0 0 4px 4px; margin-top:-2px; }
.maint-tv-stand::after{ content:""; display:block; width:70%; height:5px; margin:0 auto; background: var(--bg-elev-3,#282C1F); border-radius:3px; transform: translateY(3px); }

/* --- Sofa --- */
.maint-sofa{ position:relative; width:100%; height:100%; }
.maint-sofa-back{ position:absolute; left:6%; right:6%; top:0; height:58%; background: var(--berry,#C97B6B); border-radius:18px 18px 8px 8px; opacity:.92; }
.maint-sofa-seat{ position:absolute; left:2%; right:2%; bottom:22%; top:44%; background: var(--berry,#C97B6B); border-radius:14px; display:flex; gap:4%; padding:6px; }
.maint-sofa-cushion{ flex:1; background: rgba(255,255,255,.10); border-radius:10px; }
.maint-sofa-arm{ position:absolute; top:14%; bottom:20%; width:11%; background: var(--berry-strong,#DE9686); border-radius:12px; }
.maint-sofa-arm.left{ left:-2%; } .maint-sofa-arm.right{ right:-2%; }
.maint-sofa-pillow{ position:absolute; left:12%; top:30%; width:15%; height:24%; background: var(--gold,#D3B673); border-radius:6px; transform: rotate(-8deg); box-shadow: 0 4px 8px rgba(0,0,0,.2); }
.maint-sofa-leg{ position:absolute; bottom:-8px; width:6px; height:10px; background: var(--bg-elev-3,#282C1F); border-radius:2px; }
.maint-sofa-leg.left{ left:10%; } .maint-sofa-leg.right{ right:10%; }

/* --- Meja --- */
.maint-table{ position:relative; width:100%; height:100%; }
.maint-table-top{ position:absolute; left:0; right:0; top:0; height:46%; background: linear-gradient(180deg, var(--gold,#D3B673), #B8925A); border-radius:10px; display:flex; align-items:flex-end; gap:8px; padding:6px 10px; }
.maint-table-mug{ width:14px; height:16px; border-radius:3px 3px 6px 6px; background: var(--bg-elev,#191C14); }
.maint-table-book{ width:26px; height:8px; border-radius:2px; background: var(--moss,#8CA37C); }
.maint-table-leg{ position:absolute; bottom:0; width:7%; height:56%; background: #8A6A3C; border-radius:2px; }
.maint-table-leg.tl{ left:4%; } .maint-table-leg.tr{ right:4%; } .maint-table-leg.bl{ left:20%; } .maint-table-leg.br{ right:20%; }

/* --- Lampu --- */
.maint-lamp{ position:relative; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; }
.maint-lamp-glow{ position:absolute; top:0; width:120px; height:120px; border-radius:50%; background: radial-gradient(circle, rgba(211,182,115,.35), transparent 65%); animation: maint-glow 3.2s ease-in-out infinite; }
.maint-lamp-shade{ position:relative; width:70%; height:26%; background: linear-gradient(180deg, var(--gold,#D3B673), #C7A25E); clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%); }
.maint-lamp-pole{ width:6px; flex:1; background: var(--bg-elev-3,#282C1F); }
.maint-lamp-base{ width:44%; height:8px; background: var(--bg-elev-3,#282C1F); border-radius:999px; }

/* --- Rak buku --- */
.maint-shelf{ width:100%; height:100%; background: var(--bg-elev-3,#282C1F); border-radius:8px; display:flex; flex-direction:column; justify-content:space-between; padding:8px 8px 10px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.04); }
.maint-shelf-row{ flex:1; display:flex; align-items:flex-end; gap:3px; border-bottom:3px solid var(--bg-elev-2,#21251A); padding-bottom:6px; }
.maint-shelf-book{ flex:1; border-radius:2px 2px 0 0; opacity:.9; }

/* --- Tanaman --- */
.maint-plant{ position:relative; width:100%; height:100%; display:flex; align-items:flex-end; justify-content:center; }
.maint-plant-leaf{ position:absolute; width:46px; height:46px; }
.maint-plant-leaf.a{ bottom:36%; left:14%; transform: rotate(-18deg); }
.maint-plant-leaf.b{ bottom:44%; left:50%; transform: translateX(-50%) scale(1.15); }
.maint-plant-leaf.c{ bottom:36%; right:10%; transform: rotate(24deg) scaleX(-1); }
.maint-plant-pot{ width:56%; height:32%; background: linear-gradient(180deg,#B8734F,#8A5236); clip-path: polygon(12% 0, 88% 0, 100% 100%, 0% 100%); border-radius:0 0 4px 4px; }

/* --- Karakter --- */
.maint-char-svg{ width:100%; height:100%; overflow: visible; }
.maint-char-arm{ transform-origin: center; transition: transform .18s var(--ease,ease); }
.maint-char-svg.is-dragging .maint-char-arm.left{ transform: rotate(-28deg) translateY(-6px); }
.maint-char-svg.is-dragging .maint-char-arm.right{ transform: rotate(28deg) translateY(-6px); }
.maint-char-svg.is-happy .maint-char-foot{ animation: maint-wiggle .5s ease-in-out infinite; }
.maint-tear{ animation: maint-tear-fall 1.1s ease-in infinite; }

.maint-bubble{
  position:absolute; left:50%; top:-14%; transform: translate(-50%,-100%);
  background: var(--bg-elev,#191C14); border:1px solid var(--line,#2A2E20);
  color: var(--ink,#ECE8D9); font-size:12px; font-weight:600; white-space:nowrap;
  padding:6px 12px; border-radius: var(--radius-pill,999px);
  box-shadow: var(--shadow-pop, 0 6px 20px rgba(0,0,0,.32));
  animation: maint-bubble-in .18s var(--ease,ease);
  pointer-events:none;
}
.maint-bubble::after{
  content:""; position:absolute; left:50%; bottom:-5px; transform: translateX(-50%) rotate(45deg);
  width:9px; height:9px; background: var(--bg-elev,#191C14); border-right:1px solid var(--line,#2A2E20); border-bottom:1px solid var(--line,#2A2E20);
}
.maint-bubble.is-sad{ color: #CFE3F2; }
.maint-bubble.is-happy{ color: var(--moss-strong,#ADC79C); }

.maint-hint{
  max-width: 640px; text-align:center; font-size:12.5px; line-height:1.5;
  color: var(--ink-faint,#676B57); font-style: italic; margin:0;
}

@keyframes maint-pulse{
  0%{ box-shadow: 0 0 0 0 rgba(211,182,115,.55); }
  70%{ box-shadow: 0 0 0 8px rgba(211,182,115,0); }
  100%{ box-shadow: 0 0 0 0 rgba(211,182,115,0); }
}
@keyframes maint-glow{
  0%,100%{ opacity:.55; } 50%{ opacity:1; }
}
@keyframes maint-dot{
  0%,100%{ opacity:.25; transform: translateY(0); } 50%{ opacity:1; transform: translateY(-2px); }
}
@keyframes maint-bounce{
  0%{ transform: translate(-50%,-50%) scale(1); }
  40%{ transform: translate(-50%,-50%) scale(1.08,.92); }
  70%{ transform: translate(-50%,-50%) scale(.97,1.04); }
  100%{ transform: translate(-50%,-50%) scale(1); }
}
@keyframes maint-wiggle{
  0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-3px); }
}
@keyframes maint-tear-fall{
  0%{ opacity:0; transform: translateY(0); }
  20%{ opacity:1; }
  100%{ opacity:0; transform: translateY(14px); }
}
@keyframes maint-bubble-in{
  from{ opacity:0; transform: translate(-50%,-92%) scale(.9); }
  to{ opacity:1; transform: translate(-50%,-100%) scale(1); }
}

@media (max-width: 720px){
  .maint-scene{ height: clamp(420px, 66vh, 560px); }
  .maint-header{ gap:8px; }
  .maint-reset-btn{ order:3; width:100%; text-align:center; }
}

@media (prefers-reduced-motion: reduce){
  .maint-tv-glow, .maint-lamp-glow, .maint-status-dot, .maint-tv-dots i, .maint-tear, .maint-char-svg.is-happy .maint-char-foot{
    animation: none !important;
  }
}
`;