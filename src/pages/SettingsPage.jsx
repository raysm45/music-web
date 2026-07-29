import React from "react";
import { Sun, Moon, Monitor, LogOut, RotateCcw } from "lucide-react";
import { useUI } from "../context.jsx";

function SettingSection({ title, children }) {
  return (
    <section className="aivy-settings-section">
      <h2 className="aivy-settings-title">{title}</h2>
      <div className="aivy-settings-group">{children}</div>
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <label className="aivy-settings-row">
      <div><div className="label">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <span className={`aivy-switch ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked} tabIndex={0}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); } }}>
        <span className="knob" />
      </span>
    </label>
  );
}

function SelectRow({ label, hint, value, options, onChange }) {
  return (
    <label className="aivy-settings-row">
      <div><div className="label">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <select className="aivy-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function SliderRow({ label, hint, value, min, max, step, onChange, format }) {
  return (
    <div className="aivy-settings-row">
      <div><div className="label">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="aivy-range" />
        <span className="font-mono" style={{ fontSize: 12, width: 42, textAlign: "right", color: "var(--ink-faint)" }}>{format ? format(value) : value}</span>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, authUser, logout, theme } = useUI();

  if (!authUser) {
    return <div className="aivy-empty" style={{ paddingTop: 80 }}><div className="title">Login dulu buat buka setting</div></div>;
  }

  const set = (key) => (val) => updateSettings({ [key]: val });

  return (
    <div className="aivy-view-enter aivy-settings-page">
      <div className="aivy-greet" style={{ paddingBottom: 6 }}><h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>Setting</h1></div>

      <SettingSection title="Tampilan">
        <SelectRow label="Tema" value={settings.theme} onChange={set("theme")} options={[{ value: "dark", label: "Gelap" }, { value: "light", label: "Terang" }]} />
        <ToggleRow label="Baris lebih rapat" hint="Bikin daftar lagu lebih padat" checked={settings.compactRows} onChange={set("compactRows")} />
        <ToggleRow label="Kurangi animasi" hint="Buat perangkat yang lebih lawas" checked={settings.reducedMotion} onChange={set("reducedMotion")} />
        <ToggleRow label="Kontras tinggi" checked={settings.highContrast} onChange={set("highContrast")} />
        <SelectRow label="Bahasa" value={settings.language} onChange={set("language")} options={[{ value: "id", label: "Indonesia" }, { value: "en", label: "English" }]} />
      </SettingSection>

      <SettingSection title="Audio & Pemutaran">
        <SelectRow label="Kualitas audio" value={settings.audioQuality} hint="Pratinjau: 30 detik resmi dari Deezer. Penuh: eksperimental lewat YouTube." onChange={set("audioQuality")}
          options={[{ value: "preview", label: "Pratinjau (disarankan)" }, { value: "full", label: "Penuh (eksperimental)" }]} />
        <ToggleRow label="Putar otomatis" hint="Lanjut ke lagu berikutnya otomatis" checked={settings.autoplay} onChange={set("autoplay")} />
        <ToggleRow label="Ratakan volume" hint="Samain kerasnya volume antar lagu" checked={settings.normalizeVolume} onChange={set("normalizeVolume")} />
        <SliderRow label="Volume awal" value={settings.volumeDefault} min={0} max={1} step={0.05} onChange={set("volumeDefault")} format={(v) => `${Math.round(v * 100)}%`} />
        <SliderRow label="Crossfade" hint="Detik transisi antar lagu" value={settings.crossfadeSeconds} min={0} max={12} step={1} onChange={set("crossfadeSeconds")} format={(v) => `${v}d`} />
        <ToggleRow label="Konten eksplisit" hint="Tampilkan lagu dengan label eksplisit" checked={settings.explicitContent} onChange={set("explicitContent")} />
      </SettingSection>

      <SettingSection title="Riwayat & Pencarian">
        <ToggleRow label="Simpan riwayat dengerin" checked={settings.historyEnabled} onChange={set("historyEnabled")} />
        <ToggleRow label="Simpan riwayat pencarian" hint="Dipakai buat saran pencarian pintar" checked={settings.searchHistoryEnabled} onChange={set("searchHistoryEnabled")} />
      </SettingSection>

      <SettingSection title="Ruang (dengerin bareng)">
        <ToggleRow label="Ruang publik secara default" hint="Waktu bikin ruang baru" checked={settings.roomVisibilityDefault === "public"} onChange={(v) => set("roomVisibilityDefault")(v ? "public" : "private")} />
        <ToggleRow label="Cuma host kontrol pemutaran (default)" checked={settings.hostOnlyControlDefault} onChange={set("hostOnlyControlDefault")} />
        <ToggleRow label="Auto-gabung audio waktu masuk ruang" checked={settings.autoJoinRoomAudio} onChange={set("autoJoinRoomAudio")} />
      </SettingSection>

      <SettingSection title="Notifikasi">
        <ToggleRow label="Undangan ke ruang" checked={settings.notifyRoomInvite} onChange={set("notifyRoomInvite")} />
        <ToggleRow label="Follower baru" checked={settings.notifyNewFollower} onChange={set("notifyNewFollower")} />
      </SettingSection>

      <SettingSection title="Akun">
        <div className="aivy-settings-row">
          <div><div className="label">Masuk sebagai</div><div className="hint">{authUser.username}</div></div>
          <button className="aivy-btn-ghost" onClick={logout}><LogOut size={14} /> Keluar</button>
        </div>
        <div className="aivy-settings-row">
          <div><div className="label">Reset semua setting</div><div className="hint">Balikin semua ke bawaan</div></div>
          <button className="aivy-btn-ghost" onClick={resetSettings}><RotateCcw size={14} /> Reset</button>
        </div>
      </SettingSection>
    </div>
  );
}
