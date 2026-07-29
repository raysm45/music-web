import React, { useEffect, useState, useRef } from "react";
import { LogIn, Users, Radio, Heart, Share2, Sparkles } from "lucide-react";
import { LeafMark, TendrilSpinner } from "../lib/brand.jsx";
import { useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";

export function LandingPage() {
  const { authUser, authChecked, login } = useUI();
  const { navigate } = useRouter();
  const [showTopCta, setShowTopCta] = useState(false);
  const heroRef = useRef(null);

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

  return (
    <div className="aivy-landing">
      <header className={`aivy-landing-topbar ${showTopCta ? "solid" : ""}`}>
        <div className="aivy-brand"><LeafMark size={24} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
        <button className="aivy-btn-primary" onClick={login}>Masuk</button>
      </header>

      <section className="aivy-landing-hero" ref={heroRef}>
        <LeafMark size={56} color="var(--moss-strong)" />
        <h1 className="font-display">Musik yang tumbuh bareng selera kamu</h1>
        <p>
          AIVY dengerin pelan-pelan, ga buru-buru. Jelajahi lagu baru, bikin playlist,
          dan dengerin bareng temen di ruang yang sama — semuanya di satu tempat yang tenang.
        </p>
        <button className="aivy-btn-primary lg" onClick={login}><LogIn size={17} /> Masuk dengan Discord</button>
      </section>

      <section className="aivy-landing-features">
        <div className="aivy-feature-card">
          <Sparkles size={22} color="var(--moss-strong)" />
          <h3>Jelajah tanpa ujung</h3>
          <p>Beranda yang terus nawarin lagu baru sesuai yang kamu suka, ga pernah kehabisan.</p>
        </div>
        <div className="aivy-feature-card">
          <Users size={22} color="var(--moss-strong)" />
          <h3>Dengerin bareng</h3>
          <p>Buka ruang, ajak temen, semua orang denger lagu yang sama di waktu yang sama.</p>
        </div>
        <div className="aivy-feature-card">
          <Heart size={22} color="var(--moss-strong)" />
          <h3>Playlist kamu</h3>
          <p>Simpan yang kamu suka, susun playlist sendiri, gampang ditemuin lagi kapan aja.</p>
        </div>
        <div className="aivy-feature-card">
          <Share2 size={22} color="var(--moss-strong)" />
          <h3>Gampang dibagi</h3>
          <p>Klik kanan lagu mana aja buat langsung salin link-nya ke temen.</p>
        </div>
      </section>

      <footer className="aivy-landing-footer">
        <LeafMark size={18} color="var(--ink-faint)" />
        <span>{"AIVY \u2014 terinspirasi dari tanaman ivy yang tumbuh pelan tapi menjalar ke mana-mana."}</span>
      </footer>
    </div>
  );
}

export function LoginPage() {
  const { authUser, authChecked, login } = useUI();
  const { navigate } = useRouter();

  useEffect(() => {
    if (authChecked && authUser) navigate("home", { replace: true });
  }, [authChecked, authUser, navigate]);

  return (
    <div className="aivy-login">
      <div className="aivy-login-card">
        <LeafMark size={40} color="var(--moss-strong)" />
        <h1 className="font-display">Masuk ke AIVY</h1>
        <p>Pakai akun Discord kamu buat nyimpen lagu, bikin playlist, dan dengerin bareng temen di ruang.</p>
        {!authChecked ? (
          <div style={{ padding: "18px 0" }}><TendrilSpinner size={28} color="var(--ink-faint)" /></div>
        ) : (
          <button className="aivy-btn-primary lg" onClick={login}><LogIn size={17} /> Lanjut dengan Discord</button>
        )}
        <Link to="landing" className="aivy-login-back">{"\u2190 Balik ke halaman depan"}</Link>
      </div>
    </div>
  );
}
