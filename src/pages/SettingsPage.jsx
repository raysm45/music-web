import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Palette, LayoutPanelLeft, AudioLines, Speaker, Download, Server, Cog,
  LogOut, RotateCcw, SlidersHorizontal, Plus, Trash2, ArrowUp, ArrowDown,
  RefreshCw, Pencil, Check, FileUp, FileDown, Ban,
} from "lucide-react";
import { useUI, usePlayer, EQ_BANDS_HZ, EQ_PRESETS } from "../context.jsx";
import { Api } from "../lib/api.js";
import { CustomSelect } from "../components.jsx";

const SHORTCUTS_KEY = "aivy_shortcut_overrides";
const FOLDER_KEY = "aivy_last_download_folder";

const THEME_SWATCHES = {
  system: ["#171a12", "#8ca37c", "#ece8d9"],
  black: ["#000000", "#8ca37c", "#f2f2f0"],
  white: ["#ffffff", "#4c6b41", "#141414"],
  dark: ["#12140f", "#8ca37c", "#ece8d9"],
  ocean: ["#0b1220", "#4fa3e3", "#dfe9f5"],
  purple: ["#13101e", "#a78bfa", "#eae4f6"],
  forest: ["#0e1510", "#63b46a", "#e2ecdf"],
  mocha: ["#1e1e2e", "#b4befe", "#cdd6f4"],
  macchiato: ["#24273a", "#b7bdf8", "#cad3f5"],
  frappe: ["#303446", "#ca9ee6", "#c6d0f5"],
  latte: ["#eff1f5", "#7287fd", "#4c4f69"],
};

const FONT_OPTIONS = [
  { value: "default", label: "Plus Jakarta (Default)" },
  { value: "inter", label: "Inter" },
  { value: "applemusic", label: "Apple Music" },
  { value: "plexmono", label: "IBM Plex Mono" },
  { value: "roboto", label: "Roboto" },
  { value: "opensans", label: "Open Sans" },
  { value: "lato", label: "Lato" },
  { value: "montserrat", label: "Montserrat" },
  { value: "poppins", label: "Poppins" },
  { value: "systemui", label: "System UI" },
  { value: "mono", label: "Monospace" },
];

