import React, { useEffect, useState, useRef } from "react";
import { LogIn, Users, Heart, Share2, Sparkles, ChevronDown, AlertTriangle, ShieldCheck, Music2 } from "lucide-react";
import { LeafMark, IvyFallLoader } from "../lib/brand.jsx";
import { useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";

const STEPS = [
  { title: "Masuk sekali pakai Discord", body: "Ga perlu bikin akun baru atau nginget password lagi — satu klik, langsung siap dengerin." },
  { title: "Jelajahi & simpan yang kamu suka", body: "Cari lagu, susun playlist, tandain favorit — semua kesukaan kamu ke-inget tiap kamu balik lagi." },
  { title: "Buka ruang, ajak temen dengerin bareng", body: "Semua orang di ruang yang sama denger lagu yang sama, di detik yang sama, walau beda kota." },
];

const FAQS = [
  { q: "Apakah AIVY gratis dipakai?", a: "Iya. AIVY dibikin buat dipakai santai bareng temen — fitur-fitur utamanya ga bayar." },
  { q: "Kenapa masuknya harus lewat Discord?", a: "Biar kamu ga perlu bikin & nginget password baru. AIVY cuma minta info profil dasar (nama & foto) buat nampilin akun kamu." },
  { q: "Gimana cara dengerin bareng temen?", a: "Buka halaman Ruang, bikin ruang baru, terus bagiin link ruangnya ke temen kamu. Semua orang denger di detik yang sama." },
  { q: "Data saya aman ga?", a: "Kami cuma nyimpen apa yang perlu buat AIVY jalan — riwayat putar, playlist, dan preferensi kamu." },
];

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

export function LandingPage() {
  const { authUser, authChecked, login } = useUI();
  const { navigate } = useRouter();
  const [showTopCta, setShowTopCta] = useState(false);
  const [vineProgress, setVineProgress] = useState(0);
  const [faqOpen, setFaqOpen] = useState(0);
  const heroRef = useRef(null);
  const landingRef = useRef(null);
  const storyRef = useRef(null);

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

        <section className="aivy-landing-hero" ref={heroRef}>
          <LeafMark size={56} color="var(--moss-strong)" />
          <h1 className="font-display">Musik yang tumbuh bareng selera kamu</h1>
          <p>
            AIVY dengerin pelan-pelan, ga buru-buru. Jelajahi lagu baru, bikin playlist,
            dan dengerin bareng temen di ruang yang sama — semuanya di satu tempat yang tenang.
          </p>
          <button className="aivy-btn-primary lg" onClick={login}><LogIn size={17} /> Masuk dengan Discord</button>
        </section>

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
          <h3>Jelajah tanpa ujung</h3>
          <p>Beranda yang terus nawarin lagu baru sesuai yang kamu suka, ga pernah kehabisan.</p>
        </div>
        <div className="aivy-feature-card reveal">
          <Users size={22} color="var(--moss-strong)" />
          <h3>Dengerin bareng</h3>
          <p>Buka ruang, ajak temen, semua orang denger lagu yang sama di waktu yang sama.</p>
        </div>
        <div className="aivy-feature-card reveal">
          <Heart size={22} color="var(--moss-strong)" />
          <h3>Playlist kamu</h3>
          <p>Simpan yang kamu suka, susun playlist sendiri, gampang ditemuin lagi kapan aja.</p>
        </div>
        <div className="aivy-feature-card reveal">
          <Share2 size={22} color="var(--moss-strong)" />
          <h3>Gampang dibagi</h3>
          <p>Klik kanan lagu mana aja buat langsung salin link-nya ke temen.</p>
        </div>
      </section>

      <section className="aivy-landing-quote reveal">
        <blockquote>{"\u201cGa semua hal harus buru-buru. Kadang yang paling nempel itu yang tumbuh pelan-pelan.\u201d"}</blockquote>
        <cite>Filosofi di balik AIVY</cite>
      </section>

      <section className="aivy-landing-faq reveal">
        <h2 className="font-display">Pertanyaan yang sering ditanyain</h2>
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
            <p>Terinspirasi dari tanaman ivy yang tumbuh pelan tapi menjalar ke mana-mana — AIVY nemenin kamu jelajah musik dengan ritme sendiri.</p>
          </div>
          <div className="aivy-footer-col reveal">
            <h4>Jelajah</h4>
            <ul>
              <li>Pencarian musik<span>Temukan lagu & artis baru</span></li>
              <li>Playlist pribadi<span>Susun koleksi favorit kamu</span></li>
              <li>Ruang dengerin bareng<span>Dengerin bareng temen real-time</span></li>
            </ul>
          </div>
          <div className="aivy-footer-col reveal">
            <h4>Akun</h4>
            <ul>
              <li>Masuk dengan Discord<span>Satu klik, tanpa password baru</span></li>
              <li>Riwayat & suka<span>Ke-simpen otomatis tiap kamu dengerin</span></li>
            </ul>
          </div>
        </div>
        <div className="aivy-footer-bottom">
          <span className="mark"><LeafMark size={16} color="var(--ink-faint)" /> AIVY</span>
          <span>Dibikin buat yang suka dengerin musik pelan-pelan.</span>
        </div>
      </footer>
    </div>
  );
}

