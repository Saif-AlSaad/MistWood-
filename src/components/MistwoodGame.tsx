/* Mistwood — React shell: canvas host + cinematic racing UI */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Engine } from "../game/engine";
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type GameSettings,
  type GameState,
  type HUDData,
  type Stats,
} from "../game/types";
import { ANIMALS, mapLegacyPeltId, type AnimalId } from "../game/animals";
import { GameHUD } from "./ui/GameHUD";
import { MainMenu } from "./ui/MainMenu";
import { PauseMenu } from "./ui/PauseMenu";
import { ResultsScreen } from "./ui/ResultsScreen";
import { Garage } from "./ui/Garage";
import { SettingsModal } from "./ui/SettingsModal";
import { ToastNotification } from "./ui/ToastNotification";
import { OrientationPrompt } from "./ui/OrientationPrompt";

export default function MistwoodGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  const [state, setState] = useState<GameState>("loading");
  const [stats, setStats] = useState<Stats | null>(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<{ id: number; name: string; line: string } | null>(null);
  const [best, setBest] = useState(0);
  const [hud, setHud] = useState<HUDData | null>(null);
  const [nearMissToast, setNearMissToast] = useState<{ id: number; count: number } | null>(null);

  // Settings State with LocalStorage persistence
  const [settings, setSettings] = useState<GameSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_SETTINGS;
  });

  // Progression & Animals
  const [totalFlies, setTotalFlies] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const val = localStorage.getItem("mistwood_total_flies");
    return val ? parseInt(val, 10) || 0 : 0;
  });

  const [unlockedAnimals, setUnlockedAnimals] = useState<AnimalId[]>(() => {
    if (typeof window === "undefined") return ["fox"];
    try {
      const saved =
        localStorage.getItem("mistwood_unlocked_animals") ||
        localStorage.getItem("mistwood_unlocked_pelts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const mapped = parsed.map((p) => mapLegacyPeltId(p));
          if (!mapped.includes("fox")) mapped.push("fox");
          return mapped;
        }
      }
    } catch {}
    return ["fox"];
  });

  const [activeAnimalId, setActiveAnimalId] = useState<AnimalId>(() => {
    if (typeof window === "undefined") return "fox";
    const saved =
      localStorage.getItem("mistwood_active_animal") ||
      localStorage.getItem("mistwood_active_pelt");
    if (saved) return mapLegacyPeltId(saved);
    return "fox";
  });

  // Modal Overlays
  const [showGarage, setShowGarage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const isTouch = useMemo(
    () =>
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    [],
  );

  // Screen Orientation State
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerHeight > window.innerWidth;
  });
  const [dismissedPortrait, setDismissedPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  const activeAnimal = ANIMALS[activeAnimalId] || ANIMALS.fox;

  // Sound triggers
  const playHover = useCallback(() => {
    engineRef.current?.getAudio().uiHover();
  }, []);

  const playClick = useCallback(() => {
    engineRef.current?.getAudio().uiClick();
  }, []);

  // Update Settings handler
  const handleUpdateSettings = useCallback((updates: Partial<GameSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      engineRef.current?.applySettings(next);
      return next;
    });
  }, []);

  // Engine Lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const eng = new Engine(canvas, {
      onState: (s) => {
        setState(s);
        if (s === "playing" || s === "menu") setBest(eng.best);
      },
      onGameOver: (st) => {
        setStats(st);
        setBest(st.best);
        if (st.newBest) {
          eng.getAudio().newRecord();
        }
        setTotalFlies((prev) => {
          const next = prev + st.flies;
          try {
            localStorage.setItem("mistwood_total_flies", String(next));
          } catch {}
          return next;
        });
      },
      onToast: (id, name, line) => setToast({ id, name, line }),
      onFirstJump: () => {},
      onMuted: (m) => setMuted(m),
      onHUD: (h) => setHud(h),
      onNearMiss: (count) => {
        setNearMissToast({ id: Date.now(), count });
        setTimeout(() => setNearMissToast(null), 1200);
      },
    });

    eng.setAnimal(ANIMALS[activeAnimalId] || ANIMALS.fox);
    eng.applySettings(settings);
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

  // Sync animal updates to engine
  useEffect(() => {
    if (engineRef.current && activeAnimalId in ANIMALS) {
      engineRef.current.setAnimal(ANIMALS[activeAnimalId]);
    }
  }, [activeAnimalId]);

  // Space/Enter starts a run from menus (unless modal is open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        if (showGarage) {
          setShowGarage(false);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
      }
      if (showGarage || showSettings) return;
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
  }, [state, showGarage, showSettings]);

  // Game Control Callbacks
  const start = useCallback(() => {
    setShowGarage(false);
    setShowSettings(false);
    setHud(null);
    setNearMissToast(null);

    // Attempt to lock landscape orientation on mobile devices
    try {
      if (typeof window !== "undefined" && "orientation" in screen && "lock" in screen.orientation) {
        (screen.orientation as any).lock("landscape").catch(() => {});
      }
    } catch {}

    engineRef.current?.start();
  }, []);

  const resume = useCallback(() => engineRef.current?.togglePause(), []);

  const toMenu = useCallback(() => {
    setShowGarage(false);
    setShowSettings(false);
    engineRef.current?.toMenu();
  }, []);

  const toggleMute = useCallback(() => {
    const eng = engineRef.current;
    if (eng) eng.setMuted(!eng.muted);
  }, []);

  const equipAnimal = useCallback((animalId: AnimalId) => {
    setActiveAnimalId(animalId);
    try {
      localStorage.setItem("mistwood_active_animal", animalId);
      localStorage.setItem("mistwood_active_pelt", animalId);
    } catch {}
    if (engineRef.current && animalId in ANIMALS) {
      engineRef.current.setAnimal(ANIMALS[animalId]);
    }
  }, []);

  const unlockAnimal = useCallback(
    (animalId: AnimalId) => {
      const animal = ANIMALS[animalId];
      if (!animal) return;
      if (unlockedAnimals.includes(animalId)) {
        equipAnimal(animalId);
        return;
      }
      if (totalFlies < animal.cost) return;

      const nextBalance = totalFlies - animal.cost;
      const nextUnlocked = [...unlockedAnimals, animalId];

      setTotalFlies(nextBalance);
      setUnlockedAnimals(nextUnlocked);
      setActiveAnimalId(animalId);

      try {
        localStorage.setItem("mistwood_total_flies", String(nextBalance));
        localStorage.setItem(
          "mistwood_unlocked_animals",
          JSON.stringify(nextUnlocked),
        );
        localStorage.setItem("mistwood_active_animal", animalId);
      } catch {}

      if (engineRef.current) {
        engineRef.current.setAnimal(animal);
      }
    },
    [totalFlies, unlockedAnimals, equipAnimal],
  );

  const handleShare = useCallback(() => {
    if (!stats) return;
    const shareText = `🌲 Mistwood Forest Run: ${stats.dist}m | 🚀 Top Speed: ${stats.maxSpeedKmh} KM/H | ✨ ${stats.flies} Fireflies | ⚡ ${stats.nearMisses} Close Calls | Biome: ${stats.biomeName || "The Wilds"} 🦊 Can you outrun the mist? https://saif-alsaad.github.io/MistWood-/`;
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
      {/* Canvas Game Layer */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Cinematic Vignette Overlay for Menus */}
      {(state === "menu" || state === "over" || state === "paused") && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/65" />
      )}

      {/* In-Game HUD */}
      {playing && (
        <>
          <GameHUD
            hud={hud}
            best={best}
            muted={muted}
            nearMissToast={nearMissToast}
            isTouch={isTouch}
            onPause={resume}
            onToggleMute={toggleMute}
            onOpenSettings={() => setShowSettings(true)}
            onSlideStart={() => engineRef.current?.slideStart()}
            onSlideEnd={() => engineRef.current?.slideEnd()}
            onJumpStart={() => engineRef.current?.jump()}
            onJumpEnd={() => engineRef.current?.releaseJump()}
          />
          <ToastNotification toast={toast} />
        </>
      )}

      {/* Loading Screen */}
      {state === "loading" && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#05070b]">
          <div className="pulse-soft mb-8 h-3.5 w-3.5 rounded-full bg-amber-200 shadow-[0_0_36px_12px_rgba(255,210,122,0.4)]" />
          <div className="font-display text-base font-bold uppercase tracking-[0.55em] text-white/70">
            MISTWOOD
          </div>
          <div className="mt-3 text-[11px] font-medium tracking-[0.3em] text-white/40 uppercase">
            Waking the forest…
          </div>
        </div>
      )}

      {/* Main Menu */}
      {state === "menu" && (
        <MainMenu
          best={best}
          totalFlies={totalFlies}
          activeAnimal={activeAnimal}
          muted={muted}
          isTouch={isTouch}
          onStart={start}
          onOpenGarage={() => setShowGarage(true)}
          onOpenSettings={() => setShowSettings(true)}
          onToggleMute={toggleMute}
          onHover={playHover}
        />
      )}

      {/* Pause Menu */}
      {state === "paused" && (
        <PauseMenu
          hud={hud}
          onResume={resume}
          onRestart={start}
          onOpenSettings={() => setShowSettings(true)}
          onMainMenu={toMenu}
          onHover={playHover}
          onClickSound={playClick}
        />
      )}

      {/* Results / Game Over Screen */}
      {state === "over" && stats && (
        <ResultsScreen
          stats={stats}
          onRestart={start}
          onOpenGarage={() => setShowGarage(true)}
          onMainMenu={toMenu}
          onShare={handleShare}
          onHover={playHover}
          onClickSound={playClick}
        />
      )}

      {/* Garage / Animal Selection Modal */}
      {showGarage && (
        <Garage
          activePeltId={activeAnimalId}
          unlockedPelts={unlockedAnimals}
          totalFlies={totalFlies}
          onEquip={equipAnimal}
          onUnlock={unlockAnimal}
          onClose={() => setShowGarage(false)}
          onHover={playHover}
          onClickSound={playClick}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          muted={muted}
          onUpdateSettings={handleUpdateSettings}
          onToggleMute={toggleMute}
          onClose={() => setShowSettings(false)}
          onClickSound={playClick}
        />
      )}

      {/* Share Toast Recap Banner */}
      {shareToast && (
        <div className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-950/90 px-5 py-2.5 text-xs font-semibold text-emerald-200 shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-md animate-fade-in">
          <Check className="h-4 w-4 text-emerald-300" />
          <span>Race recap copied to clipboard! 🦊</span>
        </div>
      )}

      {/* Landscape Orientation Prompt for Portrait mobile devices */}
      {isPortrait && !dismissedPortrait && isTouch && (
        <OrientationPrompt
          onDismiss={() => setDismissedPortrait(true)}
          onRotate={() => {
            try {
              if (typeof window !== "undefined" && "orientation" in screen && "lock" in screen.orientation) {
                (screen.orientation as any).lock("landscape").catch(() => {});
              }
            } catch {}
          }}
        />
      )}
    </div>
  );
}
