import React from "react";
import {
  Accessibility,
  Eye,
  Sliders,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { GameSettings } from "../../game/types";

interface SettingsModalProps {
  settings: GameSettings;
  muted: boolean;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onToggleMute: () => void;
  onClose: () => void;
  onClickSound?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  muted,
  onUpdateSettings,
  onToggleMute,
  onClose,
  onClickSound,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md select-none animate-fade-in"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#090e17]/95 shadow-[0_20px_80px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-4 w-4 text-amber-300" />
            <h2 className="font-display text-lg font-bold tracking-wider text-white uppercase">
              SETTINGS
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onClickSound?.();
              onClose();
            }}
            title="Close Settings"
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* AUDIO SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-200/80 uppercase">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Audio Levels</span>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 cursor-pointer"
              >
                {muted ? <VolumeX className="h-3 w-3 text-rose-300" /> : <Volume2 className="h-3 w-3 text-emerald-300" />}
                <span>{muted ? "MUTED" : "ACTIVE"}</span>
              </button>
            </div>

            {/* Master Volume */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex justify-between text-xs font-medium text-white/70">
                <span>Master Volume</span>
                <span className="tabular-nums font-mono text-amber-200">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => onUpdateSettings({ masterVolume: parseFloat(e.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-amber-300"
              />
            </div>

            {/* SFX Volume */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex justify-between text-xs font-medium text-white/70">
                <span>Sound Effects (SFX)</span>
                <span className="tabular-nums font-mono text-amber-200">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => onUpdateSettings({ sfxVolume: parseFloat(e.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-amber-300"
              />
            </div>

            {/* Music / Atmosphere Volume */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex justify-between text-xs font-medium text-white/70">
                <span>Music & Nature Ambiance</span>
                <span className="tabular-nums font-mono text-amber-200">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.musicVolume}
                onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/15 accent-amber-300"
              />
            </div>
          </div>

          {/* GRAPHICS & CINEMATICS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-200/80 uppercase">
              <Eye className="h-3.5 w-3.5" />
              <span>Graphics & Racing Feel</span>
            </div>

            {/* Speed Effects (FOV Zoom & Wind Streaks) */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <div className="text-xs font-medium text-white">Dynamic Speed FOV & Streaks</div>
                <div className="text-[10px] text-white/40">Camera zoom-out and wind lines at top velocity</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ speedEffects: !settings.speedEffects })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.speedEffects ? "bg-amber-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-900 transition-transform ${
                    settings.speedEffects ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Screen Shake */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <div className="text-xs font-medium text-white">Screen Shake</div>
                <div className="text-[10px] text-white/40">Impact vibrations on landing, near miss, and speed bursts</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ screenShake: !settings.screenShake })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.screenShake ? "bg-amber-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-900 transition-transform ${
                    settings.screenShake ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Particle Intensity */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <div className="text-xs font-medium text-white">Particle Atmosphere</div>
                <div className="text-[10px] text-white/40">Density of fireflies, drifting leaves, and sparks</div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    particleIntensity: settings.particleIntensity === "high" ? "low" : "high",
                  })
                }
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-amber-200 uppercase cursor-pointer"
              >
                {settings.particleIntensity.toUpperCase()}
              </button>
            </div>
          </div>

          {/* ACCESSIBILITY & CONTROLS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-200/80 uppercase">
              <Accessibility className="h-3.5 w-3.5" />
              <span>Accessibility & Motion</span>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <div className="text-xs font-medium text-white">Reduced Motion</div>
                <div className="text-[10px] text-white/40">Disables intense camera shifts and rapid visual vibration</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.reducedMotion ? "bg-amber-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-900 transition-transform ${
                    settings.reducedMotion ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Haptic Vibration */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div>
                <div className="text-xs font-medium text-white">Touch Haptics (Vibration)</div>
                <div className="text-[10px] text-white/40">Tactile rumble feedback for jumps, slides, and near misses</div>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ haptics: settings.haptics === false ? true : false })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  settings.haptics !== false ? "bg-amber-400" : "bg-white/15"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-stone-900 transition-transform ${
                    settings.haptics !== false ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Controls Reference */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
              <span className="text-[10px] font-semibold text-white/45 uppercase tracking-wider">
                Controls Reference
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/70">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">TOUCH</span>
                  <span>Right (Jump) · Left (Slide)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">SWIPE</span>
                  <span>Swipe Down (Slide)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">SPACE / W</span>
                  <span>Jump / Leap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">S / DOWN</span>
                  <span>Slide / Fast fall</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">ESC / P</span>
                  <span>Pause Run</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">M</span>
                  <span>Mute Audio</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-3.5 text-center text-[10px] font-medium tracking-wider text-white/30 uppercase">
          Settings are saved automatically to local storage
        </div>
      </div>
    </div>
  );
};
