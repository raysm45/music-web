import React, { useEffect, useRef, useState } from "react";
import { LogIn, Users, ShieldCheck, Music2, AlertTriangle, ChevronRight } from "lucide-react";
import { LeafMark, IvyFallLoader } from "../lib/brand.jsx";
import { useUI } from "../context.jsx";
import { useRouter } from "../router.jsx";

const LOGIN_ERRORS = {
  discord_denied: "Proses masuk melalui Discord dibatalkan. Silakan coba lagi kapan saja.",
  google_denied: "Proses masuk melalui Google dibatalkan. Silakan coba lagi kapan saja.",
  no_code: "Proses masuk terhenti di tengah jalan. Coba klik tombolnya sekali lagi.",
  user_not_found: "Akun kamu tidak ditemukan setelah proses masuk. Coba ulangi beberapa saat lagi.",
  login_failed: "Terjadi gangguan saat menghubungkan akunmu. Silakan coba lagi sebentar lagi.",
};

function useCardSpotlight(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [ref]);
}

function spawnRipple(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  const ripple = document.createElement("span");
  ripple.className = "aivy-auth-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${(e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2}px`;
  ripple.style.top = `${(e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

function GoogleGlyph({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2.1 1.5-4.8 2.7-7.7 2.7-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.4 39.6 16.1 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C41.5 36.4 44 30.7 44 24c0-1.3-.1-2.7-.4-3.5z"/>
    </svg>
  );
}

function DiscordGlyph({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M20.3 5.35a18.6 18.6 0 0 0-4.6-1.43.07.07 0 0 0-.08.04c-.2.36-.42.82-.57 1.19a17.2 17.2 0 0 0-5.15 0 8.5 8.5 0 0 0-.58-1.19.07.07 0 0 0-.08-.04c-1.6.28-3.14.76-4.6 1.43a.07.07 0 0 0-.03.03C1.98 9.06 1.25 12.65 1.6 16.2a.08.08 0 0 0 .03.05 18.7 18.7 0 0 0 5.63 2.84.07.07 0 0 0 .08-.03c.43-.6.82-1.23 1.15-1.9a.07.07 0 0 0-.04-.1 12.3 12.3 0 0 1-1.76-.84.07.07 0 0 1-.01-.12c.12-.09.24-.18.35-.27a.07.07 0 0 1 .07-.01c3.7 1.69 7.7 1.69 11.36 0a.07.07 0 0 1 .07.01c.11.1.23.18.35.27a.07.07 0 0 1-.01.12c-.56.33-1.15.6-1.76.84a.07.07 0 0 0-.04.11c.34.66.73 1.29 1.15 1.89a.07.07 0 0 0 .08.03 18.6 18.6 0 0 0 5.64-2.84.07.07 0 0 0 .03-.05c.42-4.1-.7-7.66-2.96-10.82a.06.06 0 0 0-.03-.03zM8.52 14.05c-1.11 0-2.02-1.02-2.02-2.27 0-1.25.89-2.27 2.02-2.27 1.14 0 2.04 1.03 2.02 2.27 0 1.25-.89 2.27-2.02 2.27zm6.98 0c-1.11 0-2.02-1.02-2.02-2.27 0-1.25.89-2.27 2.02-2.27 1.14 0 2.04 1.03 2.02 2.27 0 1.25-.88 2.27-2.02 2.27z"/>
    </svg>
  );
}

function VineDecoration() {
  return (
    <svg className="aivy-login-vine" viewBox="0 0 160 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path className="vine-path" d="M20 10 C 60 40, -10 90, 40 130 S 130 190, 70 230 S 10 280, 60 310" />
      <g className="vine-leaf"><ellipse cx="46" cy="55" rx="12" ry="7" fill="var(--moss)" transform="rotate(-30 46 55)" /></g>
      <g className="vine-leaf"><ellipse cx="18" cy="115" rx="12" ry="7" fill="var(--moss-strong)" transform="rotate(35 18 115)" /></g>
      <g className="vine-leaf"><ellipse cx="118" cy="185" rx="13" ry="7" fill="var(--moss)" transform="rotate(-20 118 185)" /></g>
      <g className="vine-leaf"><ellipse cx="30" cy="270" rx="12" ry="7" fill="var(--moss-strong)" transform="rotate(25 30 270)" /></g>
    </svg>
  );
}

export function LoginPage() {
  const { authUser, authChecked, login, loginGoogle } = useUI();
  const { navigate } = useRouter();
  const [errorCode, setErrorCode] = useState(null);
  const [pending, setPending] = useState(null);
  const cardRef = useRef(null);
  useCardSpotlight(cardRef);

  useEffect(() => {
    if (authChecked && authUser) navigate("home", { replace: true });
  }, [authChecked, authUser, navigate]);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) {
      setErrorCode(code);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogle = (e) => { spawnRipple(e); setPending("google"); loginGoogle(); };
  const handleDiscord = (e) => { spawnRipple(e); setPending("discord"); login(); };

  return (
    <div className="aivy-login-shell">
      <div className="aivy-login-ambient" aria-hidden="true">
        <div className="aivy-blob b1" />
        <div className="aivy-blob b3" />
      </div>

      <div className="aivy-login-visual" aria-hidden="true">
        <div className="aivy-login-visual-top">
          <div className="aivy-brand"><LeafMark size={24} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
          <VineDecoration />
        </div>
        <div className="aivy-login-visual-bottom">
          <p className="aivy-login-visual-quote">{"\u201cMusik yang tumbuh perlahan bersama seleramu, bukan yang dipaksakan kepadamu.\u201d"}</p>
          <div className="aivy-login-visual-points">
            <div className="aivy-login-visual-point"><span className="dot"><Music2 size={14} color="var(--moss-strong)" /></span><span>Beranda yang terus menyesuaikan diri dengan seleramu</span></div>
            <div className="aivy-login-visual-point"><span className="dot"><Users size={14} color="var(--moss-strong)" /></span><span>Ruang untuk mendengarkan bersama teman secara real-time</span></div>
            <div className="aivy-login-visual-point"><span className="dot"><ShieldCheck size={14} color="var(--moss-strong)" /></span><span>Hanya meminta informasi profil dasar akunmu</span></div>
          </div>
          <div className="aivy-login-eq">
            <span style={{ height: 6, animationDelay: "0ms" }} />
            <span style={{ height: 12, animationDelay: "120ms" }} />
            <span style={{ height: 8, animationDelay: "260ms" }} />
            <span style={{ height: 14, animationDelay: "80ms" }} />
            <span style={{ height: 5, animationDelay: "200ms" }} />
          </div>
        </div>
      </div>

      <div className="aivy-login">
        <div className="aivy-login-card" ref={cardRef}>
          <div className="aivy-login-card-spotlight" aria-hidden="true" />
          <div className="aivy-login-card-glow" aria-hidden="true" />

          <div className="aivy-login-mark"><LeafMark size={26} color="var(--moss-strong)" /></div>
          <h1 className="font-display">Masuk ke AIVY</h1>
          <p className="aivy-login-sub">Pilih salah satu akun untuk menyimpan lagu, membuat playlist, dan mendengarkan bersama teman di ruang.</p>

          {errorCode && (
            <div className="aivy-login-error" role="alert">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{LOGIN_ERRORS[errorCode] || LOGIN_ERRORS.login_failed}</span>
            </div>
          )}

          {!authChecked ? (
            <div style={{ padding: "18px 0" }}><IvyFallLoader size={30} /></div>
          ) : (
            <div className="aivy-auth-providers">
              <button className="aivy-auth-btn google" style={{ animationDelay: "60ms" }} onClick={handleGoogle} disabled={!!pending}>
                <span className="shine" aria-hidden="true" />
                <span className="icon-wrap">{pending === "google" ? <IvyFallLoader size={18} /> : <GoogleGlyph size={18} />}</span>
                <span className="label-wrap">
                  <span>Lanjutkan dengan Google</span>
                  <span className="sub">Cepat &amp; direkomendasikan</span>
                </span>
                <ChevronRight size={16} className="chevron" />
              </button>

              <div className="aivy-auth-divider">atau</div>

              <div className="aivy-auth-alt-row">
                <span className="aivy-auth-alt-label">Alternatif login</span>
                <span className="aivy-auth-alt-hint"><DiscordGlyph size={12} color="#5865F2" /> Discord</span>
              </div>
              <button className="aivy-auth-btn discord" style={{ animationDelay: "130ms" }} onClick={handleDiscord} disabled={!!pending}>
                <span className="icon-wrap">{pending === "discord" ? <IvyFallLoader size={18} /> : <DiscordGlyph size={18} color="#5865F2" />}</span>
                <span className="label-wrap">
                  <span>Lanjutkan dengan Discord</span>
                </span>
                <ChevronRight size={16} className="chevron" />
              </button>
            </div>
          )}

          <span className="aivy-login-fineprint"><LogIn size={13} />Kami hanya meminta akses nama dan foto profil — bukan pesan, kontak, atau data pribadi lainnya.</span>
        </div>
      </div>
    </div>
  );
}

export const LandingPage = LoginPage;