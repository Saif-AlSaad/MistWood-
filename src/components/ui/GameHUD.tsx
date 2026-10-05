import React from "react";
import {
  ArrowBigDown,
  ArrowBigUp,
  Compass,
  Pause,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import type { HUDData } from "../../game/types";
import { Speedometer } from "./Speedometer";

interface GameHUDProps {
  hud: HUDData | null;
  best: number;
  muted: boolean;
  nearMissToast: { id: number; count: number } | null;
  isTouch: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onSlideStart: () => void;
  onSlideEnd: () => void;
  onJumpStart: () => void;
  onJumpEnd: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  best,
  muted,
  nearMissToast,
  isTouch,
  onPause,
  onToggleMute,
  onOpenSettings,
  onSlideStart,
  onSlideEnd,
  onJumpStart,
  onJumpEnd,
}) => {
  const dist = hud?.dist ?? 0;
  const flies = hud?.flies ?? 0;
  const speedKmh = hud?.speedKmh ?? 109;
  const maxSpeedKmh = hud?.maxSpeedKmh ?? 109;
  const ghostT = hud?.ghostT ?? 0;
  const nearMissCount = hud?.nearMissCount ?? 0;

  return (
    <>
      {/* ================= TOP-LEFT: Distance & Records ================= */}
      <div className="pointer-events-none absolute left-4 top-4 z-40 flex flex-col gap-1.5 md:left-6 md:top-6 select-none">
        <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-black/45 px-4 py-2 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl tabular-nums">
              {dist}
            </span>
            <span className="text-[11px] font-semibold tracking-widest text-amber-200/70 uppercase">
              m
            </span>
          </div>

          <span className="h-4 w-px bg-white/20" />

          {/* Best distance record display */}
          <div className="flex items-center gap-1.5 text-amber-200/80" title={`Personal Best: ${best}m`}>
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-xs font-medium tabular-nums text-white/90">
              {Math.max(best, dist)}m
            </span>
          </div>

          {/* Near miss counter badge if any */}
          {nearMissCount > 0 && (
            <>
              <span className="h-4 w-px bg-white/20" />
              <div className="flex items-center gap-1 text-emerald-300" title="Close Calls">
                <Zap className="h-3.5 w-3.5 fill-emerald-300/30" />
                <span className="text-xs font-semibold tabular-nums">
                  {nearMissCount}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= TOP-CENTER: Biome Journey & Active Buffs ================= */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-40 flex -translate-x-1/2 flex-col items-center gap-2 md:top-6 select-none">
        {/* Biome progress meter */}
        <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 backdrop-blur-md shadow-md">
          <Compass className="h-3.5 w-3.5 text-amber-200/80 shrink-0" />
          <span className="text-[11px] font-semibold tracking-[0.2em] text-white/90 uppercase">
            {hud?.biomeName ?? "Golden Dawn"}
          </span>

          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15 md:w-28">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-amber-200 to-cyan-300 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-all duration-300"
              style={{ width: `${Math.round((hud?.biomeProgress ?? 0) * 100)}%` }}
            />
          </div>

          <span className="hidden text-[10px] font-medium tracking-wider text-white/40 uppercase sm:inline">
            ➔ {hud?.biomeNext ?? "Quiet Midday"}
          </span>
        </div>

        {/* Spirit veil / ghost bloom active indicator */}
        {ghostT > 0 && (
          <div className="animate-pulse flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-950/70 px-4 py-1 text-[11px] font-medium tracking-widest text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.45)] backdrop-blur-md">
            <Shield className="h-3.5 w-3.5 text-cyan-300" />
            <span>SPIRIT VEIL · {ghostT.toFixed(1)}s</span>
          </div>
        )}

        {/* Near miss popup toast */}
        {nearMissToast && (
          <div className="animate-nearmiss flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-500/25 px-3.5 py-1 text-[11px] font-medium tracking-wider text-amber-100 shadow-[0_0_25px_rgba(251,191,36,0.45)] backdrop-blur-md">
            <Zap className="h-3.5 w-3.5 fill-amber-300/30 text-amber-300" />
            <span>CLOSE CALL! +1 FIREFLY</span>
          </div>
        )}
      </div>

      {/* ================= TOP-RIGHT: Currency & Actions ================= */}
      <div className="absolute right-4 top-4 z-40 flex items-center gap-2 md:right-6 md:top-6 select-none">
        {/* Fireflies currency */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/45 px-3.5 py-2 text-amber-300 backdrop-blur-md shadow-md">
          <Sparkles className="h-4 w-4 fill-amber-300/30" />
          <span className="font-sans text-sm font-semibold tracking-wide text-amber-100 tabular-nums">
            {flies}
          </span>
        </div>

        {/* Sound toggle */}
        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? "Unmute audio (M)" : "Mute audio (M)"}
          aria-label="Toggle Sound"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/60 hover:text-white active:scale-95 cursor-pointer"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Settings button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Open Settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/60 hover:text-white active:scale-95 cursor-pointer"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* Pause button */}
        <button
          type="button"
          onClick={onPause}
          title="Pause Game (Esc or P)"
          aria-label="Pause"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/60 hover:text-white active:scale-95 cursor-pointer"
        >
          <Pause className="h-4 w-4" />
        </button>
      </div>

      {/* ================= BOTTOM-LEFT: Racing Speedometer ================= */}
      <div className="absolute bottom-5 left-4 z-40 md:bottom-6 md:left-6">
        <Speedometer speedKmh={speedKmh} maxSpeedKmh={maxSpeedKmh} />
      </div>

      {/* ================= BOTTOM-RIGHT: Ability Indicator ================= */}
      <div className="pointer-events-none absolute bottom-5 right-4 z-40 md:bottom-6 md:right-6 select-none">
        <div
          className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 backdrop-blur-md transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
            ghostT > 0
              ? "border-cyan-400/50 bg-cyan-950/60 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
              : "border-white/15 bg-black/40 text-white/50"
          }`}
        >
          <Shield
            className={`h-4 w-4 ${
              ghostT > 0 ? "text-cyan-300 fill-cyan-400/30 animate-pulse" : "text-white/40"
            }`}
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold tracking-widest uppercase">
              {ghostT > 0 ? "VEIL ACTIVE" : "SPIRIT VEIL"}
            </span>
            <span className="text-[9px] font-medium text-white/40">
              {ghostT > 0 ? `${ghostT.toFixed(1)}s remaining` : "Find Blooms"}
            </span>
          </div>
        </div>
      </div>

      {/* ================= ON-SCREEN MOBILE TOUCH CONTROLS ================= */}
      {isTouch && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex items-center justify-between px-6 md:hidden select-none">
          {/* Slide / Duck Button (Left thumb) */}
          <button
            type="button"
            aria-label="Slide"
            onTouchStart={(e) => {
              e.preventDefault();
              onSlideStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onSlideEnd();
            }}
            className="pointer-events-auto flex h-20 w-20 flex-col items-center justify-center rounded-3xl border border-white/20 bg-black/55 text-amber-200/90 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-lg transition-transform active:scale-90 active:bg-amber-500/25"
          >
            <ArrowBigDown className="h-8 w-8" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-white/80">
              SLIDE
            </span>
          </button>

          {/* Jump / Leap Button (Right thumb) */}
          <button
            type="button"
            aria-label="Jump"
            onTouchStart={(e) => {
              e.preventDefault();
              onJumpStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onJumpEnd();
            }}
            className="pointer-events-auto flex h-20 w-20 flex-col items-center justify-center rounded-3xl border border-amber-300/40 bg-amber-400/20 text-amber-100 shadow-[0_8px_32px_rgba(251,191,36,0.35)] backdrop-blur-lg transition-transform active:scale-90 active:bg-amber-300/35"
          >
            <ArrowBigUp className="h-8 w-8" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-200">
              JUMP
            </span>
          </button>
        </div>
      )}
    </>
  );
};
