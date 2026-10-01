/* Mistwood — React shell: canvas host + cinematic overlay UI */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowBigDown,
  ArrowBigUp,
  Check,
  Compass,
  Leaf,
  Lock,
  MousePointerClick,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Shield,
  Sparkles,
  Trophy,
  Trees,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { Engine } from "../game/engine";
import {
  FOX_PELTS,
  type FoxPeltId,
  type GameState,
  type HUDData,
  type Stats,
} from "../game/types";

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
  const [hud, setHud] = useState<HUDData | null>(null);
  const [nearMissToast, setNearMissToast] = useState<{ id: number; count: number } | null>(null);

  // Phase 2: Progression & Replayability state
  const [totalFlies, setTotalFlies] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const val = localStorage.getItem("mistwood_total_flies");
    return val ? parseInt(val, 10) || 0 : 0;
  });

  const [unlockedPelts, setUnlockedPelts] = useState<FoxPeltId[]>(() => {
    if (typeof window === "undefined") return ["ember"];
    try {
      const saved = localStorage.getItem("mistwood_unlocked_pelts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return ["ember"];
  });

  const [activePeltId, setActivePeltId] = useState<FoxPeltId>(() => {
    if (typeof window === "undefined") return "ember";
    const saved = localStorage.getItem("mistwood_active_pelt");
    if (saved && saved in FOX_PELTS) return saved as FoxPeltId;
    return "ember";
  });

  const [showGrove, setShowGrove] = useState(false);
  const [shareToast, setShareToast] = useState(false);

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
        // Bank collected fireflies to persistent forest essence
        setTotalFlies((prev) => {
          const next = prev + st.flies;
          try {
            localStorage.setItem("mistwood_total_flies", String(next));
          } catch {}
          return next;
        });
      },
      onToast: (id, name, line) => setToast({ id, name, line }),
      onFirstJump: () => setHintOn(false),
      onMuted: (m) => setMuted(m),
      onHUD: (h) => setHud(h),
      onNearMiss: (count) => {
        setNearMissToast({ id: Date.now(), count });
        setTimeout(() => setNearMissToast(null), 1200);
      },
    });

    eng.setPelt(FOX_PELTS[activePeltId] || FOX_PELTS.ember);
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

  // Sync pelt updates to engine
  useEffect(() => {
    if (engineRef.current && activePeltId in FOX_PELTS) {
      engineRef.current.setPelt(FOX_PELTS[activePeltId]);
    }
  }, [activePeltId]);

  // hint visibility while playing
  useEffect(() => {
    if (state !== "playing") return;
    setHintOn(true);
    const t = setTimeout(() => setHintOn(false), 6500);
    return () => clearTimeout(t);
  }, [state]);

  // Space/Enter starts a run from menus (unless modal is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && showGrove) {
        setShowGrove(false);
        return;
      }
      if (showGrove) return;
      if (e.code !== "Space" && e.code !== "Enter") return;
      const eng = engineRef.current;
      if (!eng) return;
      if (state === "menu" || state === "over") {
        e.preventDefault();
        e.stopPropagation();
        eng.start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, showGrove]);

  const start = useCallback(() => {
    setShowGrove(false);
    setHud(null);
    setNearMissToast(null);
    engineRef.current?.start();
  }, []);
  const resume = useCallback(() => engineRef.current?.togglePause(), []);
  const toMenu = useCallback(() => {
    setShowGrove(false);
    engineRef.current?.toMenu();
  }, []);
  const toggleMute = useCallback(() => {
    const eng = engineRef.current;
    if (eng) eng.setMuted(!eng.muted);
  }, []);

  const equipPelt = useCallback((peltId: FoxPeltId) => {
    setActivePeltId(peltId);
    try {
      localStorage.setItem("mistwood_active_pelt", peltId);
    } catch {}
    if (engineRef.current && peltId in FOX_PELTS) {
      engineRef.current.setPelt(FOX_PELTS[peltId]);
    }
  }, []);

  const unlockPelt = useCallback(
    (peltId: FoxPeltId) => {
      const pelt = FOX_PELTS[peltId];
      if (!pelt) return;
      if (unlockedPelts.includes(peltId)) {
        equipPelt(peltId);
        return;
      }
      if (totalFlies < pelt.cost) return;

      const nextBalance = totalFlies - pelt.cost;
      const nextUnlocked = [...unlockedPelts, peltId];

      setTotalFlies(nextBalance);
      setUnlockedPelts(nextUnlocked);
      setActivePeltId(peltId);

      try {
        localStorage.setItem("mistwood_total_flies", String(nextBalance));
        localStorage.setItem(
          "mistwood_unlocked_pelts",
          JSON.stringify(nextUnlocked),
        );
        localStorage.setItem("mistwood_active_pelt", peltId);
      } catch {}

      if (engineRef.current) {
        engineRef.current.setPelt(pelt);
      }
    },
    [totalFlies, unlockedPelts, equipPelt],
  );

  const handleShare = useCallback(() => {
    if (!stats) return;
    const shareText = `🌲 Mistwood Forest Run: ${stats.dist}m | ✨ ${stats.flies} Fireflies | ⚡ ${stats.nearMisses} Close Calls | Biome: ${stats.biomeName || "The Wilds"} 🦊 Can you outrun the mist? https://saif-alsaad.github.io/MistWood-/`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          setShareToast(true);
          setTimeout(() => setShareToast(false), 2400);
        })
        .catch(() => {});
    }
  }, [stats]);

  const playing = state === "playing" || state === "dying";


  return (
    <div className="relative h-full w-full overflow-hidden bg-[#05070b]">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* vignette-safe readable gradient for menus */}
      {(state === "menu" || state === "over" || state === "paused") && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />
      )}

      {/* ---------- glassmorphic in-game HUD ---------- */}
      {playing && (
        <>
          {/* Top-left: Distance, Fireflies, Close Calls */}
          <div className="pointer-events-none absolute left-4 top-4 z-40 flex flex-col gap-1.5 md:left-6 md:top-6">
            <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md">
              <span className="font-display text-2xl tracking-wider text-amber-50 md:text-3xl">
                {hud?.dist ?? 0}
              </span>
              <span className="text-[11px] font-light tracking-widest text-amber-200/70 uppercase">
                m
              </span>
              <span className="mx-0.5 h-3.5 w-px bg-white/20" />
              <div className="flex items-center gap-1.5 text-amber-300">
                <Sparkles className="h-3.5 w-3.5 fill-amber-300/30" />
                <span className="font-sans text-xs font-medium tracking-wide text-amber-100">
                  {hud?.flies ?? 0}
                </span>
              </div>
              {hud && hud.nearMissCount > 0 && (
                <>
                  <span className="mx-0.5 h-3.5 w-px bg-white/20" />
                  <div className="flex items-center gap-1 text-emerald-300">
                    <Zap className="h-3.5 w-3.5 fill-emerald-300/30" />
                    <span className="text-[11px] font-medium text-emerald-200">
                      {hud.nearMissCount}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Top-center: Biome Journey Progress Tracker */}
          <div className="pointer-events-none absolute left-1/2 top-4 z-40 flex -translate-x-1/2 flex-col items-center gap-1.5 md:top-6">
            <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/35 px-4 py-1.5 backdrop-blur-md shadow-md">
              <Compass className="h-3.5 w-3.5 text-amber-200/80" />
              <span className="text-[11px] font-medium tracking-[0.25em] text-white/90 uppercase">
                {hud?.biomeName ?? "Golden Dawn"}
              </span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15 md:w-28">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-all duration-300"
                  style={{ width: `${Math.round((hud?.biomeProgress ?? 0) * 100)}%` }}
                />
              </div>
              <span className="hidden text-[10px] font-light tracking-wider text-white/45 uppercase sm:inline">
                ➔ {hud?.biomeNext ?? "Quiet Midday"}
              </span>
            </div>

            {/* Spirit veil / ghost bloom active indicator */}
            {hud && hud.ghostT > 0 && (
              <div className="animate-pulse flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-950/60 px-3.5 py-1 text-[11px] font-medium tracking-widest text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.35)] backdrop-blur-md">
                <Shield className="h-3.5 w-3.5 text-cyan-300" />
                <span>Spirit Veil · {hud.ghostT.toFixed(1)}s</span>
              </div>
            )}

            {/* Near miss popup toast */}
            {nearMissToast && (
              <div className="animate-nearmiss flex items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-500/25 px-3.5 py-1 text-[11px] font-medium tracking-wider text-amber-100 shadow-[0_0_25px_rgba(251,191,36,0.45)] backdrop-blur-md">
                <Zap className="h-3.5 w-3.5 fill-amber-300/30 text-amber-300" />
                <span>Close Call! +1 Firefly</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------- on-screen mobile touch controls ---------- */}
      {playing && isTouch && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex items-center justify-between px-6 md:hidden">
          {/* Slide / Duck Button (Left thumb) */}
          <button
            type="button"
            aria-label="Slide"
            onTouchStart={(e) => {
              e.preventDefault();
              engineRef.current?.slideStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              engineRef.current?.slideEnd();
            }}
            className="pointer-events-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border border-white/20 bg-black/45 text-amber-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-lg transition-transform active:scale-90 active:bg-amber-500/20"
          >
            <ArrowBigDown className="h-8 w-8" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-white/70">
              Slide
            </span>
          </button>

          {/* Jump / Leap Button (Right thumb) */}
          <button
            type="button"
            aria-label="Jump"
            onTouchStart={(e) => {
              e.preventDefault();
              engineRef.current?.jump();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              engineRef.current?.releaseJump();
            }}
            className="pointer-events-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 text-amber-100 shadow-[0_8px_30px_rgba(251,191,36,0.25)] backdrop-blur-lg transition-transform active:scale-90 active:bg-amber-300/30"
          >
            <ArrowBigUp className="h-8 w-8" />
            <span className="text-[10px] font-medium tracking-widest uppercase text-amber-200">
              Jump
            </span>
          </button>
        </div>
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

          <div className="fade-up fade-up-4 mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={start}
              className="group flex items-center gap-3 rounded-full bg-amber-100/95 px-9 py-4 text-[13px] font-medium uppercase tracking-[0.25em] text-stone-900 shadow-[0_8px_40px_-8px_rgba(255,210,122,0.45)] transition-all duration-300 hover:scale-[1.05] hover:bg-white hover:shadow-[0_8px_50px_-6px_rgba(255,220,150,0.6)] active:scale-95 cursor-pointer"
            >
              <Play className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              Begin the run
            </button>

            <button
              onClick={() => setShowGrove(true)}
              className="flex items-center gap-2.5 rounded-full border border-amber-300/35 bg-black/45 px-7 py-4 text-[12px] font-medium uppercase tracking-[0.2em] text-amber-200/90 shadow-[0_4px_25px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:scale-[1.04] hover:border-amber-300/60 hover:bg-amber-950/30 active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 fill-amber-300/30 text-amber-300" />
              Grove Shrine
              <span className="ml-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100 border border-amber-300/30">
                {totalFlies} ✨
              </span>
            </button>
          </div>

          <div className="fade-up fade-up-4 mt-8 flex flex-wrap items-center justify-center gap-2.5">
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
              className="flex items-center gap-3 rounded-full bg-amber-100/95 px-8 py-3.5 text-[12px] font-medium uppercase tracking-[0.25em] text-stone-900 transition-all duration-300 hover:scale-105 hover:bg-white active:scale-95 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
            <button
              onClick={start}
              className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-[12px] font-light uppercase tracking-[0.25em] text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Restart
            </button>
          </div>
        </div>
      )}

      {/* ---------- game over: Phase 2 Run Summary ---------- */}
      {state === "over" && stats && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 py-6 text-center overflow-y-auto">
          <div className="fade-up flex items-center gap-2 text-amber-200/60">
            <Leaf className="h-4 w-4" />
            <span className="text-[11px] font-light uppercase tracking-[0.5em]">
              {deathLine}
            </span>
          </div>

          <div className="fade-up fade-up-1 font-display mt-4 text-6xl leading-none text-white/95 md:text-7xl">
            {stats.dist}
            <span className="ml-2 text-2xl text-white/50 md:text-3xl">m</span>
          </div>

          {/* Personal Best comparison bar */}
          <div className="fade-up fade-up-2 mt-5 w-full max-w-md rounded-2xl border border-white/15 bg-black/45 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium tracking-wider text-white/80 uppercase">
                {stats.newBest ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" /> New Personal Best!
                  </span>
                ) : (
                  <span>Run vs Personal Best</span>
                )}
              </span>
              <span className="font-semibold text-amber-200">
                {stats.dist}m / {stats.best}m ({Math.min(100, Math.round((stats.dist / (stats.best || 1)) * 100))}%)
              </span>
            </div>

            {/* Visual PB Progress Bar */}
            <div className="relative mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`relative h-full rounded-full transition-all duration-1000 ease-out overflow-hidden ${
                  stats.newBest
                    ? "bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400 shadow-[0_0_15px_rgba(251,191,36,0.7)]"
                    : "bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, Math.round((stats.dist / (stats.best || 1)) * 100)))}%`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine" />
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
              <span>This Run: {stats.dist}m</span>
              <span>
                {stats.newBest
                  ? "Record surpassed!"
                  : `${Math.max(0, stats.best - stats.dist)}m to beat record`}
              </span>
            </div>
          </div>

          {/* Stats breakdown grid */}
          <div className="fade-up fade-up-2 mt-3.5 grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-sm">
              <span className="text-[10px] font-light tracking-wider uppercase text-white/45">
                Banked
              </span>
              <div className="mt-0.5 flex items-center gap-1 text-amber-300">
                <Sparkles className="h-3 w-3" />
                <span className="text-xs font-semibold">+{stats.flies}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-sm">
              <span className="text-[10px] font-light tracking-wider uppercase text-white/45">
                Deepest Biome
              </span>
              <span className="mt-0.5 truncate text-xs font-medium text-white/80 max-w-[85px]">
                {stats.biomeName || "Dawn"}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-sm">
              <span className="text-[10px] font-light tracking-wider uppercase text-white/45">
                Peak Velocity
              </span>
              <span className="mt-0.5 text-xs font-medium text-cyan-200">
                {stats.maxSpeed || 340} px/s
              </span>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-sm">
              <span className="text-[10px] font-light tracking-wider uppercase text-white/45">
                Close Calls
              </span>
              <div className="mt-0.5 flex items-center gap-1 text-emerald-300">
                <Zap className="h-3 w-3" />
                <span className="text-xs font-medium">{stats.nearMisses}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="fade-up fade-up-3 mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={start}
              className="group flex items-center gap-2.5 rounded-full bg-amber-100/95 px-7 py-3.5 text-[12px] font-medium uppercase tracking-[0.25em] text-stone-900 shadow-[0_8px_40px_-8px_rgba(255,210,122,0.45)] transition-all duration-300 hover:scale-[1.05] hover:bg-white active:scale-95 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-180" />
              Run again
            </button>

            <button
              onClick={() => setShowGrove(true)}
              className="flex items-center gap-2 rounded-full border border-amber-300/35 bg-amber-400/10 px-5 py-3.5 text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-amber-300/20 active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Grove Shrine
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-[11px] font-light uppercase tracking-[0.2em] text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>

            <button
              onClick={toMenu}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-[11px] font-light uppercase tracking-[0.2em] text-white/60 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-white/10 active:scale-95 cursor-pointer"
            >
              <Trees className="h-3.5 w-3.5" />
              Menu
            </button>
          </div>

          <p className="fade-up fade-up-4 mt-5 text-[11px] font-light tracking-[0.3em] text-white/40 uppercase">
            Space or Tap to run again
          </p>
        </div>
      )}

      {/* ---------- Phase 2: Grove Shrine Modal ---------- */}
      {showGrove && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowGrove(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-amber-300/25 bg-[#090e17]/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2 text-amber-200/80">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-[11px] font-light tracking-[0.3em] uppercase">
                    Sacred Wardrobe
                  </span>
                </div>
                <h2 className="font-display mt-1 text-2xl tracking-[0.1em] text-white sm:text-3xl">
                  THE GROVE SHRINE
                </h2>
                <p className="mt-1 text-xs font-light text-white/50">
                  Commune with ancient spirits and attune your fox to sacred forms.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3.5 py-1.5 text-amber-200 backdrop-blur-md">
                  <Sparkles className="h-4 w-4 fill-amber-300/40 text-amber-300" />
                  <span className="font-sans text-sm font-semibold tracking-wide">
                    {totalFlies}
                  </span>
                  <span className="text-[10px] tracking-wider text-amber-200/70 uppercase">
                    Essence
                  </span>
                </div>
                <button
                  onClick={() => setShowGrove(false)}
                  aria-label="Close Grove Shrine"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:bg-white/15 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Pelts Grid */}
            <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {Object.values(FOX_PELTS).map((pelt) => {
                const isUnlocked = unlockedPelts.includes(pelt.id);
                const isActive = activePeltId === pelt.id;
                const canAfford = totalFlies >= pelt.cost;

                return (
                  <div
                    key={pelt.id}
                    className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 ${
                      isActive
                        ? "border-amber-400/50 bg-amber-950/20 shadow-[0_0_30px_rgba(251,191,36,0.12)]"
                        : isUnlocked
                        ? "border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
                        : "border-white/10 bg-black/40 opacity-80"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Preview Orb */}
                      <div
                        className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 shadow-inner"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${pelt.colors.bodyLight}, ${pelt.colors.body})`,
                        }}
                      >
                        {/* Tail Accent tip preview */}
                        <span
                          className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border border-black/40"
                          style={{ background: pelt.colors.accent }}
                        />
                        {/* Glowing Spirit Eye */}
                        <span
                          className="h-2 w-2 rounded-full shadow-lg"
                          style={{
                            background: pelt.eyeColor,
                            boxShadow: `0 0 10px 2px ${pelt.eyeColor}`,
                          }}
                        />
                        {isActive && (
                          <span className="absolute -inset-1 rounded-2xl border border-amber-300/40 animate-pulse pointer-events-none" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-display truncate text-sm tracking-wide text-white">
                            {pelt.name}
                          </h3>
                          {isActive && (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-medium text-emerald-300 border border-emerald-400/30">
                              <Check className="h-2.5 w-2.5" /> Attuned
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] font-light leading-relaxed text-white/55">
                          {pelt.desc}
                        </p>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="text-xs">
                        {isUnlocked ? (
                          <span className="text-[10px] font-light text-emerald-300/80 uppercase tracking-wider">
                            Unlocked
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-300">
                            <Sparkles className="h-3 w-3" />
                            <span className="text-xs font-medium">{pelt.cost} Essence</span>
                          </div>
                        )}
                      </div>

                      <div>
                        {isActive ? (
                          <span className="text-[10px] font-light tracking-wider uppercase text-amber-200/70">
                            Active
                          </span>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => equipPelt(pelt.id)}
                            className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-white transition-all hover:bg-white hover:text-stone-900 active:scale-95 cursor-pointer"
                          >
                            Attune
                          </button>
                        ) : (
                          <button
                            disabled={!canAfford}
                            onClick={() => unlockPelt(pelt.id)}
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-all ${
                              canAfford
                                ? "bg-amber-300 text-stone-950 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:scale-105 hover:bg-white active:scale-95 cursor-pointer"
                                : "border border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
                            }`}
                          >
                            {canAfford ? (
                              <>
                                <Sparkles className="h-3 w-3 fill-current" />
                                Awaken
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Need {pelt.cost - totalFlies}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shrine lore footnote */}
            <div className="mt-5 text-center text-[11px] font-light tracking-wider text-white/35">
              Fireflies absorbed during your runs are permanently consecrated to your spirit.
            </div>
          </div>
        </div>
      )}

      {/* ---------- Share toast ---------- */}
      {shareToast && (
        <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-950/90 px-5 py-2.5 text-xs font-medium text-emerald-200 shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>Run recap copied to clipboard! 🦊</span>
        </div>
      )}
    </div>
  );
}

