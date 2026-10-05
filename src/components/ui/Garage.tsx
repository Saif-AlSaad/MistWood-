/* MistWood Commercial-Grade 3D Animal Garage & Character Selection Screen */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Lock,
  Sparkles,
  Zap,
  Wind,
  ArrowUpRight,
  Shield,
} from "lucide-react";
import {
  ANIMALS,
  ANIMAL_ORDER,
  type AnimalDefinition,
  type AnimalId,
  type AnimalRarity,
  mapLegacyPeltId,
} from "../../game/animals";
import { Garage2DView } from "./Garage2DView";

interface GarageProps {
  activePeltId: string;
  unlockedPelts: string[];
  totalFlies: number;
  onEquip: (id: AnimalId) => void;
  onUnlock: (id: AnimalId) => void;
  onClose: () => void;
  onHover?: () => void;
  onClickSound?: () => void;
}

const RARITY_CONFIG: Record<
  AnimalRarity,
  { label: string; badgeClass: string; glowBorder: string; textClass: string }
> = {
  common: {
    label: "COMMON",
    badgeClass: "border-stone-400/30 bg-stone-500/10 text-stone-300",
    glowBorder: "border-stone-400/50 shadow-[0_0_20px_rgba(168,162,158,0.2)]",
    textClass: "text-stone-300",
  },
  rare: {
    label: "RARE",
    badgeClass: "border-cyan-400/40 bg-cyan-500/15 text-cyan-300",
    glowBorder: "border-cyan-400/60 shadow-[0_0_25px_rgba(56,189,248,0.25)]",
    textClass: "text-cyan-300",
  },
  epic: {
    label: "EPIC",
    badgeClass: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    glowBorder: "border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.3)]",
    textClass: "text-amber-300",
  },
  legendary: {
    label: "LEGENDARY",
    badgeClass: "border-purple-400/40 bg-purple-500/15 text-purple-300",
    glowBorder: "border-purple-400/60 shadow-[0_0_30px_rgba(192,132,252,0.35)]",
    textClass: "text-purple-300",
  },
  celestial: {
    label: "CELESTIAL",
    badgeClass: "border-teal-400/50 bg-teal-500/20 text-teal-200",
    glowBorder: "border-teal-400/70 shadow-[0_0_30px_rgba(45,212,191,0.35)]",
    textClass: "text-teal-200",
  },
};

