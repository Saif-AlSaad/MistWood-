import React from "react";
import {
  Play,
  Settings,
  Sparkles,
  Trees,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { FoxPelt } from "../../game/types";
import type { AnimalDefinition } from "../../game/animals";

interface MainMenuProps {
  best: number;
  totalFlies: number;
  activePelt?: FoxPelt;
  activeAnimal?: AnimalDefinition;
  muted: boolean;
  isTouch: boolean;
  onStart: () => void;
  onOpenGarage: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
  onHover?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  best,
  totalFlies,
  activePelt,
  activeAnimal,
  muted,
  isTouch,
  onStart,
  onOpenGarage,
  onOpenSettings,
  onToggleMute,
  onHover,
}) => {
  const animalName = activeAnimal?.name || activePelt?.name || "Red Fox";
  const animalColor = activeAnimal?.colors.accent || activePelt?.accentColor || "#ffd27a";
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-between overflow-y-auto px-4 py-3 sm:p-6 text-center select-none"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
    >
      {/* Top Bar Utilities */}
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3.5 py-1.5 backdrop-blur-md">
          <Trees className="h-3.5 w-3.5 text-amber-200/80" />
          <span className="text-[10px] font-semibold tracking-[0.25em] text-white/70 uppercase">
            FOREST RACING EXPERIENCE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            onMouseEnter={onHover}
            title={muted ? "Unmute Audio (M)" : "Mute Audio (M)"}
            aria-label="Toggle Sound"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60 hover:text-white active:scale-95 cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            onMouseEnter={onHover}
            title="Settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all hover:scale-105 hover:bg-black/60 hover:text-white active:scale-95 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Center Cinematic Title & Main Action */}
      <div className="flex flex-col items-center my-auto py-2">
        <div className="fade-up flex items-center gap-2 text-amber-200/70">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-200/50" />
          <span className="text-[11px] font-medium uppercase tracking-[0.45em]">
            THE WILD REMAINS
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-200/50" />
        </div>

        <h1 className="fade-up fade-up-1 font-display mt-2 bg-gradient-to-b from-amber-50 via-amber-100 to-teal-200/70 bg-clip-text text-5xl font-bold tracking-[0.12em] text-transparent drop-shadow-[0_4px_40px_rgba(0,0,0,0.8)] sm:text-7xl md:text-8xl">
          MISTWOOD
        </h1>

        <p className="fade-up fade-up-2 mt-2 sm:mt-4 max-w-md text-xs font-light leading-relaxed tracking-wide text-white/60 md:text-sm">
          Navigate ancient paths at breakneck speed. Outrun the encroaching mist, leap
          weathered boulders, slip beneath thorny canopies, and attune with forest spirits.
        </p>

        {/* Primary Action Buttons */}
        <div className="fade-up fade-up-3 mt-8 flex flex-wrap items-center justify-center gap-4">
          {/* START RUN Button */}
          <button
            type="button"
            onClick={onStart}
            onMouseEnter={onHover}
            className="group flex items-center gap-3 rounded-2xl bg-amber-100 px-9 py-4 text-xs font-bold tracking-[0.25em] text-stone-950 uppercase shadow-[0_8px_40px_rgba(255,210,122,0.45)] transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-[0_8px_50px_rgba(255,220,150,0.6)] active:scale-95 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-stone-950 transition-transform duration-300 group-hover:translate-x-0.5" />
            START RUN
          </button>

          {/* GARAGE Button */}
          <button
            type="button"
            onClick={onOpenGarage}
            onMouseEnter={onHover}
            className="flex items-center gap-2.5 rounded-2xl border border-amber-300/35 bg-black/45 px-7 py-4 text-xs font-semibold tracking-[0.2em] text-amber-200/90 shadow-[0_4px_25px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-amber-300/60 hover:bg-amber-950/30 active:scale-95 cursor-pointer"
          >
            <Sparkles className="h-4 w-4 fill-amber-300/30 text-amber-300" />
            GARAGE
            <span className="ml-1 rounded-full border border-amber-300/30 bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-100 tabular-nums">
              {totalFlies} ✨
            </span>
          </button>
        </div>

        {/* Quick Stats Badges */}
        <div className="fade-up fade-up-4 mt-7 flex flex-wrap items-center justify-center gap-3">
          {best > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-100/10 px-4 py-1.5 text-[11px] font-medium tracking-wider text-amber-100/90 backdrop-blur-md">
              <Trophy className="h-3.5 w-3.5 text-amber-300" />
              <span>RECORD: {best} m</span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium tracking-wider text-white/70 backdrop-blur-md">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: animalColor }}
            />
            <span>RUNNER: {animalName.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls Legend */}
      <div className="flex flex-col items-center gap-1.5">
        {isTouch ? (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-medium tracking-widest text-white/50 backdrop-blur-sm uppercase">
            <span>Tap Right to Leap · Tap Left to Slide</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-medium tracking-widest text-white/50 backdrop-blur-sm uppercase">
            <span className="flex items-center gap-1">
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/80">SPACE</span>
              <span>Jump ×2</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1">
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/80">S</span>
              <span>Slide</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="flex items-center gap-1">
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/80">ESC</span>
              <span>Pause</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
