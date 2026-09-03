import React from "react";

// Statis, sengaja jauh lebih simpel daripada MaintenancePage (yang animasinya
// buat maintenance TERJADWAL). Ini buat outage MENDADAK — nggak perlu
// karakter jalan-jalan atau progress bar bohongan, cukup kasih tau server
// nggak bisa dihubungi + status coba-lagi.

export function ServerDownPage({ retryInSeconds, onRetryNow }) {
  return (
    <div className="sd-root">
      <div className="sd-card">
        <div className="sd-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v6" />
            <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="var(--sd-x, #E0645A)" strokeWidth="1.6" />
          </svg>
        </div>
        <div className="sd-title">Server sedang tidak bisa dihubungi</div>
        <div className="sd-sub">
          Kami lagi coba menyambung ulang secara otomatis. Nggak perlu refresh manual.
        </div>
        <div className="sd-status">
          <span className="sd-dot" />
          {typeof retryInSeconds === "number"
            ? `Mencoba lagi dalam ${retryInSeconds}s…`
            : "Menyambung ulang…"}
        </div>
        {onRetryNow && (
          <button type="button" className="sd-retry-btn" onClick={onRetryNow}>
            Coba sekarang
          </button>
        )}
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.sd-root{
  width:100vw; height:100dvh;
  display:flex; align-items:center; justify-content:center;
  background: var(--pm-bg, #12140F);
  color: var(--pm-ink, #ECE8D9);
  font-family: var(--pm-font, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif);
  padding: 24px;
}
.sd-card{
  width: 100%; max-width: 340px;
  display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px;
  padding: 32px 26px;
  background: rgba(21,23,15,.6);
  border:1px solid var(--pm-line,#2A2E20);
  border-radius: 20px;
}
.sd-icon{ color: var(--pm-ink-dim,#9BA08A); margin-bottom:6px; }
.sd-title{ font-size:16px; font-weight:700; line-height:1.35; }
.sd-sub{ font-size:13px; line-height:1.55; color: var(--pm-ink-dim,#9BA08A); }
.sd-status{
  display:flex; align-items:center; gap:8px; margin-top:6px;
  font-size:12px; font-weight:600; color: var(--pm-ink-dim,#9BA08A);
  font-family: var(--pm-font-mono,"JetBrains Mono",monospace);
}
.sd-dot{
  width:7px; height:7px; border-radius:50%; background: var(--pm-led-red,#E0645A);
  animation: sd-pulse 1.4s ease-out infinite;
}
.sd-retry-btn{
  margin-top: 14px; padding: 9px 20px; border-radius: 999px;
  background: var(--pm-line,#2A2E20); color: var(--pm-ink,#ECE8D9);
  font-size: 12.5px; font-weight:700; cursor:pointer; border: none;
}
.sd-retry-btn:hover{ background:#343a26; }
@keyframes sd-pulse{
  0%{ box-shadow: 0 0 0 0 rgba(224,100,90,.55); }
  70%{ box-shadow: 0 0 0 8px rgba(224,100,90,0); }
  100%{ box-shadow: 0 0 0 0 rgba(224,100,90,0); }
}
@media (prefers-reduced-motion: reduce){
  .sd-dot{ animation:none !important; }
}
`;
