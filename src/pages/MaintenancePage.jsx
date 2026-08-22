import React, { useEffect } from "react";
import { Music4, RadioTower, LayoutGrid, Wrench, Sparkles } from "lucide-react";
import { LeafMark } from "../lib/brand.jsx";

const PROGRESS = 12;

const TASKS = [
  { icon: Music4, label: "Perbaikan sistem player yang lebih optimal" },
  { icon: RadioTower, label: "Penulisan ulang kode Listening Room" },
  { icon: LayoutGrid, label: "Optimasi tampilan UI" },
  { icon: Wrench, label: "Perbaikan bug lainnya" },
  { icon: Sparkles, label: "Penambahan fitur baru" },
];

export function MaintenancePage() {
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

        <div className="aivy-maint-eyebrow">Pemeliharaan Sistem</div>

        <h1 className="aivy-maint-title">Under Maintenance</h1>
        <p className="aivy-maint-sub">
          Mohon tunggu, kami sedang melakukan pembaruan sistem.
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

        <p className="aivy-maint-footer">Punya saran untuk Aivy?</p>
      </div>
    </div>
  );
}