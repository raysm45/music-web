import React, { useEffect, useState, useRef } from "react";
import { LogIn, Users, Heart, Share2, Sparkles, ChevronDown, AlertTriangle, ShieldCheck, Music2, Radio, Waves, ArrowRight } from "lucide-react";
import { LeafMark, IvyFallLoader, SmartCover } from "../lib/brand.jsx";
import { useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";

/* Ikon provider — digambar manual (bukan aset luar) supaya ringan dan tidak
   menambah request/font/lib baru. Ukuran & warna diatur lewat props. */
function GoogleGlyph({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.17 8.8 3.46l6.55-6.55C35.34 2.5 30.06 0 24 0 14.64 0 6.56 5.38 2.56 13.22l7.63 5.93C12.1 13.36 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.22-.42-4.75H24v9h12.6c-.55 2.9-2.2 5.36-4.68 7.02l7.4 5.75C43.6 37.6 46.5 31.6 46.5 24.5z" />
      <path fill="#FBBC05" d="M10.19 19.15A14.5 14.5 0 0 0 9.5 24c0 1.75.3 3.43.83 4.98l-7.63 5.93A24 24 0 0 1 0 24c0-3.87.93-7.52 2.56-10.78z" />
      <path fill="#34A853" d="M24 48c6.06 0 11.15-2 14.87-5.48l-7.4-5.75c-2.06 1.4-4.7 2.23-7.47 2.23-6.4 0-11.9-3.86-13.85-9.65l-7.63 5.93C6.56 42.62 14.64 48 24 48z" />
    </svg>
  );
}

function DiscordGlyph({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill={color}
        d="M19.27 5.33A17.9 17.9 0 0 0 14.9 4c-.2.36-.42.83-.58 1.2a16.6 16.6 0 0 0-4.64 0A8 8 0 0 0 9.1 4a17.9 17.9 0 0 0-4.38 1.33C1.9 9.13 1.15 12.83 1.5 16.47a18 18 0 0 0 5.48 2.75c.44-.6.83-1.24 1.17-1.92-.64-.24-1.26-.53-1.84-.88.15-.11.3-.23.45-.35a12.8 12.8 0 0 0 10.48 0c.15.12.3.24.45.35-.58.35-1.2.64-1.84.88.34.68.73 1.32 1.17 1.92a18 18 0 0 0 5.48-2.75c.42-4.23-.66-7.9-2.83-11.14ZM8.68 14.2c-.94 0-1.71-.87-1.71-1.94 0-1.06.75-1.94 1.71-1.94.97 0 1.74.89 1.72 1.94 0 1.07-.75 1.94-1.72 1.94Zm6.64 0c-.94 0-1.71-.87-1.71-1.94 0-1.06.75-1.94 1.71-1.94.97 0 1.74.89 1.72 1.94 0 1.07-.74 1.94-1.72 1.94Z"
      />
    </svg>
  );
}

const STEPS = [
  { title: "Masuk sekali dengan Discord", body: "Tidak perlu akun baru atau kata sandi tambahan. Satu kali klik, dan kamu langsung berada di dalam." },
  { title: "Jelajahi dan simpan pilihanmu", body: "Cari lagu, susun playlist, dan tandai favorit. Setiap preferensi kamu tersimpan rapi untuk kunjungan berikutnya." },
  { title: "Dengarkan bersama, di mana saja", body: "Buka sebuah ruang dan ajak orang lain bergabung. Semua mendengar lagu yang sama, pada detik yang sama." },
];

const FAQS = [
  { q: "Apakah AIVY berbayar?", a: "Tidak. Seluruh fitur inti AIVY dapat digunakan tanpa biaya, dirancang untuk dipakai setiap hari." },
  { q: "Mengapa masuk harus melalui Discord?", a: "Supaya kamu tidak perlu membuat dan mengingat kata sandi baru. AIVY hanya meminta nama dan foto profil dasar untuk menampilkan akunmu." },
  { q: "Bagaimana cara mendengarkan bersama teman?", a: "Buka halaman Ruang, buat ruang baru, lalu bagikan tautannya. Setiap orang yang bergabung mendengar di detik yang sama." },
  { q: "Apakah data saya aman?", a: "Kami hanya menyimpan yang diperlukan agar AIVY berjalan — riwayat putar, playlist, dan preferensi tampilanmu." },
];

const MOOD_CHIPS = ["Fokus", "Santai", "Perjalanan", "Malam Hari", "Semangat Pagi", "Nostalgia", "Hujan", "Kerja", "Lari Pagi", "Akustik"];

function useRevealOnScroll(containerRef) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add("in"); }),
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [containerRef]);
}