const QUALITY_OPTIONS = [
  { value: "auto", label: "Auto (Adaptif)" },
  { value: "eac3_high", label: "Dolby Atmos — E-AC-3 High" },
  { value: "eac3_low", label: "Dolby Atmos — E-AC-3 Low" },
  { value: "ac4_high", label: "Dolby Atmos — AC-4 High" },
  { value: "ac4_low", label: "Dolby Atmos — AC-4 Low" },
  { value: "hires", label: "Hi-Res Lossless (24-bit)" },
  { value: "lossless", label: "Lossless (16-bit)" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
];

const VISUALIZER_STYLES = [
  { value: "lcd", label: "LCD" },
  { value: "pixels", label: "Pixels" },
  { value: "particles", label: "Particles" },
  { value: "unknown", label: "Unknown Pleasures" },
  { value: "butterchurn", label: "Butterchurn (Milkdrop)" },
  { value: "kawarp", label: "Kawarp" },
];

const VISUALIZER_PRESETS = [
  { value: "auto", label: "Otomatis" },
  { value: "ocean", label: "Ocean Surface" },
  { value: "martian", label: "Martian" },
  { value: "sunset", label: "Sunset" },
  { value: "kaleido", label: "Kaleidoscope" },
  { value: "matrix", label: "Matrix" },
];

const DEFAULT_SHORTCUTS = [
  { id: "togglePlay", combo: ["Space"], id_: "Putar / Jeda", en_: "Play / Pause" },
  { id: "seekFwd10", combo: ["→"], id_: "Maju 10 detik", en_: "Seek forward 10s" },
  { id: "seekBack10", combo: ["←"], id_: "Mundur 10 detik", en_: "Seek backward 10s" },
  { id: "nextTrack", combo: ["Shift", "→"], id_: "Lagu berikutnya", en_: "Next track" },
  { id: "prevTrack", combo: ["Shift", "←"], id_: "Lagu sebelumnya", en_: "Previous track" },
  { id: "volUp", combo: ["↑"], id_: "Volume naik", en_: "Volume up" },
  { id: "volDown", combo: ["↓"], id_: "Volume turun", en_: "Volume down" },
  { id: "mute", combo: ["M"], id_: "Bisukan", en_: "Mute" },
  { id: "shuffle", combo: ["S"], id_: "Acak", en_: "Shuffle" },
  { id: "repeat", combo: ["R"], id_: "Ulangi", en_: "Repeat" },
  { id: "queue", combo: ["Q"], id_: "Buka antrean", en_: "Open queue" },
  { id: "lyrics", combo: ["L"], id_: "Lirik", en_: "Lyrics" },
  { id: "focusSearch", combo: ["/"], id_: "Fokus pencarian", en_: "Focus search" },
];

function loadShortcutOverrides() {
  try { return JSON.parse(localStorage.getItem(SHORTCUTS_KEY)) || {}; } catch { return {}; }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

function SettingSection({ title, children, desc }) {
  return (
    <section className="aivy-settings-section">
      <h2 className="aivy-settings-title">{title}</h2>
      {desc && <p className="aivy-settings-desc">{desc}</p>}
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
      <CustomSelect className="aivy-settings-select" value={value} options={options} onChange={onChange} />
    </label>
  );
}

function SliderRow({ label, hint, value, min, max, step, onChange, format }) {
  return (
    <div className="aivy-settings-row">
      <div><div className="label">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="aivy-range" />
        <span className="font-mono" style={{ fontSize: 12, width: 52, textAlign: "right", color: "var(--ink-faint)" }}>{format ? format(value) : value}</span>
      </div>
    </div>
  );
}

function TextRow({ label, hint, value, onChange, type = "text", placeholder, mono }) {
  return (
    <div className="aivy-settings-row">
      <div><div className="label">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <input
        className={`aivy-settings-input ${mono ? "mono" : ""}`}
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function ActionRow({ label, hint, tone = "ghost", buttonText, onAction, disabled, icon: Icon }) {
  const cls = tone === "danger" ? "aivy-btn-danger" : "aivy-btn-ghost";
  return (
    <div className="aivy-settings-row">
      <div><div className="label">{label}</div>{hint && <div className="hint">{hint}</div>}</div>
      <button className={`${cls} sm`} disabled={disabled} onClick={onAction}>{Icon ? <Icon size={14} /> : null}{buttonText}</button>
    </div>
  );
}

function matchPreset(bands) {
  const entries = Object.entries(EQ_PRESETS);
  for (const [key, vals] of entries) {
    if (vals.every((v, i) => v === (bands?.[i] ?? 0))) return key;
  }
  return "custom";
}

function EqualizerPanel({ eq, onChange, tt }) {
  const bands = eq.bands || EQ_PRESETS.flat;
  const setBand = (i, v) => {
    const next = [...bands];
    next[i] = v;
    onChange({ ...eq, bands: next, preset: matchPreset(next) });
  };
  const setPreset = (key) => {
    if (key === "custom") { onChange({ ...eq, preset: "custom" }); return; }
    onChange({ ...eq, preset: key, bands: [...(EQ_PRESETS[key] || EQ_PRESETS.flat)] });
  };
  const presetOptions = [
    { value: "flat", label: "Flat" },
    { value: "bass", label: "Bass Boost" },
    { value: "treble", label: "Treble Boost" },
    { value: "vocal", label: tt("Vokal", "Vocal") },
    { value: "electronic", label: tt("Elektronik", "Electronic") },
    { value: "custom", label: "Custom" },
  ];
  const freqLabel = (hz) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

  return (
    <>
      <ToggleRow label={tt("Aktifkan equalizer", "Enable equalizer")} hint={tt("Sesuaikan karakter suara pemutaran", "Fine-tune playback sound")} checked={eq.enabled} onChange={(v) => onChange({ ...eq, enabled: v })} />
      <SelectRow label="Preset" value={eq.preset || matchPreset(bands)} onChange={setPreset} options={presetOptions} />
      <SliderRow label="Preamp" value={eq.preamp || 0} min={-12} max={12} step={1}
        onChange={(v) => onChange({ ...eq, preamp: v })} format={(v) => `${v > 0 ? "+" : ""}${v}dB`} />
      <div className="aivy-settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, opacity: eq.enabled ? 1 : 0.45 }}>
        <div className="label">{tt("Band frekuensi", "Frequency bands")}</div>
        <div className="aivy-eq-bands">
          {EQ_BANDS_HZ.map((hz, i) => (
            <div className="aivy-eq-band" key={hz}>
              <span className="aivy-eq-val font-mono">{(bands[i] ?? 0) > 0 ? "+" : ""}{bands[i] ?? 0}</span>
              <input
                type="range" className="aivy-eq-slider" min={-12} max={12} step={1}
                value={bands[i] ?? 0} disabled={!eq.enabled}
                onChange={(e) => setBand(i, Number(e.target.value))}
                aria-label={`${freqLabel(hz)}Hz`}
                orient="vertical"
              />
              <span className="aivy-eq-freq font-mono">{freqLabel(hz)}</span>
            </div>
          ))}
        </div>
      </div>
      <ActionRow label={tt("Reset equalizer", "Reset equalizer")} buttonText={tt("Reset", "Reset")} icon={RotateCcw}
        onAction={() => onChange({ enabled: eq.enabled, preset: "flat", preamp: 0, bands: [...EQ_PRESETS.flat] })} />
    </>
  );
}

function ShortcutRow({ shortcut, override, capturing, onStartCapture, onSave, onClear, tt }) {
  const combo = override || shortcut.combo.join("+");
  useEffect(() => {
    if (!capturing) return undefined;
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") { onStartCapture(null); return; }
      const parts = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Meta");
      let k = e.key;
      if (k === " ") k = "Space";
      else if (k.length === 1) k = k.toUpperCase();
      if (!["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
        parts.push(k);
        onSave(shortcut.id, parts.join("+"));
        onStartCapture(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing, shortcut.id, onSave, onStartCapture]);

  return (
    <div className="aivy-settings-row">
      <div className="label">{tt(shortcut.id_, shortcut.en_)}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {capturing ? (
          <span className="aivy-capture-tip">{tt("Tekan kombinasi tombol… (Esc batal)", "Press a key combination… (Esc to cancel)")}</span>
        ) : (
          <span className="aivy-shortcut-keys">
            {combo.split("+").map((part, i) => <kbd className="aivy-kbd" key={i}>{part}</kbd>)}
          </span>
        )}
        <button className="aivy-icon-btn bare" title={tt("Ubah", "Rebind")} aria-label={tt("Ubah shortcut", "Rebind shortcut")} onClick={() => onStartCapture(capturing ? null : shortcut.id)}>
          {capturing ? <Check size={14} /> : <Pencil size={13} />}
        </button>
        {override && (
          <button className="aivy-icon-btn bare" title={tt("Kembalikan default", "Reset to default")} onClick={() => onClear(shortcut.id)}>
            <RotateCcw size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, authUser, logout, loggingOut, pushToast, t } = useUI();
  const player = usePlayer();
  const [tab, setTab] = useState("appearance");
  const [capturingShortcut, setCapturingShortcut] = useState(null);
  const [shortcutOverrides, setShortcutOverrides] = useState(loadShortcutOverrides);
  const fileInputRef = useRef(null);
  const importModeRef = useRef("backup");

  const tt = useMemo(() => {
    const en = settings.language === "en";
    return (idText, enText) => (en ? enText : idText);
  }, [settings.language]);

  const set = (key) => (val) => updateSettings({ [key]: val });

  const tabs = [
    { id: "appearance", label: tt("Tampilan", "Appearance"), icon: Palette },
    { id: "interface", label: tt("Antarmuka", "Interface"), icon: LayoutPanelLeft },
    { id: "scrobble", label: "Scrobbling", icon: AudioLines },
    { id: "audio", label: "Audio", icon: Speaker },
    { id: "downloads", label: tt("Unduhan", "Downloads"), icon: Download },
    { id: "instances", label: "Instance", icon: Server },
    { id: "system", label: tt("Sistem", "System"), icon: Cog },
  ];

  if (!authUser) {
    return <div className="aivy-empty" style={{ paddingTop: 80 }}><div className="title">{t("loginForSettings")}</div></div>;
  }

  const eq = settings.equalizer || { enabled: false, preset: "flat", preamp: 0, bands: [...EQ_PRESETS.flat] };
  const blocked = settings.blockedContent || {};
  const instances = settings.apiInstances || [];

  const saveShortcutOverride = (id, combo) => {
    const next = { ...shortcutOverrides, [id]: combo };
    setShortcutOverrides(next);
    try { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next)); } catch {}
  };
  const clearShortcutOverride = (id) => {
    const next = { ...shortcutOverrides };
    delete next[id];
    setShortcutOverrides(next);
    try { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next)); } catch {}
  };
  const resetAllShortcuts = () => {
    setShortcutOverrides({});
    try { localStorage.removeItem(SHORTCUTS_KEY); } catch {}
  };

  const openImport = (mode) => {
    importModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (importModeRef.current === "settings") {
        if (!json || typeof json !== "object") throw new Error("bad");
        updateSettings(json);
        pushToast(tt("Setting diimpor", "Settings imported"));
      } else {
        const patch = {};
        if (json.settings && typeof json.settings === "object") Object.assign(patch, json.settings);
        if (json.theme) patch.theme = json.theme;
        updateSettings(patch);
        pushToast(tt("Backup dipulihkan (setting diterapkan)", "Backup restored (settings applied)"));
      }
    } catch {
      pushToast(tt("File backup tidak valid", "Invalid backup file"));
    }
  };

  const exportBackup = () => {
    downloadJson(`aivy-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      app: "aivy",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      playlists: player?.playlists || [],
      liked: player?.liked || [],
      history: Array.isArray(player?.history) ? player.history.slice(0, 200) : [],
    });
    pushToast(tt("Backup diekspor", "Backup exported"));
  };
  const exportAllSettings = () => {
    downloadJson(`aivy-settings-${new Date().toISOString().slice(0, 10)}.json`, settings);
    pushToast(tt("Semua setting diekspor", "All settings exported"));
  };

  const clearCache = () => {
    let n = 0;
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("aivy_cache")) keys.push(k);
      }
      keys.forEach((k) => { localStorage.removeItem(k); n++; });
    } catch {}
    pushToast(n ? tt(`Cache dibersihkan (${n})`, `Cache cleared (${n})`) : tt("Cache sudah bersih", "Cache already clean"));
  };

  const resetLocalData = () => {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("aivy_")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {}
    pushToast(tt("Data lokal dihapus, memuat ulang…", "Local data cleared, reloading…"));
    setTimeout(() => window.location.reload(), 900);
  };

  const clearCloudData = async () => {
    try { await Api.resetSettings(); pushToast(tt("Data awan dibersihkan", "Cloud data cleared")); }
    catch { pushToast(tt("Gagal membersihkan data awan", "Failed to clear cloud data")); }
  };

  const resetSavedFolder = () => {
    try { localStorage.removeItem(FOLDER_KEY); } catch {}
    pushToast(tt("Folder tersimpan di-reset", "Saved folder reset"));
  };

  const addInstance = () => {
    updateSettings({ apiInstances: [...instances, { id: `inst_${Date.now()}`, url: "" }] });
  };
  const updateInstance = (id, url) => {
    updateSettings({ apiInstances: instances.map((it) => (it.id === id ? { ...it, url } : it)) });
  };
  const removeInstance = (id) => {
    updateSettings({ apiInstances: instances.filter((it) => it.id !== id) });
  };
  const moveInstance = (idx, dir) => {
    const next = [...instances];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    updateSettings({ apiInstances: next });
  };

  const clearBlocked = () => {
    updateSettings({ blockedContent: { artists: [], albums: [], tracks: [] } });
    pushToast(tt("Daftar blokir dibersihkan", "Blocked list cleared"));
  };

  const applyCommunityTheme = (css) => {
    updateSettings({ theme: "custom", customThemeCss: css });
  };
  const unapplyCommunityTheme = () => {
    updateSettings({ theme: "dark", customThemeCss: "" });
  };

  const communityThemes = [
    {
      id: "nord", name: "Nordic",
      css: ":root{--bg:#2E3440;--bg-elev:#3B4252;--bg-elev-2:#434C5E;--bg-elev-3:#4C566A;--line:#4C566A;--line-soft:#3B4252;--ink:#ECEFF4;--ink-dim:#D8DEE9;--ink-faint:#7B88A1;--moss:#88C0D0;--moss-strong:#8FBCBB;--moss-ink:#2E3440;}",
    },
    {
      id: "rosepine", name: "Rosé Pine",
      css: ":root{--bg:#191724;--bg-elev:#1F1D2E;--bg-elev-2:#26233A;--bg-elev-3:#302C46;--line:#403D52;--line-soft:#26233A;--ink:#E0DEF4;--ink-dim:#908CAA;--ink-faint:#6E6A86;--moss:#C4A7E7;--moss-strong:#DFCCF3;--moss-ink:#191724;}",
    },
    {
      id: "gruvbox", name: "Gruvbox",
      css: ":root{--bg:#282828;--bg-elev:#32302F;--bg-elev-2:#3C3836;--bg-elev-3:#504945;--line:#504945;--line-soft:#3C3836;--ink:#FBF1C7;--ink-dim:#BDAE93;--ink-faint:#7C6F64;--moss:#D8A657;--moss-strong:#E3B76E;--moss-ink:#282828;}",
    },
  ];

  const renderAppearance = () => (
    <>
      <SettingSection title={tt("Tema", "Theme")}>
        <div className="aivy-themes-grid">
          {[
            ["system", tt("Sistem", "System")],
            ["black", "Black"],
            ["white", "White"],
            ["dark", tt("Gelap", "Dark")],
            ["ocean", "Ocean"],
            ["purple", "Purple"],
            ["forest", "Forest"],
            ["mocha", "Mocha"],
            ["macchiato", "Macchiato"],
            ["frappe", "Frappé"],
            ["latte", "Latte"],
            ["custom", tt("Kustom", "Custom")],
          ].map(([value, label]) => (
            <button key={value} className={`aivy-theme-card ${settings.theme === value ? "active" : ""}`} onClick={() => set("theme")(value)}>
              <span className="aivy-theme-swatch">
                {(THEME_SWATCHES[value] || ["var(--bg)", "var(--moss)", "var(--ink)"]).map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="aivy-theme-card-name">
                {label}
                {settings.theme === value && <Check size={14} className="aivy-theme-check" />}
              </span>
            </button>
          ))}
        </div>
        {settings.theme === "custom" && (
          <div className="aivy-settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div>
              <div className="label">{tt("Tema Kustom (CSS)", "Custom Theme (CSS)")}</div>
              <div className="hint">{tt("Definisikan variabel CSS atau gaya kustom di sini.", "Define your CSS variables or custom styles here.")}</div>
            </div>
            <textarea
              className="aivy-settings-textarea"
              value={settings.customThemeCss || ""}
              placeholder={':root {\n  --bg: #101010;\n  --moss: #7fd18c;\n}'}
              onChange={(e) => set("customThemeCss")(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}
      </SettingSection>

      <SettingSection title={tt("Tema Komunitas", "Community Themes")} desc={tt("Terapkan tema buatan komunitas yang sudah tersedia.", "Apply built-in community-made themes.")}>
        <div className="aivy-settings-row">
          <div><div className="label">{tt("Terpasang", "Applied")}</div><div className="hint">{settings.customThemeCss ? tt("Tema komunitas aktif lewat tema Kustom", "Active via the Custom theme") : tt("Belum ada tema komunitas yang diterapkan", "No community theme applied")}</div></div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {communityThemes.map((th) => (
              <button key={th.id} className="aivy-btn-ghost sm" onClick={() => applyCommunityTheme(th.css)}>{th.name}</button>
            ))}
            {settings.customThemeCss && (
              <button className="aivy-btn-danger sm" onClick={unapplyCommunityTheme}>{tt("Lepas Tema", "Unapply Theme")}</button>
            )}
          </div>
        </div>
      </SettingSection>

      <SettingSection title={tt("Font", "Font")}>
        <SelectRow
          label={tt("Jenis font", "Font")}
          value={settings.fontFamily || "default"}
          onChange={set("fontFamily")}
          options={FONT_OPTIONS}
        />
        <TextRow
          label={tt("Font dari URL", "Font from URL")}
          hint={tt("Masukkan URL file font (.woff2/.ttf/.otf) untuk dipakai di seluruh aplikasi.", "Paste a font file URL (.woff2/.ttf/.otf) to use it app-wide.")}
          mono
          value={settings.fontUrl || ""}
          onChange={(v) => set("fontUrl")(v.trim())}
          placeholder="https://…/MyFont.woff2"
        />
        <SliderRow
          label={tt("Ukuran font", "Font size")}
          value={Number(settings.fontScale) || 100}
          min={50} max={200} step={5}
          onChange={set("fontScale")}
          format={(v) => `${v}%`}
        />
        <ActionRow
          label={tt("Reset font", "Reset font")}
          buttonText={tt("Reset", "Reset")}
          icon={RotateCcw}
          onAction={() => updateSettings({ fontFamily: "default", fontUrl: "", fontScale: 100 })}
        />
      </SettingSection>

      <SettingSection title={tt("Tampilan Pemutar", "Player Look")}>
        <ToggleRow label={tt("Seekbar waveform", "Waveform Seekbar")} hint={tt("Tampilkan bentuk gelombang di progress bar (eksperimental)", "Show a waveform of the track in the progress bar (Experimental)")} checked={!!settings.waveformSeekbar} onChange={set("waveformSeekbar")} />
        <ToggleRow label={tt("Background sampul album", "Album Cover Background")} hint={tt("Pakai sampul sebagai background blur dan warna utama", "Use the album cover as blurred background and primary color")} checked={!!settings.coverBackground} onChange={set("coverBackground")} />
        <ToggleRow label={tt("Warna dinamis", "Dynamic Colors")} hint={tt("Warna aksen berubah mengikuti sampul lagu yang diputar", "Accent color follows the playing track's album art")} checked={!!settings.dynamicColors} onChange={set("dynamicColors")} />
        <ToggleRow label={tt("Sampul tanpa sudut bulat", "No Round Album Cover")} checked={!!settings.noRoundCover} onChange={set("noRoundCover")} />
        <ToggleRow label={tt("Efek tilt 3D pada sampul", "Vanilla Tilt Album Cover")} hint={tt("Efek kemiringan 3D di layar penuh", "3D tilt effect on the fullscreen cover")} checked={!!settings.tiltCover} onChange={set("tiltCover")} />
        <SliderRow label={tt("Jarak tilt", "Tilt Distance")} hint={tt("Maksimum kemiringan (default 10)", "Max tilt distance (default: 10)")} value={Number(settings.tiltDistance) || 10} min={1} max={30} step={1} onChange={set("tiltDistance")} />
        <SliderRow label={tt("Kecepatan tilt", "Tilt Speed")} hint="ms" value={Number(settings.tiltSpeed) || 240} min={50} max={600} step={10} onChange={set("tiltSpeed")} format={(v) => `${v}`} />
        <ToggleRow label={tt("Sampul CD berputar", "CD Album Cover")} hint={tt("Sampul berputar seperti CD di layar penuh", "Spin the cover like a CD in fullscreen")} checked={!!settings.cdCoverSpin} onChange={set("cdCoverSpin")} />
      </SettingSection>

      <SettingSection title="Visualizer">
        <ToggleRow label={tt("Visualizer layar penuh", "Full-screen Visualizer")} checked={!!settings.visualizerEnabled} onChange={set("visualizerEnabled")} />
        <SelectRow label={tt("Gaya visualizer", "Visualizer Style")} value={settings.visualizerStyle || "butterchurn"} onChange={set("visualizerStyle")} options={VISUALIZER_STYLES} />
        <SelectRow label={tt("Mode visualizer", "Visualizer Mode")} value={settings.visualizerMode || "solid"} onChange={set("visualizerMode")}
          options={[{ value: "solid", label: tt("Background solid", "Solid Background") }, { value: "blended", label: tt("Menyatu dengan sampul", "Blended on Cover Art") }]} />
        <ToggleRow label={tt("Pergantian intensitas pintar", "Smart Intensity Switching")} hint={tt("Intensitas menyesuaikan energi lagu", "Adjust intensity based on song energy")} checked={!!settings.smartIntensity} onChange={set("smartIntensity")} />
        <SliderRow label={tt("Sensitivitas visualizer", "Visualizer Sensitivity")} hint={tt("Hati-hati: sensitivitas tinggi bisa memicu fotosensitif", "Warning: high sensitivity may cause flashing lights")} value={Number(settings.visualizerSensitivity) || 60} min={10} max={200} step={5} onChange={set("visualizerSensitivity")} format={(v) => `${v}%`} />
        <SliderRow label={tt("Kecerahan visualizer", "Visualizer Brightness")} value={Number(settings.visualizerBrightness) || 100} min={20} max={200} step={5} onChange={set("visualizerBrightness")} format={(v) => `${v}%`} />
        <ToggleRow label={tt("Ganti preset otomatis", "Cycle Presets")} checked={!!settings.cyclePresets} onChange={set("cyclePresets")} />
        <SelectRow label={tt("Preset saat ini", "Current Preset")} value={settings.visualizerPreset || "auto"} onChange={set("visualizerPreset")} options={VISUALIZER_PRESETS} />
        <SliderRow label={tt("Durasi siklus", "Cycle Duration")} hint={tt("Detik antar pergantian preset", "Seconds between preset changes")} value={Number(settings.cycleDuration) || 30} min={5} max={120} step={5} onChange={set("cycleDuration")} format={(v) => `${v}s`} />
        <ToggleRow label={tt("Acak preset", "Randomize Presets")} hint={tt("Preset berikutnya dipilih acak", "Pick the next preset randomly")} checked={!!settings.randomizePresets} onChange={set("randomizePresets")} />
      </SettingSection>

      <SettingSection title={tt("Bagian Beranda", "Home Sections")}>
        <ToggleRow label={tt("Tampilkan lagu rekomendasi", "Show Recommended Songs")} checked={settings.showRecommendedSongs !== false} onChange={set("showRecommendedSongs")} />
        <ToggleRow label={tt("Tampilkan album rekomendasi", "Show Recommended Albums")} checked={settings.showRecommendedAlbums !== false} onChange={set("showRecommendedAlbums")} />
        <ToggleRow label={tt("Tampilkan artist rekomendasi", "Show Recommended Artists")} checked={settings.showRecommendedArtists !== false} onChange={set("showRecommendedArtists")} />
        <ToggleRow label={tt("Tampilkan Lanjutkan Dengerin", "Show Jump Back In")} checked={settings.showJumpBackIn !== false} onChange={set("showJumpBackIn")} />
        <ToggleRow label={tt("Tampilkan Pilihan Editor", "Show Editor's Picks")} checked={!!settings.showEditorsPicks} onChange={set("showEditorsPicks")} />
        <ToggleRow label={tt("Acak urutan Pilihan Editor", "Shuffle Editor's Picks")} checked={!!settings.shuffleEditorsPicks} onChange={set("shuffleEditorsPicks")} />
        <SelectRow label={tt("Sumber Pilihan Editor", "Editor's Picks Source")} value={settings.editorsPicksSource || "current"} onChange={set("editorsPicksSource")}
          options={[{ value: "current", label: tt("Utama", "Current") }, { value: "alt", label: tt("Alternatif", "Alternative") }]} />
      </SettingSection>
    </>
  );

  const renderInterface = () => (
    <>
      <SettingSection title={tt("Tata Letak", "Layout")}>
        <ToggleRow label={tt("Artist ringkas", "Compact Artists")} hint={tt("Kartu artist lebih padat & horizontal", "Artist cards in a compact, horizontal layout")} checked={!!settings.compactArtists} onChange={set("compactArtists")} />
        <ToggleRow label={tt("Banner artist", "Artist Banners")} hint={tt("Banner video di halaman artist", "Video banners on artist pages")} checked={!!settings.artistBanners} onChange={set("artistBanners")} />
        <ToggleRow label={tt("Album ringkas", "Compact Albums")} checked={!!settings.compactAlbums} onChange={set("compactAlbums")} />
        <ToggleRow label={tt("Baris lebih rapat", "Denser rows")} hint={tt("Bikin daftar lagu lebih padat", "Make song lists more compact")} checked={!!settings.compactRows} onChange={set("compactRows")} />
      </SettingSection>

      <SettingSection title={tt("Navigasi Samping — Atas", "Sidebar Top Section")}>
        <ToggleRow label={t("navHome")} checked={settings.showNavHome !== false} onChange={set("showNavHome")} />
        <ToggleRow label={t("navSearch")} checked={settings.showNavSearch !== false} onChange={set("showNavSearch")} />
        <ToggleRow label={t("navLibrary")} checked={settings.showNavLibrary !== false} onChange={set("showNavLibrary")} />
        <ToggleRow label={t("navRooms")} checked={settings.showNavRooms !== false} onChange={set("showNavRooms")} />
        <ToggleRow label={t("navShorts")} checked={settings.showNavShorts !== false} onChange={set("showNavShorts")} />
      </SettingSection>

      <SettingSection title={tt("Navigasi Samping — Bawah", "Sidebar Bottom Section")}>
        <ToggleRow label={tt("Tautan Tentang", "About link")} checked={!!settings.showSideAbout} onChange={set("showSideAbout")} />
        <ToggleRow label="Discord" checked={!!settings.showSideDiscord} onChange={set("showSideDiscord")} />
        <ToggleRow label="GitHub" checked={!!settings.showSideGithub} onChange={set("showSideGithub")} />
        <ToggleRow label={tt("Pengingat donasi", "Donation Reminders")} hint={tt("Kadang muncul notifikasi ajakan dukung Aivy", "Occasionally show a notification inviting you to support Aivy")} checked={!!settings.donationReminders} onChange={set("donationReminders")} />
      </SettingSection>

      <SettingSection title={tt("Perilaku Navigasi", "Navigation Behavior")}>
        <ToggleRow label={tt("Tutup modal saat pindah halaman", "Close Modals on Navigation")} hint={tt("Panel terbuka (lirik, antrean) ditutup saat navigasi", "Open modals/panels close when navigating")} checked={!!settings.closeModalsOnNavigation} onChange={set("closeModalsOnNavigation")} />
        <ToggleRow label={tt("Tombol back tutup modal dulu", "Intercept Back to Close Modals")} hint={tt("Tekan back: modal ditutup dulu, tekan lagi baru pindah halaman", "Pressing back closes modals first without navigating")} checked={!!settings.interceptBackToCloseModals} onChange={set("interceptBackToCloseModals")} />
      </SettingSection>

      <SettingSection title={tt("Layar Penuh & Now Playing", "Fullscreen & Now Playing")}>
        <SelectRow label={tt("Tampilan klik sampul mini", "Now Playing View Mode")} hint={tt("Yang muncul saat sampul kecil diklik", "What appears when clicking the small album art")}
          value={settings.nowPlayingView || "album"} onChange={set("nowPlayingView")}
          options={[
            { value: "album", label: tt("Ke halaman album", "Go to Album") },
            { value: "fullscreen", label: tt("Mode layar penuh", "Fullscreen Mode") },
            { value: "lyrics", label: tt("Panel lirik", "Lyrics Panel") },
          ]} />
        <SelectRow label={tt("Aksi klik sampul layar penuh", "Fullscreen Cover Click Action")}
          value={settings.fullscreenCoverClick || "exit"} onChange={set("fullscreenCoverClick")}
          options={[
            { value: "exit", label: tt("Keluar layar penuh", "Exit fullscreen mode") },
            { value: "hide", label: tt("Sembunyikan UI", "Hide UI") },
            { value: "pause", label: tt("Jeda / lanjut", "Pause/resume track") },
            { value: "next", label: tt("Skip lagu", "Skip song") },
            { value: "prev", label: tt("Lagu sebelumnya", "Previous song") },
            { value: "none", label: tt("Tidak melakukan apa pun", "Do nothing") },
          ]} />
      </SettingSection>
    </>
  );

  const renderScrobble = () => (
    <>
      <SettingSection title={tt("Umum", "General")}>
        <SliderRow label={tt("Ambang scrobble", "Scrobble Threshold")} hint={tt("Persentase lagu yang harus diputar sebelum di-scrobble", "Percentage of track to play before scrobbling")} value={Number(settings.scrobbleThreshold) || 50} min={1} max={100} step={1} onChange={set("scrobbleThreshold")} format={(v) => `${v}%`} />
      </SettingSection>

      <SettingSection title="Last.fm" desc={tt("Aktivitas terbaru dan statistik top tampil di profilmu.", "Recent activity and top stats appear on your profile.")}>
        <ToggleRow label={tt("Aktifkan scrobbling", "Enable Scrobbling")} checked={!!settings.lastfmEnabled} onChange={set("lastfmEnabled")} />
        <TextRow label={tt("Nama pengguna", "Username")} value={settings.lastfmUser || ""} onChange={set("lastfmUser")} placeholder="username" />
        <TextRow label={tt("Kata sandi", "Password")} type="password" value={settings.lastfmPass || ""} onChange={set("lastfmPass")} placeholder="••••••••" />
        <ToggleRow label={tt("'Love' saat disukai", "Love on Like")} hint={tt("Otomatis 'love' di Last.fm saat kamu suka lagu", "Automatically 'love' tracks on Last.fm when you like them")} checked={!!settings.lastfmLoveOnLike} onChange={set("lastfmLoveOnLike")} />
        <ToggleRow label={tt("Pakai kredensial API sendiri", "Use Custom API Credentials")} checked={!!settings.lastfmCustomApi} onChange={set("lastfmCustomApi")} />
        {settings.lastfmCustomApi && (
          <>
            <TextRow label="API Key" mono value={settings.lastfmApiKey || ""} onChange={set("lastfmApiKey")} />
            <TextRow label="API Secret" type="password" mono value={settings.lastfmApiSecret || ""} onChange={set("lastfmApiSecret")} />
          </>
        )}
      </SettingSection>

      <SettingSection title="Libre.fm">
        <ToggleRow label={tt("Aktifkan scrobbling", "Enable Scrobbling")} checked={!!settings.librefmEnabled} onChange={set("librefmEnabled")} />
        <TextRow label={tt("Nama pengguna", "Username")} value={settings.librefmUser || ""} onChange={set("librefmUser")} />
        <TextRow label={tt("Kata sandi", "Password")} type="password" value={settings.librefmPass || ""} onChange={set("librefmPass")} />
        <ToggleRow label={tt("'Love' saat disukai", "Love on Like")} checked={!!settings.librefmLoveOnLike} onChange={set("librefmLoveOnLike")} />
      </SettingSection>

      <SettingSection title="ListenBrainz" desc={tt("Butuh User Token dari halaman profil ListenBrainz.", "Requires the User Token found on your ListenBrainz profile page.")}>
        <ToggleRow label={tt("Aktifkan scrobbling", "Enable Scrobbling")} checked={!!settings.listenbrainzEnabled} onChange={set("listenbrainzEnabled")} />
        <TextRow label="User Token" type="password" mono value={settings.listenbrainzToken || ""} onChange={set("listenbrainzToken")} />
        <TextRow label="API URL" hint={tt("Opsional — kosongkan untuk server resmi", "Optional — leave empty for the official server")} mono value={settings.listenbrainzUrl || ""} onChange={set("listenbrainzUrl")} placeholder="https://api.listenbrainz.org" />
        <ToggleRow label={tt("'Love' saat disukai", "Love on Like")} checked={!!settings.listenbrainzLoveOnLike} onChange={set("listenbrainzLoveOnLike")} />
      </SettingSection>

      <SettingSection title="Maloja" desc={tt("Kirim scrobble ke server Maloja milikmu sendiri.", "Submit listens to your self-hosted Maloja server.")}>
        <ToggleRow label={tt("Aktifkan scrobbling", "Enable Scrobbling")} checked={!!settings.malojaEnabled} onChange={set("malojaEnabled")} />
        <TextRow label="API Key" hint={tt("Ada di pengaturan Malojamu", "Found in your Maloja settings")} type="password" mono value={settings.malojaKey || ""} onChange={set("malojaKey")} />
        <TextRow label={tt("URL Server", "Server URL")} mono value={settings.malojaUrl || ""} onChange={set("malojaUrl")} placeholder="https://maloja.example.com" />
      </SettingSection>
    </>
  );

  const renderAudio = () => (
    <>
      <SettingSection title={tt("Streaming", "Streaming")}>
        <SelectRow label={tt("Kualitas streaming", "Streaming Quality")} hint={tt("Kualitas pemutaran default", "Default playback quality")} value={settings.streamingQuality || "auto"} onChange={set("streamingQuality")} options={QUALITY_OPTIONS} />
        <ToggleRow label={tt("Utamakan Dolby Atmos", "Prefer Dolby Atmos")} hint={tt("Minta Dolby Atmos otomatis saat tersedia", "Automatically request Dolby Atmos spatial audio when available")} checked={!!settings.preferAtmos} onChange={set("preferAtmos")} />
        <ToggleRow label={tt("Rendering Atmos OS native", "Native OS Dolby Atmos Rendering")} checked={!!settings.nativeAtmos} onChange={set("nativeAtmos")} />
        <ToggleRow label={tt("Badge kualitas", "Show Quality Badges")} hint={tt('Tampilkan badge "HD" untuk track Hi-Res', 'Display an "HD" badge for Hi-Res tracks')} checked={!!settings.qualityBadges} onChange={set("qualityBadges")} />
        <ToggleRow label={tt("Tahun rilis album", "Album release year")} hint={tt("Tampilkan tahun album asli, bukan tanggal remaster", "Show the original album year instead of the remaster date")} checked={!!settings.originalReleaseYear} onChange={set("originalReleaseYear")} />
        <SelectRow label={tt("Kualitas audio", "Audio quality")} hint={tt("Pratinjau: 30 detik resmi dari Deezer. Penuh: eksperimental lewat YouTube.", "Preview: official 30s from Deezer. Full: experimental via YouTube.")}
          value={settings.audioQuality || "preview"} onChange={set("audioQuality")}
          options={[{ value: "preview", label: tt("Pratinjau (disarankan)", "Preview (recommended)") }, { value: "full", label: tt("Penuh (eksperimental)", "Full (experimental)") }]} />
      </SettingSection>

      <SettingSection title={tt("Pemutaran", "Playback")}>
        <ToggleRow label={tt("Putar otomatis", "Autoplay")} hint={tt("Lanjut ke lagu berikutnya otomatis", "Automatically continue to the next song")} checked={settings.autoplay !== false} onChange={set("autoplay")} />
        <ToggleRow label={tt("Gapless playback", "Gapless Playback")} checked={!!settings.gapless} onChange={set("gapless")} />
        <ToggleRow label={tt("Buang keheningan", "Remove Silence")} hint={tt("Skip silence di awal dan akhir lagu", "Skip leading/trailing silence between tracks")} checked={!!settings.removeSilence} onChange={set("removeSilence")} />
        <SliderRow label={tt("Crossfade", "Crossfade")} hint={tt("Detik transisi antar lagu", "Transition seconds between songs")} value={Number(settings.crossfadeSeconds) || 0} min={0} max={12} step={1} onChange={set("crossfadeSeconds")} format={(v) => `${v}s`} />
        <ToggleRow label={tt("Ratakan volume (ReplayGain)", "ReplayGain Normalize")} hint={tt("Samain kerasnya volume antar lagu", "Even out loudness between songs")} checked={!!settings.normalizeVolume} onChange={set("normalizeVolume")} />
        <SelectRow label="ReplayGain Mode" value={settings.replayGainMode || "off"} onChange={set("replayGainMode")}
          options={[{ value: "off", label: "Off" }, { value: "track", label: tt("Per lagu", "Track") }, { value: "album", label: tt("Per album", "Album") }]} />
        <SliderRow label="ReplayGain Pre-Amp" hint={tt("Atur gain manual (dB)", "Adjust gain manually (dB)")} value={Number(settings.replayGainPreamp) || 0} min={-15} max={15} step={0.5} onChange={set("replayGainPreamp")} format={(v) => `${v > 0 ? "+" : ""}${v}dB`} />
        <ToggleRow label={tt("Audio mono", "Mono Audio")} hint={tt("Gabung kanal kiri & kanan jadi satu", "Combine left and right channels into mono")} checked={!!settings.monoAudio} onChange={set("monoAudio")} />
        <ToggleRow label={tt("Volume eksponensial", "Exponential Volume")} hint={tt("Kurva volume logaritmik biar presisi di volume kecil", "Logarithmic curve for finer low-volume control")} checked={!!settings.exponentialVolume} onChange={set("exponentialVolume")} />
        <SliderRow label={tt("Kecepatan putar", "Playback Speed")} value={Number(settings.playbackSpeed) || 1} min={0.25} max={4} step={0.05} onChange={set("playbackSpeed")} format={(v) => `${v.toFixed(2)}x`} />
        <ToggleRow label={tt("Pertahankan pitch", "Preserve Pitch")} checked={settings.preservePitch !== false} onChange={set("preservePitch")} />
        <ActionRow label={tt("Reset kecepatan", "Reset speed")} buttonText="1.00x" icon={RotateCcw} onAction={() => set("playbackSpeed")(1)} />
        <SliderRow label={tt("Volume awal", "Starting volume")} value={Number(settings.volumeDefault ?? 0.7)} min={0} max={1} step={0.05} onChange={set("volumeDefault")} format={(v) => `${Math.round(v * 100)}%`} />
        <ToggleRow label={tt("Konten eksplisit", "Explicit content")} hint={tt("Tampilkan lagu dengan label eksplisit", "Show songs labeled as explicit")} checked={settings.explicitContent !== false} onChange={set("explicitContent")} />
      </SettingSection>

      <SettingSection title={tt("DSP Binaural / Spasial", "Binaural / Spatial DSP")} desc={tt("Rendering HRTF multichannel untuk audio 3D & Atmos, plus crossfeed untuk stereo.", "Multichannel HRTF rendering for 3D audio & Atmos, plus stereo crossfeed.")}>
        <ToggleRow label={tt("Aktifkan DSP", "Enable DSP")} checked={!!settings.dspEnabled} onChange={set("dspEnabled")} />
        <ToggleRow label={tt("Aktif otomatis untuk spasial", "Auto-enable for Spatial Audio")} hint={tt("Aktif saat konten Atmos/3D terdeteksi", "Activate when Atmos or 3D content is detected")} checked={!!settings.dspAutoEnable} onChange={set("dspAutoEnable")} />
        <SelectRow label="Crossfeed" hint={tt("Simulasi speaker di headphone", "Simulate speaker presentation on headphones")} value={settings.crossfeedLevel || "off"} onChange={set("crossfeedLevel")}
          options={[{ value: "off", label: "Off" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
        <SelectRow label="HRTF Preset" hint={tt("Sudut speaker virtual", "Virtual speaker angle")} value={settings.hrtfPreset || "studio"} onChange={set("hrtfPreset")}
          options={[
            { value: "intimate", label: tt("Intimate (±22°)", "Intimate (±22°)") },
            { value: "studio", label: tt("Studio (±30°)", "Studio (±30°)") },
            { value: "wide", label: tt("Wide (±45°)", "Wide (±45°)") },
          ]} />
        <SliderRow label={tt("Lebar stereo", "Stereo Width")} hint={tt("0 = mono, 1 = netral, 2 = lebar", "0 = mono, 1 = neutral, 2 = wide")} value={Number(settings.stereoWidth ?? 1)} min={0} max={2} step={0.05} onChange={set("stereoWidth")} format={(v) => v.toFixed(2)} />
      </SettingSection>

      <SettingSection title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><SlidersHorizontal size={16} />{tt("Equalizer", "Equalizer")}</span>}>
        <EqualizerPanel eq={eq} onChange={(next) => updateSettings({ equalizer: next })} tt={tt} />
      </SettingSection>
    </>
  );

  const renderDownloads = () => (
    <>
      <SettingSection title={tt("Kualitas & Format", "Quality & Format")}>
        <SelectRow label={tt("Kualitas unduhan", "Download Quality")} value={settings.downloadQuality || "lossless"} onChange={set("downloadQuality")} options={QUALITY_OPTIONS.filter((o) => !o.value.startsWith("eac") && !o.value.startsWith("ac4"))} />
        <SelectRow label={tt("Wadah lossless", "Lossless Container")} value={settings.losslessContainer || "keep"} onChange={set("losslessContainer")}
          options={[{ value: "keep", label: tt("Jangan diubah", "Don't change") }, { value: "flac", label: "FLAC" }, { value: "alac", label: "ALAC" }, { value: "wav", label: "WAV" }, { value: "aiff", label: "AIFF" }]} />
        <SelectRow label={tt("Metode unduh massal", "Bulk Download Method")} value={settings.bulkDownloadMethod || "zip"} onChange={set("bulkDownloadMethod")}
          options={[
            { value: "zip", label: tt("Arsip ZIP", "ZIP Archive") },
            { value: "folderpicker", label: tt("Pilih folder", "Folder Picker") },
            { value: "mediafolder", label: tt("Folder media lokal", "Local Media Folder") },
            { value: "individual", label: tt("File terpisah", "Individual Files") },
          ]} />
        <ToggleRow label={tt("Ingat folder terakhir", "Remember Last Folder")} hint={tt("Pakai ulang folder yang terakhir dipilih", "Re-use the last chosen directory")} checked={!!settings.rememberLastFolder} onChange={set("rememberLastFolder")} />
        <ActionRow label={tt("Reset folder tersimpan", "Reset Saved Folder")} buttonText={tt("Reset", "Reset")} icon={RotateCcw} onAction={resetSavedFolder} />
        <ToggleRow label={tt("Unduhan tunggal ke folder", "Single Downloads to Folder")} hint={tt("Simpan langsung ke folder terkonfigurasi", "Save individual downloads straight to the configured folder")} checked={!!settings.singleToFolder} onChange={set("singleToFolder")} />
        <ToggleRow label={tt("Paksa ZIP sebagai Blob", "Force ZIP as Blob")} hint={tt("Unduh ZIP di memori kalau streaming ZIP bermasalah", "Download ZIP in memory if ZIP streaming causes issues")} checked={!!settings.forceZipBlob} onChange={set("forceZipBlob")} />
      </SettingSection>

      <SettingSection title={tt("Metadata & Lirik", "Metadata & Lyrics")}>
        <ToggleRow label={tt("Tulis artist terpisah", "Write Artists Separately")} hint={tt("Butuh dukungan pemutar", "Requires player support")} checked={!!settings.writeArtistsSeparately} onChange={set("writeArtistsSeparately")} />
        <ToggleRow label={tt("Unduh lirik", "Download Lyrics")} hint={tt("Sertakan file .lrc saat mengunduh", "Include .lrc files when downloading")} checked={!!settings.downloadLyrics} onChange={set("downloadLyrics")} />
        <ToggleRow label="Romaji" hint={tt("Konversi lirik Jepang ke Romaji", "Convert Japanese lyrics to Romaji")} checked={!!settings.romajiLyrics} onChange={set("romajiLyrics")} />
        <SelectRow label={tt("Ukuran cover art", "Cover Art Size")} value={String(settings.coverArtSize || "original")} onChange={(v) => set("coverArtSize")(v === "original" ? "original" : Number(v))}
          options={[{ value: "original", label: tt("Asli", "Original") }, { value: "1280", label: "1280px" }, { value: "640", label: "640px" }, { value: "320", label: "320px" }]} />
      </SettingSection>

      <SettingSection title={tt("Penamaan File", "Filename Templates")}>
        <TextRow label={tt("Template nama file", "Filename Template")} hint="{discNumber} {trackNumber} {artist} {title} {album}" mono
          value={settings.filenameTemplate || "{trackNumber}. {artist} - {title}"} onChange={set("filenameTemplate")} />
        <TextRow label={tt("Template folder", "Folder Template")} hint={tt('Gunakan "/" untuk folder bertingkat', 'Use "/" for nested folders')} mono
          value={settings.folderTemplate || "{albumArtist}/{albumTitle} ({year})"} onChange={set("folderTemplate")} />
      </SettingSection>

      <SettingSection title={tt("Berkas Tambahan", "Extra Files")}>
        <ToggleRow label="M3U" checked={!!settings.generateM3U} onChange={set("generateM3U")} />
        <ToggleRow label="M3U8" hint="extended" checked={!!settings.generateM3U8} onChange={set("generateM3U8")} />
        <ToggleRow label="CUE" hint={tt("Untuk gapless playback", "For gapless playback")} checked={!!settings.generateCUE} onChange={set("generateCUE")} />
        <ToggleRow label="NFO" hint={tt("Kompatibilitas media center", "Media center compatibility")} checked={!!settings.generateNFO} onChange={set("generateNFO")} />
        <ToggleRow label="JSON" hint={tt("Metadata lengkap", "Rich metadata")} checked={!!settings.generateJSON} onChange={set("generateJSON")} />
      </SettingSection>

      <SettingSection title={tt("Struktur Folder", "Folder Structure")}>
        <ToggleRow label={tt("Path relatif", "Relative Paths")} checked={!!settings.relativePaths} onChange={set("relativePaths")} />
        <ToggleRow label={tt("Pisahkan per disc", "Separate Discs")} checked={!!settings.separateDiscs} onChange={set("separateDiscs")} />
        <ToggleRow label={tt("Sertakan cover.jpg", "Include Cover File")} checked={settings.includeCoverFile !== false} onChange={set("includeCoverFile")} />
      </SettingSection>
    </>
  );

  const renderInstances = () => (
    <>
      <SettingSection title={tt("API Utama", "Primary API")} desc={tt("Arahkan permintaan API ke server milikmu sendiri.", "Route API requests through your own server.")}>
        <ToggleRow label="Dev Mode" checked={!!settings.devMode} onChange={set("devMode")} />
        <TextRow label="Dev Mode API URL" mono value={settings.devModeUrl || ""} onChange={set("devModeUrl")} placeholder="http://localhost:8080" />
        <ToggleRow label={tt("Unified Playback", "Unified Playback")} hint={tt("Satu endpoint untuk semua penyedia sumber audio", "One endpoint resolving all audio providers")} checked={!!settings.unifiedPlayback} onChange={set("unifiedPlayback")} />
        <TextRow label="Unified Playback API URL" mono value={settings.unifiedApiUrl || ""} onChange={set("unifiedApiUrl")} />
        <TextRow label="App API Key" type="password" mono value={settings.appApiKey || ""} onChange={set("appApiKey")} />
        <ToggleRow label={tt("Deezer Fallback", "Deezer Fallback")} hint={tt("Sumber terakhir saat penyedia utama gagal (maks lossless 16-bit)", "Last-resort source when primary providers fail (tops out at 16-bit lossless)")} checked={!!settings.deezerFallback} onChange={set("deezerFallback")} />
        <TextRow label="Deezer Fallback API URL" mono value={settings.deezerFallbackUrl || ""} onChange={set("deezerFallbackUrl")} />
      </SettingSection>

      <SettingSection title={tt("Manajemen Instance", "Manage Instances")} desc={tt("Kelola dan prioritaskan daftar instance API. Urutan atas = prioritas lebih tinggi.", "Manage and prioritize API instances. Higher in the list = higher priority.")}>
        {instances.map((inst, idx) => (
          <div className="aivy-instance-row" key={inst.id}>
            <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 20 }}>{idx + 1}</span>
            <input
              className="aivy-settings-input mono"
              style={{ flex: 1, width: "auto", maxWidth: "none" }}
              value={inst.url || ""}
              placeholder="https://api.example.com"
              spellCheck={false}
              onChange={(e) => updateInstance(inst.id, e.target.value)}
            />
            <button className="aivy-icon-btn bare" disabled={idx === 0} onClick={() => moveInstance(idx, -1)} aria-label={tt("Naikkan prioritas", "Increase priority")}><ArrowUp size={13} /></button>
            <button className="aivy-icon-btn bare" disabled={idx === instances.length - 1} onClick={() => moveInstance(idx, 1)} aria-label={tt("Turunkan prioritas", "Decrease priority")}><ArrowDown size={13} /></button>
            <button className="aivy-icon-btn bare" onClick={() => removeInstance(inst.id)} aria-label={tt("Hapus instance", "Remove instance")}><Trash2 size={13} /></button>
          </div>
        ))}
        <div className="aivy-settings-row">
          <div><div className="label">{instances.length ? tt(`${instances.length} instance terdaftar`, `${instances.length} instances configured`) : tt("Belum ada instance tambahan", "No extra instances yet")}</div><div className="hint">{tt("Tes latensi lalu susun sesuai hasilnya", "Test latency and sort by result")}</div></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="aivy-btn-ghost sm" onClick={addInstance}><Plus size={14} /> {tt("Tambah", "Add")}</button>
            <button className="aivy-btn-ghost sm" onClick={() => pushToast(tt("Daftar instance diperbarui", "Instance list refreshed"))}><RefreshCw size={14} /> Refresh</button>
          </div>
        </div>
      </SettingSection>

      <SettingSection title={tt("Database & Auth Kustom", "Custom Database/Auth")}>
        <TextRow label="PocketBase URL" mono value={settings.pocketbaseUrl || ""} onChange={set("pocketbaseUrl")} placeholder="https://pb.example.com" />
        <TextRow label="Appwrite Endpoint" mono value={settings.appwriteEndpoint || ""} onChange={set("appwriteEndpoint")} />
        <TextRow label="Appwrite Project ID" mono value={settings.appwriteProjectId || ""} onChange={set("appwriteProjectId")} />
        <ActionRow
          label={tt("Kembali ke default", "Reset to Defaults")}
          buttonText={tt("Reset", "Reset")}
          icon={RotateCcw}
          onAction={() => updateSettings({ pocketbaseUrl: "", appwriteEndpoint: "", appwriteProjectId: "" })}
        />
      </SettingSection>
    </>
  );

  const renderSystem = () => (
    <>
      <SettingSection title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Cog size={16} />{tt("Pintasan Papan Ketik", "Keyboard Shortcuts")}</span>}>
        {DEFAULT_SHORTCUTS.map((sc) => (
          <ShortcutRow
            key={sc.id}
            shortcut={sc}
            override={shortcutOverrides[sc.id]}
            capturing={capturingShortcut === sc.id}
            onStartCapture={setCapturingShortcut}
            onSave={saveShortcutOverride}
            onClear={clearShortcutOverride}
            tt={tt}
          />
        ))}
        <ActionRow label={tt("Reset pintasan", "Reset Shortcuts")} hint={tt("Kembalikan semua pintasan ke bawaan", "Restore all shortcuts to their defaults")} buttonText={tt("Reset", "Reset")} icon={RotateCcw} onAction={resetAllShortcuts} />
      </SettingSection>

      <SettingSection title={tt("Cache & Data", "Cache & Data")}>
        <ActionRow label={tt("Cache", "Cache")} hint={tt("Hapus respons API yang tersimpan", "Clear cached API responses")} buttonText={tt("Bersihkan Cache", "Clear Cache")} onAction={clearCache} />
        <ToggleRow label={tt("Update otomatis", "Auto-Update App")} hint={tt("Muat ulang otomatis saat versi baru tersedia", "Automatically reload when a new version is available")} checked={settings.autoUpdateApp !== false} onChange={set("autoUpdateApp")} />
        <ToggleRow label="Analytics" hint={tt("Kirim data pengguna anonim", "Send anonymous usage data")} checked={!!settings.analytics} onChange={set("analytics")} />
        <ActionRow tone="danger" label={tt("Reset data lokal", "Reset Local Data")} hint={tt("Hapus data tersimpan di browser ini (sync awan aman)", "Clear local storage on this device (cloud sync unaffected)")} buttonText={tt("Reset", "Reset")} onAction={resetLocalData} />
        <ActionRow tone="danger" label={tt("Hapus data awan", "Clear Cloud Data")} hint={tt("Hapus setting tersimpan di server — tidak bisa dibatalkan", "Delete settings stored on the server — cannot be undone")} buttonText={tt("Hapus", "Clear")} onAction={clearCloudData} />
      </SettingSection>

      <SettingSection title={tt("Backup & Restore", "Backup & Restore")}>
        <ActionRow label={tt("Ekspor koleksi & riwayat", "Export Library & History")} hint={tt("Playlist, lagu disukai, riwayat, dan setting sebagai JSON", "Playlists, liked songs, history, and settings as JSON")} buttonText="Export" icon={FileDown} onAction={exportBackup} />
        <ActionRow label={tt("Impor backup", "Import Backup")} hint={tt("Pulihkan setting dari file backup", "Restore settings from a backup file")} buttonText="Import" icon={FileUp} onAction={() => openImport("backup")} />
        <ActionRow label={tt("Ekspor semua setting", "Export All Settings")} buttonText="Export" icon={FileDown} onAction={exportAllSettings} />
        <ActionRow label={tt("Impor setting", "Import Settings")} buttonText="Import" icon={FileUp} onAction={() => openImport("settings")} />
      </SettingSection>

      <SettingSection title={tt("Konten Diblokir", "Blocked Content")} desc={tt("Artist, album, atau lagu yang diblokir dari rekomendasi.", "Artists, albums, or tracks blocked from recommendations.")}>
        <div className="aivy-settings-row">
          <div>
            <div className="label">
              {`${blocked.artists?.length || 0} ${t("artistLabel")} · ${blocked.albums?.length || 0} ${t("albumLabel")} · ${blocked.tracks?.length || 0} ${tt("lagu", "tracks")}`}
            </div>
            <div className="hint">{tt("Blokir lewat menu klik kanan pada item apa pun", "Block via the right-click menu on any item")}</div>
          </div>
          <Ban size={16} color="var(--ink-faint)" />
        </div>
        <ActionRow label={tt("Bersihkan semua", "Clear All")} buttonText={tt("Bersihin", "Clear")} tone="danger" onAction={clearBlocked} />
      </SettingSection>

      <SettingSection title={t("sectionAccount")}>
        <div className="aivy-settings-row">
          <div><div className="label">{t("settingLoggedInAs")}</div><div className="hint">{authUser.username}</div></div>
          <button className="aivy-btn-ghost sm" disabled={loggingOut} onClick={logout}><LogOut size={14} /> {loggingOut ? t("loading") : t("settingLogout")}</button>
        </div>
        <ActionRow label={t("settingResetAll")} hint={t("settingResetAllHint")} buttonText={tt("Reset", "Reset")} icon={RotateCcw} onAction={resetSettings} />
      </SettingSection>
    </>
  );

  const contentByTab = {
    appearance: renderAppearance,
    interface: renderInterface,
    scrobble: renderScrobble,
    audio: renderAudio,
    downloads: renderDownloads,
    instances: renderInstances,
    system: renderSystem,
  };

  return (
    <div className="aivy-view-enter aivy-settings-page">
      <div className="aivy-greet" style={{ paddingBottom: 18 }}>
        <h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{t("settingsTitle")}</h1>
      </div>

      <div className="aivy-settings-layout">
        <nav className="aivy-settings-tabs" role="tablist" aria-label={t("settingsTitle")}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={`aivy-settings-tab ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="aivy-settings-col">
          {contentByTab[tab]?.()}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onImportFile} />
    </div>
  );
}