const LOGIN_ERRORS = {
  discord_denied: "Kamu batalin proses masuk lewat Discord. Coba lagi kalau berubah pikiran.",
  no_code: "Proses masuk kegangu di tengah jalan. Coba klik tombolnya sekali lagi ya.",
  user_not_found: "Akun kamu ga ketemu setelah masuk. Coba ulang beberapa saat lagi.",
  login_failed: "Ada gangguan pas nyambungin akun Discord kamu. Coba lagi sebentar lagi.",
};

export function LoginPage() {
  const { authUser, authChecked, login } = useUI();
  const { navigate } = useRouter();
  const [errorCode, setErrorCode] = useState(null);

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

  return (
    <div className="aivy-login-shell">
      <div className="aivy-login-visual" aria-hidden="true">
        <div className="aivy-blob b1" />
        <div className="aivy-blob b3" />
        <div className="aivy-brand"><LeafMark size={24} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
        <p className="aivy-login-visual-quote">{"\u201cMusik yang tumbuh pelan bareng selera kamu, bukan yang dijejelin ke kamu.\u201d"}</p>
        <div className="aivy-login-visual-points">
          <div className="aivy-login-visual-point"><Music2 size={17} color="var(--moss-strong)" /><span>Beranda yang belajar dari yang kamu suka</span></div>
          <div className="aivy-login-visual-point"><Users size={17} color="var(--moss-strong)" /><span>Ruang buat dengerin bareng temen real-time</span></div>
          <div className="aivy-login-visual-point"><ShieldCheck size={17} color="var(--moss-strong)" /><span>Cuma minta info profil dasar Discord kamu</span></div>
        </div>
      </div>

      <div className="aivy-login">
        <div className="aivy-login-card">
          <LeafMark size={40} color="var(--moss-strong)" />
          <h1 className="font-display">Masuk ke AIVY</h1>
          <p>Pakai akun Discord kamu buat nyimpen lagu, bikin playlist, dan dengerin bareng temen di ruang.</p>

          {errorCode && (
            <div className="aivy-login-error" role="alert">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{LOGIN_ERRORS[errorCode] || LOGIN_ERRORS.login_failed}</span>
            </div>
          )}

          {!authChecked ? (
            <div style={{ padding: "18px 0" }}><IvyFallLoader size={30} /></div>
          ) : (
            <button className="aivy-btn-primary lg" onClick={login}><LogIn size={17} /> Lanjut dengan Discord</button>
          )}
          <span className="aivy-login-fineprint">Kami cuma minta akses nama & foto profil Discord kamu — bukan pesan atau server kamu.</span>
          <Link to="landing" className="aivy-login-back">{"\u2190 Balik ke halaman depan"}</Link>
        </div>
      </div>
    </div>
  );
}
