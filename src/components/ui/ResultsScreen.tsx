import React from "react";
import {
  Compass,
  Gauge,
  Leaf,
  RotateCcw,
  Share2,
  Sparkles,
  Trees,
  Trophy,
  Zap,
} from "lucide-react";
import type { Stats } from "../../game/types";

interface ResultsScreenProps {
  stats: Stats;
  onRestart: () => void;
  onOpenGarage: () => void;
  onMainMenu: () => void;
  onShare: () => void;
  onHover?: () => void;
  onClickSound?: () => void;
}

const DEATH_EPITAPHS = [
  "The forest keeps its secrets.",
  "The ancient stones broke your stride.",
  "The briars were patient; you were swift.",
  "Even the fastest spirit must find rest.",
  "Shadows stretch across the path.",
];

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  stats,
  onRestart,
  onOpenGarage,
  onMainMenu,
  onShare,
  onHover,
  onClickSound,
}) => {
  const epitaph = DEATH_EPITAPHS[stats.dist % DEATH_EPITAPHS.length];
  const pbRatio = Math.min(100, Math.round((stats.dist / (stats.best || 1)) * 100));

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center overflow-y-auto select-none animate-fade-in">
      {/* Epitaph */}
      <div className="fade-up flex items-center gap-2 text-amber-200/70">
        <Leaf className="h-4 w-4" />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.45em]">
          {epitaph}
        </span>
      </div>

      {/* Main Distance Readout */}
      <div className="fade-up fade-up-1 font-hud mt-3 text-6xl font-bold tracking-tight text-white md:text-7xl tabular-nums">
        {stats.dist}
        <span className="font-game ml-2 text-2xl font-light text-white/50 md:text-3xl">m</span>
      </div>

      {/* Personal Best Progress Card */}
      <div className="fade-up fade-up-2 mt-4 w-full max-w-md rounded-3xl border border-white/15 bg-black/50 p-4.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs">
          <div className="font-game flex items-center gap-1.5 font-bold tracking-wider uppercase">
            {stats.newBest ? (
              <span className="flex items-center gap-1.5 text-amber-300">
                <Trophy className="h-4 w-4 text-amber-300 animate-bounce" />
                NEW RECORD!
              </span>
            ) : (
              <span className="text-white/70">DISTANCE VS RECORD</span>
            )}
          </div>
          <span className="font-hud font-bold text-amber-200 tabular-nums">
            {stats.dist}m / {stats.best}m ({pbRatio}%)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="relative mt-2.5 h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`relative h-full rounded-full transition-all duration-1000 ease-out overflow-hidden ${
              stats.newBest
                ? "bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400 shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                : "bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
            }`}
            style={{ width: `${Math.max(6, pbRatio)}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shine" />
          </div>
        </div>

        <div className="font-game mt-2 flex items-center justify-between text-[11px] font-semibold text-white/50">
          <span>RUN: <span className="font-hud">{stats.dist}</span>m</span>
          <span>
            {stats.newBest
              ? "ALL-TIME BEST SURPASSED!"
              : `${Math.max(0, stats.best - stats.dist)}m to beat record`}
          </span>
        </div>
      </div>

      {/* 4-Stat Racing Recap Grid */}
      <div className="fade-up fade-up-3 mt-3.5 grid w-full max-w-md grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Fireflies Collected */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
          <span className="font-game text-[10px] font-bold tracking-wider uppercase text-white/40">
            Banked
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-amber-300">
            <Sparkles className="h-3.5 w-3.5 fill-amber-300/30" />
            <span className="font-hud text-sm font-bold tabular-nums">+{stats.flies}</span>
          </div>
        </div>

        {/* Peak Velocity */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
          <span className="font-game text-[10px] font-bold tracking-wider uppercase text-white/40">
            Top Speed
          </span>
          <div className="mt-1 flex items-center gap-1 text-cyan-300">
            <Gauge className="h-3.5 w-3.5" />
            <span className="font-hud text-sm font-bold tabular-nums">
              {stats.maxSpeedKmh} <span className="font-game text-[9px]">KM/H</span>
            </span>
          </div>
        </div>

        {/* Close Calls */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
          <span className="font-game text-[10px] font-bold tracking-wider uppercase text-white/40">
            Near Misses
          </span>
          <div className="mt-1 flex items-center gap-1 text-emerald-300">
            <Zap className="h-3.5 w-3.5 fill-emerald-300/30" />
            <span className="font-hud text-sm font-bold tabular-nums">{stats.nearMisses}</span>
          </div>
        </div>

        {/* Deepest Biome */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
          <span className="font-game text-[10px] font-bold tracking-wider uppercase text-white/40">
            Biome
          </span>
          <div className="mt-1 flex items-center gap-1 text-white/80">
            <Compass className="h-3.5 w-3.5 text-amber-200/70" />
            <span className="font-display text-xs font-bold truncate max-w-[80px]">
              {stats.biomeName || "Dawn"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="fade-up fade-up-4 mt-6 flex flex-wrap items-center justify-center gap-3">
        {/* Run Again */}
        <button
          type="button"
          onClick={() => {
            onClickSound?.();
            onRestart();
          }}
          onMouseEnter={onHover}
          className="group flex items-center gap-2.5 rounded-2xl bg-amber-100 px-7 py-3.5 font-game text-xs font-bold tracking-[0.2em] text-stone-950 uppercase shadow-[0_8px_30px_rgba(255,210,122,0.4)] transition-all duration-300 hover:scale-105 hover:bg-white active:scale-95 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
          RUN AGAIN
        </button>

        {/* Garage */}
        <button
          type="button"
          onClick={() => {
            onClickSound?.();
            onOpenGarage();
          }}
          onMouseEnter={onHover}
          className="flex items-center gap-2 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-5 py-3.5 font-game text-xs font-bold tracking-wider text-amber-200 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-amber-300/20 active:scale-95 cursor-pointer"
        >
          <Sparkles className="h-4 w-4 fill-amber-300/30 text-amber-300" />
          GARAGE
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() => {
            onClickSound?.();
            onShare();
          }}
          onMouseEnter={onHover}
          className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3.5 font-game text-xs font-bold tracking-wider text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 active:scale-95 cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          SHARE
        </button>

        {/* Main Menu */}
        <button
          type="button"
          onClick={() => {
            onClickSound?.();
            onMainMenu();
          }}
          onMouseEnter={onHover}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-transparent px-5 py-3.5 font-game text-xs font-bold tracking-wider text-white/60 uppercase transition-all duration-300 hover:scale-105 hover:bg-white/5 hover:text-white active:scale-95 cursor-pointer"
        >
          <Trees className="h-4 w-4" />
          MENU
        </button>
      </div>

      <p className="font-game fade-up fade-up-4 mt-5 text-[10px] font-bold tracking-[0.25em] text-white/40 uppercase">
        SPACE OR TAP TO RUN AGAIN
      </p>
    </div>
  );
};
