import React, { useMemo } from "react";
import { Sun, Moon, Monitor, LogOut, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useUI } from "../context.jsx";
import { EQ_BANDS_HZ, EQ_PRESETS } from "../context.jsx";
import { LANGUAGES } from "../lib/i18n.js";
import { CustomSelect } from "../components.jsx";

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
        <span className="font-mono" style={{ fontSize: 12, width: 42, textAlign: "right", color: "var(--ink-faint)" }}>{format ? format(value) : value}</span>
      </div>
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

function EqualizerPanel({ eq, onChange, t }) {
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
    { value: "flat", label: t("eqPresetFlat") },
    { value: "bass", label: t("eqPresetBass") },
    { value: "treble", label: t("eqPresetTreble") },
    { value: "vocal", label: t("eqPresetVocal") },
    { value: "electronic", label: t("eqPresetElectronic") },
    { value: "custom", label: t("eqPresetCustom") },
  ];
  const freqLabel = (hz) => (hz >= 1000 ? `${hz / 1000}k` : `${hz}`);

  return (
    <>
      <ToggleRow label={t("settingEqEnable")} hint={t("settingEqEnableHint")} checked={eq.enabled} onChange={(v) => onChange({ ...eq, enabled: v })} />
      <SelectRow label={t("settingEqPreset")} value={eq.preset || matchPreset(bands)} onChange={setPreset} options={presetOptions} />
      <SliderRow label={t("settingEqPreamp")} value={eq.preamp || 0} min={-12} max={12} step={1}
        onChange={(v) => onChange({ ...eq, preamp: v })} format={(v) => `${v > 0 ? "+" : ""}${v}dB`} />
      <div className="aivy-settings-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, opacity: eq.enabled ? 1 : 0.45 }}>
        <div className="label">{t("settingEqBands")}</div>
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
    </>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, authUser, logout, loggingOut, t } = useUI();

  if (!authUser) {
    return <div className="aivy-empty" style={{ paddingTop: 80 }}><div className="title">{t("loginForSettings")}</div></div>;
  }

  const set = (key) => (val) => updateSettings({ [key]: val });
  const eq = settings.equalizer || { enabled: false, preset: "flat", preamp: 0, bands: [...EQ_PRESETS.flat] };

  return (
    <div className="aivy-view-enter aivy-settings-page">
      <div className="aivy-greet" style={{ paddingBottom: 6 }}><h1 className="font-display" style={{ fontSize: "clamp(22px,3vw,28px)" }}>{t("settingsTitle")}</h1></div>

      <SettingSection title={t("sectionAppearance")}>
        <SelectRow label={t("settingTheme")} value={settings.theme} onChange={set("theme")} options={[{ value: "dark", label: t("themeDark") }, { value: "light", label: t("themeLight") }]} />
        <ToggleRow label={t("settingCompactRows")} hint={t("settingCompactRowsHint")} checked={settings.compactRows} onChange={set("compactRows")} />
        <ToggleRow label={t("settingReducedMotion")} hint={t("settingReducedMotionHint")} checked={settings.reducedMotion} onChange={set("reducedMotion")} />
        <ToggleRow label={t("settingHighContrast")} checked={settings.highContrast} onChange={set("highContrast")} />
        <SelectRow label={t("settingLanguage")} value={settings.language} onChange={set("language")} options={LANGUAGES} />
      </SettingSection>

      <SettingSection title={t("sectionAudio")}>
        <SelectRow label={t("settingAudioQuality")} value={settings.audioQuality} hint={t("settingAudioQualityHint")} onChange={set("audioQuality")}
          options={[{ value: "preview", label: t("audioQualityPreview") }, { value: "full", label: t("audioQualityFull") }]} />
        <ToggleRow label={t("settingAutoplay")} hint={t("settingAutoplayHint")} checked={settings.autoplay} onChange={set("autoplay")} />
        <ToggleRow label={t("settingNormalizeVolume")} hint={t("settingNormalizeVolumeHint")} checked={settings.normalizeVolume} onChange={set("normalizeVolume")} />
        <SliderRow label={t("settingVolumeDefault")} value={settings.volumeDefault} min={0} max={1} step={0.05} onChange={set("volumeDefault")} format={(v) => `${Math.round(v * 100)}%`} />
        <SliderRow label={t("settingCrossfade")} hint={t("settingCrossfadeHint")} value={settings.crossfadeSeconds} min={0} max={12} step={1} onChange={set("crossfadeSeconds")} format={(v) => `${v}d`} />
        <ToggleRow label={t("settingExplicit")} hint={t("settingExplicitHint")} checked={settings.explicitContent} onChange={set("explicitContent")} />
      </SettingSection>

      <SettingSection title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><SlidersHorizontal size={16} />{t("sectionEqualizer")}</span>}>
        <EqualizerPanel eq={eq} onChange={(next) => updateSettings({ equalizer: next })} t={t} />
        <div className="aivy-settings-row">
          <div><div className="label">{t("settingEqReset")}</div></div>
          <button className="aivy-btn-ghost" onClick={() => updateSettings({ equalizer: { enabled: eq.enabled, preset: "flat", preamp: 0, bands: [...EQ_PRESETS.flat] } })}><RotateCcw size={14} /> {t("settingEqReset")}</button>
        </div>
      </SettingSection>

      <SettingSection title={t("sectionHistory")}>
        <ToggleRow label={t("settingHistory")} checked={settings.historyEnabled} onChange={set("historyEnabled")} />
        <ToggleRow label={t("settingSearchHistory")} hint={t("settingSearchHistoryHint")} checked={settings.searchHistoryEnabled} onChange={set("searchHistoryEnabled")} />
      </SettingSection>

      <SettingSection title={t("sectionRooms")}>
        <ToggleRow label={t("settingRoomPublicDefault")} hint={t("settingRoomPublicDefaultHint")} checked={settings.roomVisibilityDefault === "public"} onChange={(v) => set("roomVisibilityDefault")(v ? "public" : "private")} />
        <ToggleRow label={t("settingHostOnlyDefault")} checked={settings.hostOnlyControlDefault} onChange={set("hostOnlyControlDefault")} />
        <ToggleRow label={t("settingAutoJoinAudio")} hint={t("settingAutoJoinAudioHint")} checked={settings.autoJoinRoomAudio} onChange={set("autoJoinRoomAudio")} />
      </SettingSection>

      <SettingSection title={t("sectionNotif")}>
        <ToggleRow label={t("settingNotifyInvite")} hint={t("settingNotifyInviteHint")} checked={settings.notifyRoomInvite} onChange={set("notifyRoomInvite")} />
        <ToggleRow label={t("settingNotifyFollower")} hint={t("settingNotifyFollowerHint")} checked={settings.notifyNewFollower} onChange={set("notifyNewFollower")} />
      </SettingSection>

      <SettingSection title={t("sectionAccount")}>
        <div className="aivy-settings-row">
          <div><div className="label">{t("settingLoggedInAs")}</div><div className="hint">{authUser.username}</div></div>
          <button className="aivy-btn-ghost" disabled={loggingOut} onClick={logout}><LogOut size={14} /> {loggingOut ? t("loading") : t("settingLogout")}</button>
        </div>
        <div className="aivy-settings-row">
          <div><div className="label">{t("settingResetAll")}</div><div className="hint">{t("settingResetAllHint")}</div></div>
          <button className="aivy-btn-ghost" onClick={resetSettings}><RotateCcw size={14} /> {t("settingResetAll")}</button>
        </div>
      </SettingSection>
    </div>
  );
}