import React from "react";
import {
  Play,
  RotateCcw,
  Settings,
  Trees,
} from "lucide-react";
import type { HUDData } from "../../game/types";

interface PauseMenuProps {
  hud: HUDData | null;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
  onHover?: () => void;
  onClickSound?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  hud,
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
  onHover,
  onClickSound,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md select-none animate-fade-in">
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/15 bg-[#090e17]/95 p-6 text-center shadow-[0_20px_70px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        <h2 className="font-display text-2xl font-bold tracking-[0.25em] text-white uppercase">
          PAUSED
        </h2>
        <p className="font-game mt-1 text-[11px] font-semibold tracking-widest text-white/50 uppercase">
          The forest holds its breath
        </p>

        {/* Current Run Snapshot */}
        {hud && (
          <div className="mt-5 grid w-full grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left">
            <div>
              <span className="font-game text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Distance
              </span>
              <div className="font-hud text-sm font-bold text-white tabular-nums">
                {hud.dist} <span className="font-game text-xs text-white/60">m</span>
              </div>
            </div>
            <div>
              <span className="font-game text-[10px] font-bold text-white/40 uppercase tracking-wider">
                Velocity
              </span>
              <div className="font-hud text-sm font-bold text-cyan-200 tabular-nums">
                {hud.speedKmh} <span className="font-game text-xs text-cyan-300/70">KM/H</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons List */}
        <div className="mt-5 flex w-full flex-col gap-2.5">
          {/* Resume */}
          <button
            type="button"
            onClick={() => {
              onClickSound?.();
              onResume();
            }}
            onMouseEnter={onHover}
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-amber-100 py-3 font-game text-xs font-bold tracking-widest text-stone-950 uppercase shadow-[0_4px_20px_rgba(255,210,122,0.35)] transition-all hover:scale-[1.02] hover:bg-white active:scale-95 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-stone-950" />
            RESUME
          </button>

          {/* Restart */}
          <button
            type="button"
            onClick={() => {
              onClickSound?.();
              onRestart();
            }}
            onMouseEnter={onHover}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/5 py-3 font-game text-xs font-bold tracking-wider text-white uppercase transition-all hover:bg-white/15 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            RESTART RUN
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => {
              onClickSound?.();
              onOpenSettings();
            }}
            onMouseEnter={onHover}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 font-game text-xs font-bold tracking-wider text-white/80 uppercase transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
          >
            <Settings className="h-4 w-4" />
            SETTINGS
          </button>

          {/* Main Menu */}
          <button
            type="button"
            onClick={() => {
              onClickSound?.();
              onMainMenu();
            }}
            onMouseEnter={onHover}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-transparent py-2.5 font-game text-xs font-bold tracking-wider text-white/60 uppercase transition-all hover:bg-white/5 hover:text-white active:scale-95 cursor-pointer"
          >
            <Trees className="h-4 w-4" />
            MAIN MENU
          </button>
        </div>

        <span className="font-game mt-4 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
          ESC or P to Resume
        </span>
      </div>
    </div>
  );
};
