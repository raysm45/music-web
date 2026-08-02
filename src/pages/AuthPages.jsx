import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { LogIn, Users, Radio, Heart, Share2, Sparkles } from "lucide-react";
import { LeafMark, IvyFallLoader } from "../lib/brand.jsx";
import { useUI } from "../context.jsx";
import { useRouter, Link } from "../router.jsx";

const FEATURES = [
  { icon: Sparkles, title: "Jelajah tanpa ujung", desc: "Beranda yang terus nawarin lagu baru sesuai yang kamu suka, ga pernah kehabisan." },
  { icon: Users, title: "Dengerin bareng", desc: "Buka ruang, ajak temen, semua orang denger lagu yang sama di waktu yang sama." },
  { icon: Heart, title: "Playlist kamu", desc: "Simpan yang kamu suka, susun playlist sendiri, gampang ditemuin lagi kapan aja." },
  { icon: Share2, title: "Gampang dibagi", desc: "Klik kanan lagu mana aja buat langsung salin link-nya ke temen." },
];

const STEPS = [
  { n: "01", title: "Masuk pakai Discord", desc: "Ga perlu bikin akun baru, satu klik langsung kepake akun Discord kamu." },
  { n: "02", title: "Jelajah & dengerin", desc: "Beranda terus nawarin lagu baru sesuai selera, dari genre yang kamu suka." },
  { n: "03", title: "Ajak temen ke ruang", desc: "Buka Ruang, bagikan link-nya, dengerin lagu yang sama bareng-bareng." },
];

const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};
const cardsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

function VineNode({ topPct }) {
  return (
    <motion.div
      className="aivy-vine-node"
      style={{ top: `${topPct}%` }}
      initial={{ scale: 0, rotate: -30, opacity: 0 }}
      whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
    >
      <LeafMark size={16} color="var(--moss-strong)" />
    </motion.div>
  );
}

export function LandingPage() {
  const { authUser, authChecked, login } = useUI();
  const { navigate } = useRouter();
  const [showTopCta, setShowTopCta] = useState(false);
  const heroRef = useRef(null);
  const scrollRef = useRef(null);
  const storyRef = useRef(null);

  const { scrollY } = useScroll({ container: scrollRef });
  const heroFloatY = useTransform(scrollY, [0, 400], [0, -40]);
  const heroFade = useTransform(scrollY, [0, 320], [1, 0]);

  const { scrollYProgress: storyProgress } = useScroll({
    container: scrollRef,
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const vineScale = useSpring(storyProgress, { stiffness: 60, damping: 20, restDelta: 0.001 });

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
    <div className="aivy-landing" ref={scrollRef}>
      <AnimatePresence>
        <motion.header
          className={`aivy-landing-topbar ${showTopCta ? "solid" : ""}`}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="aivy-brand">
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ display: "inline-flex" }}
            >
              <LeafMark size={24} color="var(--moss-strong)" />
            </motion.span>
            <span className="word font-display">AIVY</span>
          </div>
          <motion.button
            className="aivy-btn-primary"
            onClick={login}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
          >
            Masuk
          </motion.button>
        </motion.header>
      </AnimatePresence>

      <div className="aivy-landing-blobs" aria-hidden="true">
        <div className="aivy-blob b1" />
        <div className="aivy-blob b2" />
        <div className="aivy-blob b3" />
      </div>

      <motion.section
        className="aivy-landing-hero"
        ref={heroRef}
        variants={heroContainer}
        initial="hidden"
        animate="show"
        style={{ y: heroFloatY, opacity: heroFade }}
      >
        <motion.div
          variants={heroItem}
          animate={{ y: [0, -8, 0] }}
          transition={{ y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } }}
        >
          <LeafMark size={56} color="var(--moss-strong)" />
        </motion.div>
        <motion.h1 variants={heroItem} className="font-display">
          Musik yang tumbuh bareng selera kamu
        </motion.h1>
        <motion.p variants={heroItem}>
          AIVY dengerin pelan-pelan, ga buru-buru. Jelajahi lagu baru, bikin playlist,
          dan dengerin bareng temen di ruang yang sama — semuanya di satu tempat yang tenang.
        </motion.p>
        <motion.button
          variants={heroItem}
          className="aivy-btn-primary lg"
          onClick={login}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogIn size={17} /> Masuk dengan Discord
        </motion.button>
      </motion.section>

      <div className="aivy-landing-story" ref={storyRef}>
        <div className="aivy-vine-rail">
          <div className="aivy-vine-track" />
          <motion.div className="aivy-vine-fill" style={{ scaleY: vineScale }} />
          <VineNode topPct={4} />
          <VineNode topPct={50} />
          <VineNode topPct={96} />
        </div>

        <motion.section
          className="aivy-landing-steps"
          variants={cardsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {STEPS.map((step) => (
            <motion.div className="aivy-step" key={step.n} variants={fadeUp}>
              <span className="aivy-step-index">{step.n}</span>
              <div className="aivy-step-body">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.section>
      </div>

      <motion.section
        className="aivy-landing-features"
        variants={cardsContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
      >
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <motion.div
            className="aivy-feature-card"
            key={title}
            variants={fadeUp}
            whileHover={{ y: -6, borderColor: "var(--moss-strong)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Icon size={22} color="var(--moss-strong)" />
            <h3>{title}</h3>
            <p>{desc}</p>
          </motion.div>
        ))}
      </motion.section>

      <motion.section
        className="aivy-landing-quote"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <blockquote>
          "Ivy ga buru-buru. Ia menjalar pelan, daun demi daun, sampe akhirnya
          memenuhi seluruh dinding."
        </blockquote>
        <cite>Filosofi AIVY</cite>
      </motion.section>

      <footer className="aivy-landing-footer-v2">
        <div className="aivy-footer-grid">
          <div className="aivy-footer-brand">
            <div className="aivy-brand"><LeafMark size={20} color="var(--moss-strong)" /><span className="word font-display">AIVY</span></div>
            <p>Terinspirasi dari tanaman ivy yang tumbuh pelan tapi menjalar ke mana-mana — musik yang dijelajahi tanpa buru-buru.</p>
          </div>
          <div className="aivy-footer-col">
            <h4>Perusahaan</h4>
            <ul>
              <li>AIVY<span>Musik yang tumbuh bareng selera kamu</span></li>
              <li>Jakarta, Indonesia</li>
            </ul>
          </div>
          <div className="aivy-footer-col">
            <h4>Pendiri</h4>
            <ul>
              <li>Sultan Syamsuddin Murfati<span>Chief Executive Officer</span></li>
            </ul>
          </div>
        </div>
        <div className="aivy-footer-bottom">
          <span className="mark"><LeafMark size={14} color="var(--ink-faint)" /> © 2026 AIVY. Seluruh hak cipta dilindungi.</span>
          <span>Dibangun dengan sabar, sedikit demi sedikit.</span>
        </div>
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
          <div style={{ padding: "18px 0" }}><IvyFallLoader size={30} /></div>
        ) : (
          <button className="aivy-btn-primary lg" onClick={login}><LogIn size={17} /> Lanjut dengan Discord</button>
        )}
        <Link to="landing" className="aivy-login-back">{"\u2190 Balik ke halaman depan"}</Link>
      </div>
    </div>
  );
}