/* Mistwood — React shell: canvas host + cinematic overlay UI */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowBigDown,
  ArrowBigUp,
  Leaf,
  MousePointerClick,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Trees,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Engine } from "../game/engine";
import type { GameState, Stats } from "../game/types";

const DEATH_LINES = [
  "The forest keeps its secrets.",
  "The old stones caught your stride.",
  "The thorns were patient. You were swift.",
  "Even the cleverest fox must rest.",
];

export default function MistwoodGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [state, setState] = useState<GameState>("loading");
  const [stats, setStats] = useState<Stats | null>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{ id: number; name: string; line: string } | null>(null);
  const [hintOn, setHintOn] = useState(false);
  const [best, setBest] = useState(0);

  const isTouch = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    [],
  );

  const deathLine = useMemo(
    () => (stats ? DEATH_LINES[stats.dist % DEATH_LINES.length] : ""),
    [stats],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const eng = new Engine(canvas, {
      onState: (s) => {
        setState(s);
        if (s === "playing") setBest(eng.best);
        if (s === "menu") setBest(eng.best);
      },
      onGameOver: (st) => {
        setStats(st);
        setBest(st.best);
      },
      onToast: (id, name, line) => setToast({ id, name, line }),
      onFirstJump: () => setHintOn(false),
      onMuted: (m) => setMuted(m),
    });
    engineRef.current = eng;
    let alive = true;
    eng.init().then(() => {
      if (!alive) return;
      setBest(eng.best);
    });
    return () => {
      alive = false;
      eng.dispose();
    };
  }, []);

  // hint visibility while playing
  useEffect(() => {
    if (state !== "playing") return;
    setHintOn(true);
    const t = setTimeout(() => setHintOn(false), 6500);
    return () => clearTimeout(t);
  }, [state]);

  // Space/Enter starts a run from menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.code !== "Enter") return;
      const eng = engineRef.current;
      if (!eng) return;
      if (state === "menu" || state === "over") {
        e.preventDefault();
        eng.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  const start = useCallback(() => engineRef.current?.start(), []);
  const resume = useCallback(() => engineRef.current?.togglePause(), []);
  const toMenu = useCallback(() => engineRef.current?.toMenu(), []);
  const toggleMute = useCallback(() => {
    const eng = engineRef.current;
    if (eng) eng.setMuted(!eng.muted);
  }, []);

  const playing = state === "playing" || state === "dying";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070b]">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* vignette-safe readable gradient for menus */}
      {(state === "menu" || state === "over" || state === "paused") && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />
      )}

      {/* ---------- top-right utility buttons ---------- */}
      {state !== "loading" && (
        <div className="absolute right-4 top-4 z-40 flex gap-2.5 md:right-6 md:top-6">
          {playing && (
            <button
              onClick={resume}
              aria-label="Pause"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/40"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={toggleMute}
            aria-label="Toggle sound"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/25 text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/40"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* ---------- biome toast ---------- */}
      {toast && playing && (
        <div
          key={toast.id}
          className="animate-toast pointer-events-none absolute left-1/2 top-12 z-30 -translate-x-1/2 text-center md:top-16"
        >
          <div className="font-display text-base uppercase tracking-[0.45em] text-white/90 md:text-lg">
            {toast.name}
          </div>
          <div className="mt-1.5 text-[11px] font-light tracking-[0.3em] text-white/50 uppercase">
            {toast.line}
          </div>
        </div>
      )}

      {/* ---------- controls hint (first run) ---------- */}
      {playing && hintOn && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3">
          {isTouch ? (
            <div className="hint-drift flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-5 py-2.5 text-xs font-light tracking-widest text-white/75 backdrop-blur-md">
              <MousePointerClick className="h-3.5 w-3.5 text-amber-200/80" />
              Tap to jump ×2 · swipe down to slide
            </div>
          ) : (
            <div className="hint-drift flex items-center gap-2.5 rounded-full border border-white/10 bg-black/30 px-5 py-2.5 text-xs font-light tracking-widest text-white/75 backdrop-blur-md">
              <ArrowBigUp className="h-3.5 w-3.5 text-amber-200/80" />
              Space to jump ×2
              <span className="text-white/30">·</span>
              <ArrowBigDown className="h-3.5 w-3.5 text-amber-200/80" />
              S to slide
            </div>
          )}
        </div>
      )}

      {/* ---------- loading ---------- */}
      {state === "loading" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#05070b]">
          <div className="pulse-soft mb-8 h-3 w-3 rounded-full bg-amber-200 shadow-[0_0_34px_10px_rgba(255,210,122,0.35)]" />
          <div className="font-display text-sm uppercase tracking-[0.6em] text-white/50">
            Mistwood
          </div>
          <div className="mt-3 text-[11px] font-light tracking-[0.3em] text-white/30 uppercase">
            Waking the forest…
          </div>
        </div>
      )}

      {/* ---------- main menu ---------- */}
      {state === "menu" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <div className="fade-up fade-up-1 flex items-center gap-2 text-amber-200/70">
            <Trees className="h-4 w-4" />
            <span className="text-[11px] font-light uppercase tracking-[0.55em]">
              An endless forest run
            </span>
          </div>

          <h1 className="fade-up fade-up-2 font-display mt-5 bg-gradient-to-b from-amber-50 via-amber-100 to-teal-200/60 bg-clip-text text-[19vw] leading-none tracking-[0.1em] text-transparent drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)] sm:text-7xl md:text-8xl">
            MISTWOOD
          </h1>

          <div className="fade-up fade-up-2 mt-6 flex items-center gap-3">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-200/50" />
            <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_12px_3px_rgba(255,210,122,0.5)]" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-200/50" />
          </div>

          <p className="fade-up fade-up-3 mt-6 max-w-md text-sm font-light leading-relaxed tracking-wide text-white/60">
            Guide a wild fox through a waking forest. Leap the old stones, slip
            beneath the hanging thorns, and follow the fireflies into the dark.
          </p>

          <button
            onClick={start}
            className="fade-up fade-up-4 group mt-10 flex items-center gap-3 rounded-full bg-amber-100/95 px-9 py-4 text-[13px] font-medium uppercase tracking-[0.25em] text-stone-900 shadow-[0_8px_40px_-8px_rgba(255,210,122,0.45)] transition-all duration-300 hover:scale-[1.05] hover:bg-white hover:shadow-[0_8px_50px_-6px_rgba(255,220,150,0.6)] active:scale-95"
          >
            <Play className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            Begin the run
          </button>

          <div className="fade-up fade-up-4 mt-9 flex flex-wrap items-center justify-center gap-2.5">
            {isTouch ? (
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-light tracking-widest text-white/55 backdrop-blur-sm">
                <MousePointerClick className="h-3.5 w-3.5 text-white/40" />
                Tap — jump ×2 · Swipe down — slide
              </span>
            ) : (
              <>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-light tracking-widest text-white/55 backdrop-blur-sm">
                  <ArrowBigUp className="h-3.5 w-3.5 text-white/40" />
                  Space — jump ×2
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-light tracking-widest text-white/55 backdrop-blur-sm">
                  <ArrowBigDown className="h-3.5 w-3.5 text-white/40" />
                  S — slide · fast-fall
                </span>
              </>
            )}
            {best > 0 && (
              <span className="flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-100/10 px-4 py-2 text-[11px] font-light tracking-widest text-amber-100/80 backdrop-blur-sm">
                <Trophy className="h-3.5 w-3.5" />
                Best — {best} m
              </span>
            )}
          </div>

          <p className="fade-up fade-up-4 absolute bottom-6 text-[10px] font-light uppercase tracking-[0.35em] text-white/25">
            Headphones on · the forest sings
          </p>
        </div>
      )}

      {/* ---------- paused ---------- */}
      {state === "paused" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[6px]">
          <div className="fade-up font-display text-3xl uppercase tracking-[0.5em] text-white/90 md:text-4xl">
            Paused
          </div>
          <div className="fade-up fade-up-1 mt-3 text-xs font-light tracking-[0.3em] text-white/45 uppercase">
            The forest waits for you
          </div>
          <div className="fade-up fade-up-2 mt-10 flex items-center gap-4">
            <button
              onClick={resume}
              className="flex items-center gap-3 rounded-full bg-amber-100/95 px-8 py-3.5 text-[12px] font-medium uppercase tracking-[0.25em] text-stone-900 transition-all duration-300 hover:scale-105 hover:bg-white active:scale-95"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
            <button
              onClick={start}
              className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-[12px] font-light uppercase tracking-[0.25em] text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
          </div>
        </div>
      )}

      {/* ---------- game over ---------- */}
      {state === "over" && stats && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <div className="fade-up flex items-center gap-2 text-amber-200/60">
            <Leaf className="h-4 w-4" />
            <span className="text-[11px] font-light uppercase tracking-[0.5em]">
              {deathLine}
            </span>
          </div>

          <div className="fade-up fade-up-1 font-display mt-6 text-7xl leading-none text-white/95 md:text-8xl">
            {stats.dist}
            <span className="ml-2 text-3xl text-white/50 md:text-4xl">m</span>
          </div>

          <div className="fade-up fade-up-2 mt-7 flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-light tracking-widest text-white/70 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-200/80" />
              {stats.flies} fireflies
            </span>
            <span
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] font-light tracking-widest backdrop-blur-sm ${
                stats.newBest
                  ? "newbest-glow border-amber-200/40 bg-amber-100/15 text-amber-100"
                  : "border-white/10 bg-white/5 text-white/70"
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-amber-200/80" />
              {stats.newBest ? "New best!" : `Best ${stats.best} m`}
            </span>
          </div>

          <div className="fade-up fade-up-3 mt-10 flex items-center gap-4">
            <button
              onClick={start}
              className="group flex items-center gap-3 rounded-full bg-amber-100/95 px-9 py-4 text-[13px] font-medium uppercase tracking-[0.25em] text-stone-900 shadow-[0_8px_40px_-8px_rgba(255,210,122,0.45)] transition-all duration-300 hover:scale-[1.05] hover:bg-white active:scale-95"
            >
              <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
              Run again
            </button>
            <button
              onClick={toMenu}
              className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-[12px] font-light uppercase tracking-[0.25em] text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 active:scale-95"
            >
              <Trees className="h-4 w-4" />
              The grove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
