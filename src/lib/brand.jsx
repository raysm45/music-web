import { useState, useEffect } from "react";
import { hashStr } from "./utils.js";

export const LEAF_PATH =
  "M16,28 C13.4,25.3 9.6,23.6 7,20.4 C4.6,17.5 4.3,13.2 6.6,10.2 " +
  "C8.5,7.7 11.6,7.3 13.9,9.1 C14.9,9.9 15.5,11 15.9,12.1 " +
  "C16,9.6 16.7,7 18.4,5 C20.3,2.7 23.4,2.1 25.6,3.8 " +
  "C27.7,5.4 28,8.3 26.4,11 C24.9,13.5 22.2,14.8 20.3,13.7 " +
  "C21.4,15 23.6,16.1 25.8,16.6 C28.7,17.3 30.6,19.8 29.9,22.5 " +
  "C29.3,24.9 26.7,26.3 24.2,25.5 C21.9,24.8 20.3,22.8 19.6,20.6 " +
  "C19.3,23.1 18.3,25.6 16.6,27.5 Z";
export const LEAF_VEINS =
  "M16,26 C16.2,21 16.6,16.5 16.3,12.5 M16,20 C13.8,18.4 11.4,16.9 9.3,15.4 " +
  "M16.6,16.5 C19.2,15 21.9,13.7 24,12.2 M16.4,12.8 C18.6,10.6 20.8,8.7 22.6,6.6";
export const TENDRIL_PATH =
  "M17.15,16.06 C17.4,16.09 17.75,16.25 17.86,16.33 C18.07,16.51 18.26,16.72 18.41,16.98 " +
  "C18.54,17.27 18.62,17.58 18.66,17.92 C18.66,18.27 18.61,18.63 18.5,19 " +
  "C18.35,19.36 18.13,19.71 17.86,20.04 C17.55,20.35 17.19,20.62 16.78,20.85 " +
  "C16.33,21.04 15.86,21.18 15.34,21.25 C14.82,21.27 14.28,21.23 13.74,21.1 " +
  "C13.19,20.93 12.67,20.68 12.17,20.35 C11.7,19.98 11.27,19.53 10.9,19.02 " +
  "C10.57,18.47 10.31,17.87 10.13,17.22 C10.01,16.55 9.99,15.86 10.06,15.15 " +
  "C10.19,14.44 10.43,13.75 10.76,13.07 C11.16,12.42 11.65,11.82 12.23,11.27 " +
  "C12.87,10.77 13.58,10.35 14.35,10.02 C15.17,9.75 16.02,9.59 16.91,9.54 " +
  "C17.81,9.56 18.7,9.71 19.59,9.97 C20.47,10.31 21.29,10.77 22.07,11.34 " +
  "C22.79,11.98 23.43,12.72 23.98,13.55 C24.46,14.43 24.82,15.38 25.05,16.38 " +
  "C25.2,17.41 25.2,18.45 25.07,19.51 C24.83,20.57 24.46,21.59 23.94,22.57 " +
  "C23.34,23.52 22.6,24.38 21.74,25.16 C20.81,25.87 19.79,26.45 18.67,26.91 " +
  "C17.51,27.27 16.31,27.49 15.06,27.55 C13.8,27.5 12.56,27.29 11.33,26.91 " +
  "C10.12,26.43 8.99,25.8 7.94,25.01 C6.95,24.13 6.08,23.13 5.34,22.01 " +
  "C4.69,20.81 4.21,19.55 3.9,18.2 C3.71,16.83 3.7,15.44 3.87,14.04";

