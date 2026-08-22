import React, { useEffect, useRef, useState } from "react";
import {
  Music4, RadioTower, LayoutGrid, Wrench, Sparkles, Volume2, VolumeX, Music2,
} from "lucide-react";
import { LeafMark } from "../lib/brand.jsx";

const PROGRESS = 12;

const TASKS = [
  { icon: Music4, label: "Perbaikan sistem player" },
  { icon: RadioTower, label: "Penulisan ulang kode Listening Room" },
  { icon: LayoutGrid, label: "Optimasi tampilan UI" },
  { icon: Wrench, label: "Perbaikan bug lainnya" },
  { icon: Sparkles, label: "Penambahan fitur baru" },
];

function useAmbientLoop() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const padNodesRef = useRef([]);
  const timerRef = useRef(null);

  const scale = [261.63, 293.66, 329.63, 392.0, 440.0];

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    padNodesRef.current.forEach((n) => { try { n.stop(); } catch { /* noop */ } });
    padNodesRef.current = [];
    if (ctxRef.current) {
      try { ctxRef.current.close(); } catch { /* noop */ }
      ctxRef.current = null;
    }
    setPlaying(false);
  };

  const start = () => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.15;
    master.connect(ctx.destination);
    masterRef.current = master;

    [130.81, 164.81, 196.0].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 700;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 1.6 + i * 0.3);
      padNodesRef.current.push(osc);
    });

    setPlaying(true);

    const playNote = () => {
      if (!ctxRef.current) return;
      const now = ctxRef.current.currentTime;
      const octaveUp = Math.random() > 0.7 ? 2 : 1;
      const freq = scale[Math.floor(Math.random() * scale.length)] * octaveUp;

      const osc = ctxRef.current.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const filter = ctxRef.current.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1700;
      const gain = ctxRef.current.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc.connect(filter).connect(gain).connect(masterRef.current);
      osc.start(now);
      osc.stop(now + 1.2);

      timerRef.current = setTimeout(playNote, 550 + Math.random() * 500);
    };
    playNote();
  };

  useEffect(() => stop, []);

  const toggle = () => (playing ? stop() : start());
  return { playing, toggle };
}

function AivyCharacter() {
  return (
    <div className="aivy-character">
      <span className="aivy-char-sparkle s1" />
      <span className="aivy-char-sparkle s2" />
      <span className="aivy-char-sparkle s3" />

      <span className="aivy-char-sprout"><LeafMark size={16} color="var(--moss-strong)" /></span>

      <span className="aivy-char-head">
        <span className="aivy-char-eye left" />
        <span className="aivy-char-eye right" />
        <span className="aivy-char-blush left" />
        <span className="aivy-char-blush right" />
        <span className="aivy-char-mouth" />
      </span>

      <span className="aivy-char-body">
        <span className="aivy-char-chest"><Music2 size={9} color="var(--bg)" /></span>
        <span className="aivy-char-arm left">
          <span className="aivy-char-tool"><Wrench size={11} color="var(--bg)" /></span>
        </span>
        <span className="aivy-char-arm right" />
      </span>

      <span className="aivy-char-legs">
        <span className="aivy-char-leg left"><span className="aivy-char-foot" /></span>
        <span className="aivy-char-leg right"><span className="aivy-char-foot" /></span>
      </span>
    </div>
  );
}

function AivyRoom() {
  const { playing, toggle } = useAmbientLoop();

  return (
    <div className="aivy-room-full" aria-hidden="true">
      <div className="aivy-room-inner">
        <div className="aivy-room-window" />

        <div className="aivy-room-shelf">
          <span className="aivy-room-pot" />
          <span className="aivy-room-plant-leaf l1"><LeafMark size={14} color="var(--moss)" /></span>
          <span className="aivy-room-plant-leaf l2"><LeafMark size={11} color="var(--moss)" /></span>
        </div>

        <div className="aivy-room-lamp">
          <span className="aivy-room-lamp-wire" />
          <span className="aivy-room-lamp-bulb" />
        </div>

        <div className="aivy-room-sign">
          <span className="aivy-room-sign-post" />
          <span className="aivy-room-sign-board">UNDER<br />MAINTENANCE</span>
        </div>

        <AivyCharacter />

        <div className="aivy-room-radio">
          <span className="aivy-room-radio-speaker left" />
          <span className="aivy-room-radio-speaker right" />
          <button
            type="button"
            className="aivy-room-radio-btn"
            onClick={toggle}
            aria-label={playing ? "Matikan musik" : "Putar musik"}
          >
            {playing ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          {playing && (
            <span className="aivy-room-notes">
              <Music2 size={12} className="note n1" />
              <Music4 size={12} className="note n2" />
              <Music2 size={12} className="note n3" />
            </span>
          )}
        </div>

        <div className="aivy-room-floor" />
      </div>
    </div>
  );
}

export function MaintenancePage() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Sedang Pemeliharaan · Aivy";
    return () => { document.title = prevTitle; };
  }, []);

  return (
    <div className="aivy-maint">
      <AivyRoom />

      <div className="aivy-maint-panel">
        <div className="aivy-maint-panel-inner">
          <div className="aivy-maint-eyebrow">Pemeliharaan Sistem</div>
          <h1 className="aivy-maint-title">Under Maintenance</h1>
          <p className="aivy-maint-sub">
            Aivy sedang membenahi code backend. Nyalakan radio di ruangan untuk
            menemani menunggu.
          </p>

          <div
            className="aivy-maint-progress"
            role="progressbar"
            aria-valuenow={PROGRESS}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="aivy-maint-progress-track">
              <div className="aivy-maint-progress-fill" style={{ width: `${PROGRESS}%` }} />
            </div>
            <span className="aivy-maint-progress-pct">{PROGRESS}%</span>
          </div>

          <ul className="aivy-maint-tasks">
            {TASKS.map((task) => {
              const Icon = task.icon;
              return (
                <li key={task.label} className="aivy-maint-task">
                  <span className="aivy-maint-task-icon"><Icon size={16} /></span>
                  <span className="aivy-maint-task-label">{task.label}</span>
                </li>
              );
            })}
          </ul>

          <p className="aivy-maint-footer">Punya saran untuk Aivy? Kami siap mendengarkan.</p>
        </div>
      </div>
    </div>
  );
}