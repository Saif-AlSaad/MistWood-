import React, { useState, useEffect } from "react";
import {
  Activity,
  Check,
  Eye,
  Gamepad2,
  Music,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Type,
  Volume1,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import type { GameSettings } from "../../game/types";

interface SettingsModalProps {
  settings: GameSettings;
  muted: boolean;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onToggleMute: () => void;
  onResetDefaults?: () => void;
  onClose: () => void;
  onHover?: () => void;
  onClickSound?: () => void;
}

type SettingsTab = "audio" | "graphics" | "controls";

/* Segmented button control for minimal text toggling */
function SegmentedToggle<T extends string | boolean>({
  options,
  value,
  onChange,
  onHover,
  onClickSound,
}: {
  options: { label: string; value: T }[];
  value: T;
  onHover?: () => void;
  onClickSound?: () => void;
  onChange: (val: T) => void;
}) {
  return (
    <div className="flex items-center rounded-xl border border-white/10 bg-black/40 p-1">
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onMouseEnter={onHover}
            onClick={() => {
              onClickSound?.();
              onChange(opt.value);
            }}
            className={`min-w-[50px] rounded-lg px-2.5 py-1 font-game text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-gradient-to-r from-amber-400 to-amber-300 text-stone-950 shadow-[0_2px_12px_rgba(251,191,36,0.35)] scale-[1.02]"
                : "text-white/45 hover:text-white/80 hover:bg-white/5 active:scale-95"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* Setting row with clean icon and title */
function SettingRow({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-all duration-150 hover:border-white/20 hover:bg-white/[0.05]">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.1)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-game text-xs font-bold tracking-wide text-white uppercase">{title}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  muted,
  onUpdateSettings,
  onToggleMute,
  onResetDefaults,
  onClose,
  onHover,
  onClickSound,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("audio");
  const [resetFeedback, setResetFeedback] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClickSound?.();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onClickSound]);

  const handleReset = () => {
    onClickSound?.();
    onResetDefaults?.();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 1200);
  };

  // Preset check for Graphics
  const isPerformance =
    !settings.speedEffects &&
    !settings.screenShake &&
    settings.particleIntensity === "low" &&
    settings.reducedMotion;

  const isCinematic =
    settings.speedEffects &&
    settings.screenShake &&
    settings.particleIntensity === "high" &&
    !settings.reducedMotion;

  const applyGraphicPreset = (preset: "perf" | "cine") => {
    onClickSound?.();
    if (preset === "perf") {
      onUpdateSettings({
        speedEffects: false,
        screenShake: false,
        particleIntensity: "low",
        reducedMotion: true,
      });
    } else {
      onUpdateSettings({
        speedEffects: true,
        screenShake: true,
        particleIntensity: "high",
        reducedMotion: false,
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClickSound?.();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md select-none animate-fade-in"
    >
      <div className="animate-modal-pop relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#090e17]/95 shadow-[0_24px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(251,191,36,0.06)] backdrop-blur-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <h2 className="font-display text-base font-bold tracking-[0.2em] text-white uppercase">
              Settings
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset to Defaults button */}
            {onResetDefaults && (
              <button
                type="button"
                onClick={handleReset}
                onMouseEnter={onHover}
                title="Reset to defaults"
                className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-[11px] font-semibold text-white/60 transition-all hover:border-amber-300/40 hover:bg-white/10 hover:text-amber-200 active:scale-95 cursor-pointer"
              >
                <RotateCcw className={`h-3 w-3 ${resetFeedback ? "animate-spin text-amber-300" : ""}`} />
                <span>{resetFeedback ? "Reset!" : "Defaults"}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                onClickSound?.();
                onClose();
              }}
              onMouseEnter={onHover}
              title="Close (ESC)"
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-all hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onMouseEnter={onHover}
              onClick={() => {
                onClickSound?.();
                setActiveTab("audio");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 font-game text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === "audio"
                  ? "bg-gradient-to-r from-amber-400 to-amber-300 text-stone-950 shadow-[0_2px_12px_rgba(251,191,36,0.3)] scale-[1.01]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Audio</span>
            </button>

            <button
              type="button"
              onMouseEnter={onHover}
              onClick={() => {
                onClickSound?.();
                setActiveTab("graphics");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 font-game text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === "graphics"
                  ? "bg-gradient-to-r from-amber-400 to-amber-300 text-stone-950 shadow-[0_2px_12px_rgba(251,191,36,0.3)] scale-[1.01]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Visuals</span>
            </button>

            <button
              type="button"
              onMouseEnter={onHover}
              onClick={() => {
                onClickSound?.();
                setActiveTab("controls");
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 font-game text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === "controls"
                  ? "bg-gradient-to-r from-amber-400 to-amber-300 text-stone-950 shadow-[0_2px_12px_rgba(251,191,36,0.3)] scale-[1.01]"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              <span>Controls</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ================= AUDIO TAB ================= */}
          {activeTab === "audio" && (
            <div className="animate-tab-slide space-y-3">
              {/* Quick Mute Master Action */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
                <span className="text-xs font-semibold text-white/70">Master Sound</span>
                <button
                  type="button"
                  onMouseEnter={onHover}
                  onClick={() => {
                    onClickSound?.();
                    onToggleMute();
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95 ${
                    muted
                      ? "border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                      : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  }`}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{muted ? "MUTED" : "ENABLED"}</span>
                </button>
              </div>

              {/* Master Volume Slider */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onMouseEnter={onHover}
                      onClick={() => {
                        onClickSound?.();
                        onUpdateSettings({
                          masterVolume: settings.masterVolume > 0 ? 0 : 0.85,
                        });
                      }}
                      title="Quick toggle channel"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-amber-300 transition-colors hover:bg-white/15 cursor-pointer"
                    >
                      {settings.masterVolume === 0 ? (
                        <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                      ) : settings.masterVolume < 0.5 ? (
                        <Volume1 className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="text-xs font-semibold text-white">Master</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Quick snap buttons */}
                    <div className="flex gap-1">
                      {[0, 0.5, 1].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onMouseEnter={onHover}
                          onClick={() => {
                            onClickSound?.();
                            onUpdateSettings({ masterVolume: pct });
                          }}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors cursor-pointer ${
                            Math.abs(settings.masterVolume - pct) < 0.05
                              ? "bg-amber-400/30 text-amber-200 font-bold"
                              : "bg-white/5 text-white/40 hover:text-white/80"
                          }`}
                        >
                          {Math.round(pct * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.masterVolume}
                    onChange={(e) => {
                      onUpdateSettings({ masterVolume: parseFloat(e.target.value) });
                    }}
                    style={{
                      background: `linear-gradient(to right, #fde047 0%, #fde047 ${
                        settings.masterVolume * 100
                      }%, rgba(255,255,255,0.12) ${
                        settings.masterVolume * 100
                      }%, rgba(255,255,255,0.12) 100%)`,
                    }}
                    className="slider-thumb-amber h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                  />
                  <span className="w-9 text-right font-mono text-xs font-bold text-amber-200">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* SFX Volume Slider */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onMouseEnter={onHover}
                      onClick={() => {
                        onClickSound?.();
                        onUpdateSettings({
                          sfxVolume: settings.sfxVolume > 0 ? 0 : 0.85,
                        });
                      }}
                      title="Quick toggle channel"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-amber-300 transition-colors hover:bg-white/15 cursor-pointer"
                    >
                      {settings.sfxVolume === 0 ? (
                        <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="text-xs font-semibold text-white">Sound Effects</span>
                  </div>

                  <div className="flex gap-1">
                    {[0, 0.5, 1].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onMouseEnter={onHover}
                        onClick={() => {
                          onClickSound?.();
                          onUpdateSettings({ sfxVolume: pct });
                        }}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors cursor-pointer ${
                          Math.abs(settings.sfxVolume - pct) < 0.05
                            ? "bg-amber-400/30 text-amber-200 font-bold"
                            : "bg-white/5 text-white/40 hover:text-white/80"
                        }`}
                      >
                        {Math.round(pct * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    onChange={(e) => {
                      onUpdateSettings({ sfxVolume: parseFloat(e.target.value) });
                    }}
                    style={{
                      background: `linear-gradient(to right, #fde047 0%, #fde047 ${
                        settings.sfxVolume * 100
                      }%, rgba(255,255,255,0.12) ${
                        settings.sfxVolume * 100
                      }%, rgba(255,255,255,0.12) 100%)`,
                    }}
                    className="slider-thumb-amber h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                  />
                  <span className="w-9 text-right font-mono text-xs font-bold text-amber-200">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
              </div>

              {/* Music Volume Slider */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onMouseEnter={onHover}
                      onClick={() => {
                        onClickSound?.();
                        onUpdateSettings({
                          musicVolume: settings.musicVolume > 0 ? 0 : 0.75,
                        });
                      }}
                      title="Quick toggle channel"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-amber-300 transition-colors hover:bg-white/15 cursor-pointer"
                    >
                      {settings.musicVolume === 0 ? (
                        <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                      ) : (
                        <Music className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="text-xs font-semibold text-white">Music & Ambience</span>
                  </div>

                  <div className="flex gap-1">
                    {[0, 0.5, 1].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onMouseEnter={onHover}
                        onClick={() => {
                          onClickSound?.();
                          onUpdateSettings({ musicVolume: pct });
                        }}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors cursor-pointer ${
                          Math.abs(settings.musicVolume - pct) < 0.05
                            ? "bg-amber-400/30 text-amber-200 font-bold"
                            : "bg-white/5 text-white/40 hover:text-white/80"
                        }`}
                      >
                        {Math.round(pct * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.musicVolume}
                    onChange={(e) => {
                      onUpdateSettings({ musicVolume: parseFloat(e.target.value) });
                    }}
                    style={{
                      background: `linear-gradient(to right, #fde047 0%, #fde047 ${
                        settings.musicVolume * 100
                      }%, rgba(255,255,255,0.12) ${
                        settings.musicVolume * 100
                      }%, rgba(255,255,255,0.12) 100%)`,
                    }}
                    className="slider-thumb-amber h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                  />
                  <span className="w-9 text-right font-mono text-xs font-bold text-amber-200">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================= GRAPHICS TAB ================= */}
          {activeTab === "graphics" && (
            <div className="animate-tab-slide space-y-3">
              {/* Quick graphic profiles */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-2">
                <span className="pl-2 text-xs font-semibold text-white/60">Preset</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onMouseEnter={onHover}
                    onClick={() => applyGraphicPreset("perf")}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                      isPerformance
                        ? "bg-amber-400 text-stone-950 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                        : "border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 active:scale-95"
                    }`}
                  >
                    Performance
                  </button>
                  <button
                    type="button"
                    onMouseEnter={onHover}
                    onClick={() => applyGraphicPreset("cine")}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                      isCinematic
                        ? "bg-amber-400 text-stone-950 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                        : "border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 active:scale-95"
                    }`}
                  >
                    Cinematic
                  </button>
                </div>
              </div>

              {/* Game Typography Theme */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-white/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                      <Type className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-game text-xs font-bold tracking-wide text-white uppercase">
                        Typography Theme
                      </div>
                      <div className="text-[10px] text-white/50">
                        {settings.fontTheme === "elder"
                          ? "Cinzel & Elder Classical Lore"
                          : settings.fontTheme === "arcade"
                          ? "Rajdhani Athletic Racing Display"
                          : settings.fontTheme === "tactical"
                          ? "Oxanium Tactical HUD Telemetry"
                          : "Cinzel & Oxanium (AAA Mythic)"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                  {[
                    { label: "MYTHIC", value: "mythic" as const },
                    { label: "ELDER", value: "elder" as const },
                    { label: "ARCADE", value: "arcade" as const },
                    { label: "TACTICAL", value: "tactical" as const },
                  ].map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onMouseEnter={onHover}
                      onClick={() => {
                        onClickSound?.();
                        onUpdateSettings({ fontTheme: f.value });
                      }}
                      className={`rounded-lg py-1.5 text-[10px] font-game font-bold tracking-wider uppercase transition-all duration-150 cursor-pointer ${
                        (settings.fontTheme ?? "mythic") === f.value
                          ? "bg-amber-400 text-stone-950 font-black shadow-[0_0_10px_rgba(251,191,36,0.35)]"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Speed FOV */}
              <SettingRow icon={Zap} title="Speed FOV & Lines">
                <SegmentedToggle
                  value={settings.speedEffects}
                  onChange={(val) => onUpdateSettings({ speedEffects: val })}
                  options={[
                    { label: "OFF", value: false },
                    { label: "ON", value: true },
                  ]}
                  onHover={onHover}
                  onClickSound={onClickSound}
                />
              </SettingRow>

              {/* Screen Shake */}
              <SettingRow icon={Activity} title="Screen Shake">
                <SegmentedToggle
                  value={settings.screenShake}
                  onChange={(val) => onUpdateSettings({ screenShake: val })}
                  options={[
                    { label: "OFF", value: false },
                    { label: "ON", value: true },
                  ]}
                  onHover={onHover}
                  onClickSound={onClickSound}
                />
              </SettingRow>

              {/* Particle Density */}
              <SettingRow icon={Sparkles} title="Particles">
                <SegmentedToggle
                  value={settings.particleIntensity}
                  onChange={(val) => onUpdateSettings({ particleIntensity: val })}
                  options={[
                    { label: "LOW", value: "low" },
                    { label: "HIGH", value: "high" },
                  ]}
                  onHover={onHover}
                  onClickSound={onClickSound}
                />
              </SettingRow>

              {/* Reduced Motion */}
              <SettingRow icon={Eye} title="Reduced Motion">
                <SegmentedToggle
                  value={settings.reducedMotion}
                  onChange={(val) => onUpdateSettings({ reducedMotion: val })}
                  options={[
                    { label: "OFF", value: false },
                    { label: "ON", value: true },
                  ]}
                  onHover={onHover}
                  onClickSound={onClickSound}
                />
              </SettingRow>
            </div>
          )}

          {/* ================= CONTROLS TAB ================= */}
          {activeTab === "controls" && (
            <div className="animate-tab-slide space-y-3">
              {/* Touch Vibration Setting */}
              <SettingRow icon={Smartphone} title="Touch Vibration">
                <SegmentedToggle
                  value={settings.haptics !== false}
                  onChange={(val) => onUpdateSettings({ haptics: val })}
                  options={[
                    { label: "OFF", value: false },
                    { label: "ON", value: true },
                  ]}
                  onHover={onHover}
                  onClickSound={onClickSound}
                />
              </SettingRow>

              {/* Keyboard Scheme Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-amber-200/80 uppercase">
                  <Gamepad2 className="h-3.5 w-3.5" />
                  <span>Keyboard Controls</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Jump</span>
                    <div className="flex gap-1">
                      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                        SPACE
                      </kbd>
                      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                        W
                      </kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Slide</span>
                    <div className="flex gap-1">
                      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                        S
                      </kbd>
                      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                        ↓
                      </kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Pause</span>
                    <div className="flex gap-1">
                      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                        ESC
                      </kbd>
                      <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                        P
                      </kbd>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Mute</span>
                    <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200 shadow-sm">
                      M
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Touch Gestures Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-amber-200/80 uppercase">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Touch Gestures</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Tap Right</span>
                    <span className="font-semibold text-amber-200">Jump</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Tap Left</span>
                    <span className="font-semibold text-amber-200">Slide</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between rounded-xl bg-black/40 px-3 py-2 border border-white/5">
                    <span className="text-white/60">Swipe Down</span>
                    <span className="font-semibold text-amber-200">Fast Fall & Slide</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 bg-black/30 text-[11px]">
          <div className="flex items-center gap-1.5 text-white/40">
            <Check className="h-3.5 w-3.5 text-emerald-400" />
            <span>Saved automatically</span>
          </div>

          <span className="text-[10px] font-mono text-white/30">
            MISTWOOD v1.0
          </span>
        </div>
      </div>
    </div>
  );
};