export function LeafMark({ size = 22, color = "currentColor", className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <path d={LEAF_PATH} fill={color} />
      <path d={LEAF_VEINS} fill="none" stroke="var(--bg)" strokeWidth="0.55" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function TendrilSpinner({ size = 28, color = "currentColor", spin = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={spin ? "aivy-spin" : ""} aria-hidden="true" focusable="false">
      <path d={TENDRIL_PATH} fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeDasharray="86" strokeDashoffset="0" />
    </svg>
  );
}

// Animasi loading "daun ivy gugur" - dipakai gantiin spinner puter-puter
// polos di seluruh app (boot, load home, nyari lirik, dst). Beberapa daun
// (pakai bentuk LEAF_PATH yg sama kayak logo) jatuh + muter pelan, loop
// terus-terusan dengan delay beda-beda tiap daun biar keliatan alami.
export function IvyFallLoader({ size = 48, color = "var(--moss-strong)", label }) {
  const leaves = [
    { x: 3, delay: "0s", scale: 0.52 },
    { x: 13, delay: "-0.9s", scale: 0.4 },
    { x: 22, delay: "-1.8s", scale: 0.46 },
  ];
  return (
    <div className="aivy-ivyloader" style={{ width: size, height: size }} role="status" aria-label={label || "Memuat"}>
      <svg viewBox="0 0 32 32" width={size} height={size} style={{ overflow: "visible" }} aria-hidden="true" focusable="false">
        {leaves.map((leaf, i) => (
          <g key={i} className="aivy-ivyleaf" style={{ animationDelay: leaf.delay }}>
            <path d={LEAF_PATH} fill={color} opacity="0.92" transform={`translate(${leaf.x},-6) scale(${leaf.scale})`} />
          </g>
        ))}
      </svg>
    </div>
  );
}

const DUOTONES = [
  ["#37452F", "#B7C7A3"], ["#2E3A28", "#8CA37C"], ["#4A2F2A", "#C97B6B"],
  ["#33362A", "#D3C08C"], ["#243026", "#7FA88F"], ["#3B2E3B", "#B98FA0"],
  ["#2B3630", "#A7B88C"],
];

// Dipakai HANYA sebagai gambar pengganti kalau track/album/artist beneran
// ga punya cover dari API (field cover/image null) — bukan konten palsu,
// sama kayak avatar-inisial di aplikasi lain waktu foto profil kosong.
export function CoverArt({ seed, size = 160, radius = 14, style = {} }) {
  const h = hashStr(String(seed));
  const [bg, fg] = DUOTONES[h % DUOTONES.length];
  const variant = h % 4;
  const rot = (h % 7) * 11 - 33;
  const scale = 0.82 + ((h >> 3) % 5) * 0.09;
  const tx = 16 + ((h >> 6) % 5) * 3;
  const ty = 15 + ((h >> 9) % 5) * 3;

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ borderRadius: radius, display: "block", ...style }} aria-hidden="true" focusable="false">
      <rect width="32" height="32" fill={bg} />
      {variant === 0 && (
        <g transform={`translate(${tx},${ty}) rotate(${rot}) scale(${scale})`} transformOrigin="16 16">
          <path d={LEAF_PATH} fill={fg} opacity="0.92" transform="translate(-16,-16)" />
        </g>
      )}
      {variant === 1 && (
        <g stroke={fg} strokeWidth="1.4" fill="none" opacity="0.85">
          <path d={TENDRIL_PATH} transform={`rotate(${rot} 16 16) scale(${scale})`} transformOrigin="16 16" />
        </g>
      )}
      {variant === 2 && (
        <g fill={fg} opacity="0.9">
          <g transform={`translate(${tx - 9},${ty - 6}) rotate(${rot}) scale(${scale * 0.6})`} transformOrigin="16 16">
            <path d={LEAF_PATH} transform="translate(-16,-16)" />
          </g>
          <g transform={`translate(${tx + 6},${ty + 7}) rotate(${rot + 40}) scale(${scale * 0.42})`} transformOrigin="16 16">
            <path d={LEAF_PATH} transform="translate(-16,-16)" />
          </g>
        </g>
      )}
      {variant === 3 && (
        <g stroke={fg} strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
          <path d={`M-4,${8 + (h % 6)} C10,${2 + (h % 8)} 22,${20 - (h % 8)} 36,${10 + (h % 6)}`} fill="none" />
          <path d={`M-4,${20 + (h % 5)} C10,${26 - (h % 6)} 22,${8 + (h % 6)} 36,${22 - (h % 5)}`} fill="none" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

// Cover "cerdas": pakai gambar asli kalau ada, jatuh balik ke CoverArt
// generatif kalau kosong atau gagal dimuat.
export function SmartCover({ src, seed, size = 160, radius = 14, style = {}, alt = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  if (!src || failed) return <CoverArt seed={seed} size={size} radius={radius} style={style} />;
  return (
    <img
      src={src} alt={alt} width={size} height={size} loading="lazy"
      style={{ borderRadius: radius, objectFit: "cover", display: "block", background: "var(--bg-elev-2)", ...style }}
      onError={() => setFailed(true)}
    />
  );
}
