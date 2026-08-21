import React, { useEffect, useState } from "react";
import { Music4, RadioTower, LayoutGrid, Wrench } from "lucide-react";
import { LeafMark } from "../lib/brand.jsx";

const TASKS = [
  { icon: Music4, label: "Memperbaiki sistem player" },
  { icon: RadioTower, label: "Menulis ulang kode Listening Room" },
  { icon: LayoutGrid, label: "Mengoptimalkan tampilan UI" },
  { icon: Wrench, label: "fix bug lainnya" },
  { icon: Wrench, label: "menambah banyak fitur baru" },
];

function useFakeProgress() {
  const [pct, setPct] = useState(8);
  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => {
        if (p >= 92) return p;
        const step = p < 40 ? 3.2 : p < 70 ? 1.4 : 0.5;
        return Math.min(92, +(p + step).toFixed(1));
      });
    }, 220);
    return () => clearInterval(id);
  }, []);
  return pct;
}

export function MaintenancePage() {
  const pct = 25;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Sedang Pemeliharaan · Aivy";
    return () => { document.title = prevTitle; };
  }, []);

  return (
    <div className="aivy-maint">
      <div className="aivy-maint-card">
        <div className="aivy-maint-mark">
          <LeafMark size={36} color="var(--moss-strong)" />
        </div>

        <div className="aivy-maint-eyebrow">pemeliharaan sistem</div>

        <h1 className="aivy-maint-title">UNDER MAINTENANCE</h1>
        <p className="aivy-maint-sub">
          Tunggu hingga kami up kembali
        </p>

        <div className="aivy-maint-progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <div className="aivy-maint-progress-track">
            <div className="aivy-maint-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="aivy-maint-progress-pct">{Math.round(pct)}%</span>
        </div>

        <ul className="aivy-maint-tasks">
          {TASKS.map((task, i) => {
            const Icon = task.icon;
            return (
              <li key={task.label} className="aivy-maint-task" style={{ "--i": i }}>
                <span className="aivy-maint-task-icon"><Icon size={16} /></span>
                <span className="aivy-maint-task-label">{task.label}</span>
                <span className="aivy-maint-task-dot" />
              </li>
            );
          })}
        </ul>

        <p className="aivy-maint-footer">
          Berikan Saran Untuk Aivy.
        </p>
      </div>
    </div>
  );
}