function useSpotlight(ref) {
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

function useMagnetic(ref, strength = 16) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength * 0.6}px)`;
    };
    const onLeave = () => { el.style.transform = "translate(0, 0)"; };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); };
  }, [ref, strength]);
}

function useTilt(ref, strength = 10) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      el.style.transform = `perspective(900px) rotateY(${dx * strength}deg) rotateX(${-dy * strength}deg) scale(1.015)`;
    };
    const onLeave = () => { el.style.transform = "perspective(900px) rotateY(0) rotateX(0) scale(1)"; };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); };
  }, [ref, strength]);
}

function PreviewMockup() {
  const tiltRef = useRef(null);
  useTilt(tiltRef, 7);
  return (
    <div className="aivy-preview-mock" ref={tiltRef}>
      <div className="aivy-preview-mock-glow" />
      <div className="aivy-preview-mock-row">
        <div className="art"><SmartCover seed="aivy-preview-hero" size={64} radius={12} style={{ width: 52, height: 52 }} /></div>
        <div className="txt">
          <div className="t">Perjalanan Sore</div>
          <div className="a">Studio Ivy \u00b7 Lagu Instrumental</div>
        </div>
        <Waves size={18} color="var(--moss-strong)" className="wave" />
      </div>
      <div className="aivy-preview-mock-bar"><span style={{ width: "62%" }} /></div>
      <div className="aivy-preview-mock-tags">
        <span><Radio size={12} /> Radio otomatis aktif</span>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { authUser, authChecked, login } = useUI();
  const { navigate } = useRouter();
  const [showTopCta, setShowTopCta] = useState(false);
  const [vineProgress, setVineProgress] = useState(0);
  const [faqOpen, setFaqOpen] = useState(0);
  const heroRef = useRef(null);
  const landingRef = useRef(null);
  const storyRef = useRef(null);
  const spotlightRef = useRef(null);
  const ctaRef = useRef(null);
  useSpotlight(spotlightRef);
  useMagnetic(ctaRef, 10);

  useEffect(() => {
    if (authChecked && authUser) navigate("home", { replace: true });
  }, [authChecked, authUser, navigate]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowTopCta(!entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const scrollEl = landingRef.current;
    const storyEl = storyRef.current;
    if (!scrollEl || !storyEl) return;
    let raf = null;
    const update = () => {
      const rect = storyEl.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const total = rect.height - viewportH * 0.45;
      const scrolled = viewportH * 0.45 - rect.top;
      setVineProgress(total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { update(); raf = null; });
    };
    update();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useRevealOnScroll(landingRef);

  return (
    <div className="aivy-landing" ref={landingRef}>
      <header className={`aivy-landing-topbar ${showTopCta ? "solid" : ""}`}>
        <div className="aivy-brand"><LeafMark size={24} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
        <button className="aivy-btn-primary" onClick={login}>Masuk</button>
      </header>

      <div className="aivy-landing-blobs" aria-hidden="true">
        <div className="aivy-blob b1" />
        <div className="aivy-blob b2" />
        <div className="aivy-blob b3" />
      </div>

      <div className="aivy-landing-story" ref={storyRef}>
        <div className="aivy-vine-rail" aria-hidden="true">
          <div className="aivy-vine-track" />
          <div className="aivy-vine-fill" style={{ transform: `scaleY(${vineProgress})` }} />
        </div>

        <section className="aivy-landing-hero" ref={(el) => { heroRef.current = el; spotlightRef.current = el; }}>
          <div className="aivy-hero-spotlight" aria-hidden="true" />
          <div className="eyebrow aivy-hero-eyebrow reveal">Platform mendengarkan musik</div>
          <h1 className="font-display reveal">Musik yang tumbuh bersama seleramu</h1>
          <p className="reveal">
            AIVY membantumu menjelajahi lagu baru, menyusun playlist, dan mendengarkan bersama
            teman di ruang yang sama — dirancang tenang, tanpa distraksi yang tidak perlu.
          </p>
          <button className="aivy-btn-primary lg reveal" onClick={login} ref={ctaRef}><LogIn size={17} /> Masuk dengan Discord</button>

          <div className="aivy-hero-preview reveal"><PreviewMockup /></div>
        </section>

        <div className="aivy-marquee-wrap reveal" aria-hidden="true">
          <div className="aivy-marquee">
            <div className="aivy-marquee-track">
              {[...MOOD_CHIPS, ...MOOD_CHIPS].map((m, i) => <span key={i} className="aivy-marquee-chip">{m}</span>)}
            </div>
          </div>
        </div>

        <div className="aivy-landing-steps">
          {STEPS.map((s, i) => (
            <div className="aivy-step reveal" key={s.title}>
              <span className="aivy-step-index">{String(i + 1).padStart(2, "0")}</span>
              <div className="aivy-step-body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section className="aivy-landing-features">
        <div className="aivy-feature-card reveal">
          <Sparkles size={22} color="var(--moss-strong)" />
          <h3>Jelajah tanpa batas</h3>
          <p>Beranda yang terus menyesuaikan diri dengan seleramu, dengan radio otomatis saat antreanmu habis.</p>
        </div>
        <div className="aivy-feature-card reveal">
          <Users size={22} color="var(--moss-strong)" />
          <h3>Mendengarkan bersama</h3>
          <p>Buka sebuah ruang, undang teman, dan dengarkan lagu yang sama secara real-time bersama.</p>
        </div>
        <div className="aivy-feature-card reveal">
          <Heart size={22} color="var(--moss-strong)" />
          <h3>Koleksi milikmu</h3>
          <p>Simpan yang kamu suka dan susun playlist sendiri, mudah ditemukan kembali kapan pun.</p>
        </div>
        <div className="aivy-feature-card reveal">
          <Share2 size={22} color="var(--moss-strong)" />
          <h3>Mudah dibagikan</h3>
          <p>Klik kanan pada lagu apa pun untuk langsung menyalin tautannya kepada teman.</p>
        </div>
      </section>

      <section className="aivy-landing-quote reveal">
        <blockquote>{"\u201cTidak semua hal perlu terburu-buru. Yang paling membekas biasanya yang tumbuh perlahan.\u201d"}</blockquote>
        <cite>Filosofi di balik AIVY</cite>
      </section>

      <section className="aivy-landing-faq reveal">
        <h2 className="font-display">Pertanyaan yang sering diajukan</h2>
        <div className="aivy-faq-list">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`aivy-faq-item ${faqOpen === i ? "open" : ""}`}>
              <button className="aivy-faq-q" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} aria-expanded={faqOpen === i}>
                <span>{f.q}</span>
                <ChevronDown size={16} />
              </button>
              <div className="aivy-faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="aivy-landing-footer-v2">
        <div className="aivy-footer-grid">
          <div className="aivy-footer-brand reveal">
            <div className="aivy-brand"><LeafMark size={22} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
            <p>Terinspirasi dari tanaman ivy yang tumbuh perlahan namun menjalar ke mana-mana — AIVY menemanimu menjelajahi musik dengan ritme sendiri.</p>
          </div>
          <div className="aivy-footer-col reveal">
            <h4>Jelajah</h4>
            <ul>
              <li>Pencarian musik<span>Temukan lagu dan artis baru</span></li>
              <li>Playlist pribadi<span>Susun koleksi favoritmu</span></li>
              <li>Ruang dengar bersama<span>Dengarkan bersama teman secara real-time</span></li>
            </ul>
          </div>
          <div className="aivy-footer-col reveal">
            <h4>Akun</h4>
            <ul>
              <li>Masuk dengan Discord<span>Satu klik, tanpa kata sandi baru</span></li>
              <li>Riwayat dan favorit<span>Tersimpan otomatis setiap kamu mendengarkan</span></li>
            </ul>
          </div>
        </div>
        <div className="aivy-footer-bottom">
          <span className="mark"><LeafMark size={16} color="var(--ink-faint)" /> AIVY</span>
          <span>Dibuat untuk siapa pun yang menikmati musik dengan tenang.</span>
        </div>
      </footer>
    </div>
  );
}

const LOGIN_ERRORS = {
  discord_denied: "Proses masuk melalui Discord dibatalkan. Silakan coba lagi kapan saja.",
  google_denied: "Proses masuk melalui Google dibatalkan. Silakan coba lagi kapan saja.",
  no_code: "Proses masuk terhenti di tengah jalan. Coba klik tombolnya sekali lagi.",
  user_not_found: "Akun kamu tidak ditemukan setelah proses masuk. Coba ulangi beberapa saat lagi.",
  login_failed: "Terjadi gangguan saat menghubungkan akunmu. Silakan coba lagi sebentar lagi.",
  google_not_ready: "Masuk dengan Google belum tersambung ke server. Untuk saat ini silakan pakai Discord dulu, ya.",
};

const VISUAL_POINTS = [
  { icon: Music2, text: "Beranda yang terus menyesuaikan diri dengan seleramu" },
  { icon: Users, text: "Ruang untuk mendengarkan bersama teman secara real-time" },
  { icon: ShieldCheck, text: "Hanya meminta informasi profil dasar akunmu" },
];

/* Beberapa daun kecil melayang di panel visual. Semua digerakkan lewat
   `transform` + `opacity` saja (bukan top/left, width, atau filter yang
   di-animasikan) supaya browser cukup mengkomposit ulang layer-nya tanpa
   perlu re-layout/re-paint — ini yang bikin animasinya tetap mulus walau
   dijalankan di HP atau laptop lawas. Jumlahnya sengaja dibatasi 4 saja. */
const LEAVES = [
  { top: "14%", left: "72%", delay: "0s", duration: "10s" },
  { top: "58%", left: "84%", delay: "1.8s", duration: "12s" },
  { top: "76%", left: "20%", delay: "3.4s", duration: "11s" },
  { top: "30%", left: "10%", delay: "5.1s", duration: "9.5s" },
];

export function LoginPage() {
  const ui = useUI();
  const { authUser, authChecked, login, loginGoogle } = ui;
  const { navigate } = useRouter();
  const [errorCode, setErrorCode] = useState(null);
  const [pending, setPending] = useState(null); // "discord" | "google" | null

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

  const handleDiscord = () => {
    setErrorCode(null);
    setPending("discord");
    login();
  };

  const handleGoogle = () => {
    setErrorCode(null);
    if (typeof loginGoogle === "function") {
      setPending("google");
      loginGoogle();
    } else {
      // Backend Google belum terpasang di context.jsx — tampilkan info,
      // jangan biarkan tombolnya diam saja tanpa umpan balik.
      setErrorCode("google_not_ready");
    }
  };

  return (
    <div className="aivy-login-shell aivy-login-shell2">
      <div className="aivy-login-visual" aria-hidden="true">
        <div className="aivy-blob b1" />
        <div className="aivy-blob b3" />
        {LEAVES.map((leaf, i) => (
          <span
            className="aivy-login-leaf"
            key={i}
            style={{ top: leaf.top, left: leaf.left, animationDelay: leaf.delay, animationDuration: leaf.duration }}
          >
            <LeafMark size={16} color="var(--moss-strong)" />
          </span>
        ))}
        <div className="aivy-brand"><LeafMark size={24} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
        <p className="aivy-login-visual-quote">{"\u201cMusik yang tumbuh perlahan bersama seleramu, bukan yang dipaksakan kepadamu.\u201d"}</p>
        <div className="aivy-login-visual-points">
          {VISUAL_POINTS.map(({ icon: Icon, text }) => (
            <div className="aivy-login-visual-point" key={text}><Icon size={17} color="var(--moss-strong)" /><span>{text}</span></div>
          ))}
        </div>
      </div>

      <div className="aivy-login">
        <div className="aivy-login-card aivy-login-card2">
          <div className="aivy-login-mark stagger-1">
            <LeafMark size={30} color="var(--moss-strong)" />
          </div>
          <h1 className="font-display stagger-2">Selamat datang di AIVY</h1>
          <p className="stagger-3">Masuk untuk menyimpan lagu, menyusun playlist, dan mendengarkan bersama teman di ruang yang sama.</p>

          {errorCode && (
            <div className="aivy-login-error aivy-login-error-anim" role="alert">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{LOGIN_ERRORS[errorCode] || LOGIN_ERRORS.login_failed}</span>
            </div>
          )}

          {!authChecked ? (
            <div style={{ padding: "18px 0" }}><IvyFallLoader size={30} /></div>
          ) : (
            <div className="aivy-login-providers stagger-4">
              <button
                type="button"
                className="aivy-provider-btn google"
                onClick={handleGoogle}
                disabled={pending !== null}
              >
                {pending === "google" ? <IvyFallLoader size={16} /> : <GoogleGlyph size={18} />}
                <span>Lanjutkan dengan Google</span>
              </button>

              <div className="aivy-login-divider"><span>atau</span></div>

              <button
                type="button"
                className="aivy-provider-btn discord"
                onClick={handleDiscord}
                disabled={pending !== null}
              >
                {pending === "discord" ? <IvyFallLoader size={16} /> : <DiscordGlyph size={18} color="var(--moss-strong)" />}
                <span>Lanjutkan dengan Discord</span>
                <ArrowRight size={15} className="aivy-provider-arrow" />
              </button>
              <span className="aivy-login-alt-note">Discord tersedia sebagai jalur masuk alternatif.</span>
            </div>
          )}

          <span className="aivy-login-fineprint stagger-5">Kami hanya meminta akses nama dan foto profil akunmu — bukan pesan, kontak, atau data pribadi lainnya.</span>
          <Link to="landing" className="aivy-login-back stagger-5">{"\u2190 Kembali ke halaman depan"}</Link>
        </div>
      </div>
    </div>
  );
}