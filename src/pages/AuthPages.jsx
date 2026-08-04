import React, { useEffect, useState, useRef } from "react";
import { LogIn, Users, Heart, Share2, Sparkles, ChevronDown, AlertTriangle, ShieldCheck, Music2, Radio, Waves } from "lucide-react";
import { LeafMark, IvyFallLoader, SmartCover } from "../lib/brand.jsx";
import { useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";

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
  no_code: "Proses masuk terhenti di tengah jalan. Coba klik tombolnya sekali lagi.",
  user_not_found: "Akun kamu tidak ditemukan setelah proses masuk. Coba ulangi beberapa saat lagi.",
  login_failed: "Terjadi gangguan saat menghubungkan akun Discord kamu. Silakan coba lagi sebentar lagi.",
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
        <p className="aivy-login-visual-quote">{"\u201cMusik yang tumbuh perlahan bersama seleramu, bukan yang dipaksakan kepadamu.\u201d"}</p>
        <div className="aivy-login-visual-points">
          <div className="aivy-login-visual-point"><Music2 size={17} color="var(--moss-strong)" /><span>Beranda yang terus menyesuaikan diri dengan seleramu</span></div>
          <div className="aivy-login-visual-point"><Users size={17} color="var(--moss-strong)" /><span>Ruang untuk mendengarkan bersama teman secara real-time</span></div>
          <div className="aivy-login-visual-point"><ShieldCheck size={17} color="var(--moss-strong)" /><span>Hanya meminta informasi profil dasar Discord kamu</span></div>
        </div>
      </div>

      <div className="aivy-login">
        <div className="aivy-login-card">
          <LeafMark size={40} color="var(--moss-strong)" />
          <h1 className="font-display">Masuk ke AIVY</h1>
          <p>Gunakan akun Discord kamu untuk menyimpan lagu, membuat playlist, dan mendengarkan bersama teman di ruang.</p>

          {errorCode && (
            <div className="aivy-login-error" role="alert">
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{LOGIN_ERRORS[errorCode] || LOGIN_ERRORS.login_failed}</span>
            </div>
          )}

          {!authChecked ? (
            <div style={{ padding: "18px 0" }}><IvyFallLoader size={30} /></div>
          ) : (
            <button className="aivy-btn-primary lg" onClick={login}><LogIn size={17} /> Lanjutkan dengan Discord</button>
          )}
          <span className="aivy-login-fineprint">Kami hanya meminta akses nama dan foto profil Discord kamu — bukan pesan atau server kamu.</span>
          <Link to="landing" className="aivy-login-back">{"\u2190 Kembali ke halaman depan"}</Link>
        </div>
      </div>
    </div>
  );
}