export const Garage: React.FC<GarageProps> = ({
  activePeltId,
  unlockedPelts,
  totalFlies,
  onEquip,
  onUnlock,
  onClose,
  onHover,
  onClickSound,
}) => {
  // Normalize IDs to AnimalId progression
  const currentEquippedId: AnimalId = mapLegacyPeltId(activePeltId);
  const normalizedUnlocked: AnimalId[] = unlockedPelts.map((p) => mapLegacyPeltId(p));
  if (!normalizedUnlocked.includes("fox")) normalizedUnlocked.push("fox");

  const [selectedId, setSelectedId] = useState<AnimalId>(currentEquippedId);
  const selectedAnimal: AnimalDefinition = ANIMALS[selectedId] || ANIMALS.fox;

  const isUnlocked = normalizedUnlocked.includes(selectedId);
  const isEquipped = currentEquippedId === selectedId;
  const canAfford = totalFlies >= selectedAnimal.cost;
  const rarity = RARITY_CONFIG[selectedAnimal.rarity || "common"];

  // Navigation handlers
  const currentIndex = ANIMAL_ORDER.indexOf(selectedId);

  const handlePrev = () => {
    onHover?.();
    const prevIdx = (currentIndex - 1 + ANIMAL_ORDER.length) % ANIMAL_ORDER.length;
    setSelectedId(ANIMAL_ORDER[prevIdx]);
  };

  const handleNext = () => {
    onHover?.();
    const nextIdx = (currentIndex + 1) % ANIMAL_ORDER.length;
    setSelectedId(ANIMAL_ORDER[nextIdx]);
  };

  const handleSelect = (id: AnimalId) => {
    if (id !== selectedId) {
      onHover?.();
      setSelectedId(id);
    }
  };

  const handleAction = () => {
    onClickSound?.();
    if (isEquipped) return;
    if (isUnlocked) {
      onEquip(selectedId);
    } else if (canAfford) {
      onUnlock(selectedId);
    }
  };

  // Keyboard navigation: Left/Right arrows cycle animals, Enter/Space equips
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleAction();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, isEquipped, isUnlocked, canAfford, selectedId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 backdrop-blur-2xl animate-fade-in"
    >
      <div className="relative flex h-full max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-[#0b101c] via-[#070b13] to-[#04060a] shadow-[0_25px_100px_rgba(0,0,0,0.95)]">
        {/* Top Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3.5 sm:px-7 sm:py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClickSound?.();
                onClose();
              }}
              title="Return to Menu (ESC)"
              aria-label="Back"
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:scale-105 hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-amber-200/70">
                <Sparkles className="h-3 w-3" />
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.25em] uppercase">
                  SANCTUARY RUNNER GARAGE
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-2xl font-bold tracking-wider text-white">
                ANIMAL SELECTION
              </h2>
            </div>
          </div>

          {/* Essence Balance Badge */}
          <div className="flex items-center gap-2 rounded-2xl border border-amber-300/35 bg-amber-400/10 px-3.5 py-1.5 sm:px-4 sm:py-2 text-amber-200 backdrop-blur-md shadow-[0_0_20px_rgba(251,191,36,0.15)]">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-300/40 text-amber-300" />
            <span className="font-sans text-xs sm:text-sm font-bold tracking-wide tabular-nums text-white">
              {totalFlies}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-amber-200/70 uppercase">
              Essence
            </span>
          </div>
        </div>

        {/* Central Stage: 3D Preview + Animal Info */}
        <div className="relative flex flex-1 flex-col overflow-hidden min-h-0">
          {/* Main 2D Viewport Area */}
          <div className="relative flex-1 w-full min-h-[220px] sm:min-h-[300px]">
            <Garage2DView animal={selectedAnimal} className="w-full h-full" />

            {/* Left/Right Carousel Nav Arrows Overlay */}
            <button
              type="button"
              onClick={handlePrev}
              title="Previous Animal (Left Arrow)"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all hover:scale-110 hover:bg-black/70 hover:text-white active:scale-95 cursor-pointer shadow-[0_4px_25px_rgba(0,0,0,0.6)]"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              title="Next Animal (Right Arrow)"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur-md transition-all hover:scale-110 hover:bg-black/70 hover:text-white active:scale-95 cursor-pointer shadow-[0_4px_25px_rgba(0,0,0,0.6)]"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Top Center: Current Animal Name & Title Banner */}
            <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-widest uppercase backdrop-blur-md ${rarity.badgeClass}`}
                >
                  {rarity.label}
                </span>
                {isEquipped && (
                  <span className="flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold tracking-widest text-emerald-300 uppercase backdrop-blur-md">
                    <Check className="h-2.5 w-2.5" /> EQUIPPED
                  </span>
                )}
              </div>
              <h1 className="font-display mt-1 text-2xl sm:text-3xl font-bold tracking-wide text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)]">
                {selectedAnimal.name}
              </h1>
              <p className="text-[11px] font-medium tracking-[0.25em] text-amber-200/80 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {selectedAnimal.title}
              </p>
            </div>

            {/* Compact Floating Stats Panel (Top Left) */}
            <div className="pointer-events-none absolute top-4 left-4 z-10 hidden sm:flex flex-col gap-1.5 w-44 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
              <span className="text-[9px] font-bold tracking-[0.2em] text-white/50 uppercase mb-0.5">
                PHYSICS PROFILE
              </span>

              {/* Speed Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-white/70">
                    <Wind className="h-2.5 w-2.5 text-cyan-300" /> SPEED
                  </span>
                  <span className="tabular-nums text-white/90">{selectedAnimal.stats.speed}/10</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-500"
                    style={{ width: `${selectedAnimal.stats.speed * 10}%` }}
                  />
                </div>
              </div>

              {/* Agility Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-white/70">
                    <Zap className="h-2.5 w-2.5 text-amber-300" /> AGILITY
                  </span>
                  <span className="tabular-nums text-white/90">{selectedAnimal.stats.agility}/10</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${selectedAnimal.stats.agility * 10}%` }}
                  />
                </div>
              </div>

              {/* Jump Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-white/70">
                    <ArrowUpRight className="h-2.5 w-2.5 text-emerald-300" /> JUMP
                  </span>
                  <span className="tabular-nums text-white/90">{selectedAnimal.stats.jump}/10</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-500"
                    style={{ width: `${selectedAnimal.stats.jump * 10}%` }}
                  />
                </div>
              </div>

              {/* Power / Mass Bar */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-white/70">
                    <Shield className="h-2.5 w-2.5 text-purple-300" /> MASS / PWR
                  </span>
                  <span className="tabular-nums text-white/90">{selectedAnimal.stats.power}/10</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-300 transition-all duration-500"
                    style={{ width: `${selectedAnimal.stats.power * 10}%` }}
                  />
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between text-[9px] text-white/40 pt-1 border-t border-white/5">
                <span>Mass: {selectedAnimal.physics.mass} kg</span>
                <span>Stride: {selectedAnimal.physics.strideLength} px</span>
              </div>
            </div>

            {/* Trait Callout Overlay (Top Right) */}
            <div className="pointer-events-none absolute top-4 right-4 z-10 hidden sm:flex flex-col gap-1 max-w-[210px] rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.7)] text-left">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Zap className="h-3 w-3" />
                <span className="text-[9px] font-bold tracking-wider uppercase">
                  ANIMAL TRAIT
                </span>
              </div>
              <p className="text-[11px] font-medium leading-snug text-white/90">
                {selectedAnimal.perk}
              </p>
              <p className="mt-1 text-[10px] font-light leading-relaxed text-white/55">
                {selectedAnimal.description}
              </p>
            </div>
          </div>

          {/* Bottom Area: Progression Cards Carousel + Select / Equip Button */}
          <div className="shrink-0 flex flex-col gap-3 border-t border-white/10 bg-black/60 p-4 sm:p-5 backdrop-blur-xl">
            {/* Animal Selection Cards Row (Progression: Fox, Shiny Moon Fox, Deer, Panda, Lion) */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full">
              {ANIMAL_ORDER.map((id) => {
                const animal = ANIMALS[id];
                const unlocked = normalizedUnlocked.includes(id);
                const equipped = currentEquippedId === id;
                const isSelected = selectedId === id;
                const animalRarity = RARITY_CONFIG[animal.rarity];

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelect(id)}
                    className={`group relative flex flex-col items-center justify-between rounded-2xl border p-2 sm:p-3 text-center transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? `${animalRarity.glowBorder} bg-white/[0.08] scale-[1.02]`
                        : unlocked
                        ? "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] hover:scale-[1.01]"
                        : "border-white/5 bg-black/40 opacity-60 hover:opacity-85"
                    }`}
                  >
                    {/* Equipped Top Right Indicator */}
                    {equipped && (
                      <div className="absolute top-1.5 right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-stone-950 shadow-[0_0_8px_rgba(16,185,129,0.8)]">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Animal Color Accent Sphere */}
                    <div
                      className="relative flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 shadow-inner my-0.5 transition-transform duration-300 group-hover:scale-105"
                      style={{ background: animal.colors.body }}
                    >
                      <span
                        className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full"
                        style={{
                          background: animal.colors.accent,
                          boxShadow: `0 0 10px ${animal.colors.accent}`,
                        }}
                      />
                    </div>

                    {/* Animal Name */}
                    <span className="font-display text-[10px] sm:text-xs font-bold tracking-wide text-white truncate max-w-full mt-1">
                      {animal.name}
                    </span>

                    {/* Rarity & Status */}
                    <div className="mt-1 flex items-center justify-center text-[9px] font-semibold uppercase">
                      {equipped ? (
                        <span className="text-emerald-400 font-bold">EQUIPPED</span>
                      ) : unlocked ? (
                        <span className="text-white/60">READY</span>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-300">
                          <Lock className="h-2.5 w-2.5" />
                          <span className="tabular-nums font-bold">{animal.cost}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Central Action Equip / Unlock Bar */}
            <div className="flex items-center justify-center pt-1">
              {isEquipped ? (
                <button
                  disabled
                  className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 py-3 text-xs sm:text-sm font-bold tracking-[0.2em] text-emerald-200 uppercase cursor-default shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                >
                  <Check className="h-4 w-4" /> EQUIPPED IN RUNNER
                </button>
              ) : isUnlocked ? (
                <button
                  onClick={handleAction}
                  className="flex w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 py-3 text-xs sm:text-sm font-bold tracking-[0.25em] text-stone-950 uppercase shadow-[0_4px_30px_rgba(255,210,122,0.5)] transition-all duration-300 hover:scale-[1.02] hover:bg-white active:scale-95 cursor-pointer"
                >
                  SELECT & EQUIP ANIMAL
                </button>
              ) : (
                <button
                  disabled={!canAfford}
                  onClick={handleAction}
                  className={`flex w-full max-w-md items-center justify-center gap-2 rounded-2xl py-3 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase transition-all duration-300 ${
                    canAfford
                      ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-stone-950 shadow-[0_4px_30px_rgba(251,191,36,0.5)] hover:scale-[1.02] hover:bg-white active:scale-95 cursor-pointer"
                      : "border border-white/10 bg-white/5 text-white/35 cursor-not-allowed"
                  }`}
                >
                  {canAfford ? (
                    <>
                      <Sparkles className="h-4 w-4 fill-stone-950" />
                      UNLOCK {selectedAnimal.name.toUpperCase()} ({selectedAnimal.cost} ESSENCE)
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      LOCKED — NEED {selectedAnimal.cost - totalFlies} MORE ESSENCE
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
