import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  FOX_PELTS,
  type FoxPelt,
  type FoxPeltId,
  type FoxRarity,
} from "../../game/types";
import { FoxPreviewCanvas } from "./FoxPreviewCanvas";

interface GarageProps {
  activePeltId: FoxPeltId;
  unlockedPelts: FoxPeltId[];
  totalFlies: number;
  onEquip: (peltId: FoxPeltId) => void;
  onUnlock: (peltId: FoxPeltId) => void;
  onClose: () => void;
  onHover?: () => void;
  onClickSound?: () => void;
}

const RARITY_CONFIG: Record<
  FoxRarity,
  { label: string; badgeClass: string; glowClass: string }
> = {
  common: {
    label: "COMMON",
    badgeClass: "border-stone-400/30 bg-stone-500/10 text-stone-300",
    glowClass: "from-stone-500/20",
  },
  rare: {
    label: "RARE",
    badgeClass: "border-blue-400/40 bg-blue-500/15 text-blue-300",
    glowClass: "from-blue-500/25",
  },
  epic: {
    label: "EPIC",
    badgeClass: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    glowClass: "from-amber-500/25",
  },
  legendary: {
    label: "LEGENDARY",
    badgeClass: "border-purple-400/40 bg-purple-500/15 text-purple-300",
    glowClass: "from-purple-500/25",
  },
  celestial: {
    label: "CELESTIAL",
    badgeClass: "border-cyan-400/50 bg-cyan-500/20 text-cyan-200",
    glowClass: "from-cyan-500/30",
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
  const [selectedId, setSelectedId] = useState<FoxPeltId>(activePeltId);
  const selectedPelt: FoxPelt = FOX_PELTS[selectedId] || FOX_PELTS.ember;
  const isUnlocked = unlockedPelts.includes(selectedId);
  const isEquipped = activePeltId === selectedId;
  const canAfford = totalFlies >= selectedPelt.cost;
  const rarity = RARITY_CONFIG[selectedPelt.rarity || "common"];

  const handleSelect = (id: FoxPeltId) => {
    onHover?.();
    setSelectedId(id);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl animate-fade-in"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#080d16]/95 shadow-[0_25px_90px_rgba(0,0,0,0.9)]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClickSound?.();
                onClose();
              }}
              title="Return"
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-amber-200/70">
                <Sparkles className="h-3 w-3" />
                <span className="text-[10px] font-semibold tracking-[0.25em] uppercase">
                  Customization Sanctuary
                </span>
              </div>
              <h2 className="font-display text-xl font-bold tracking-wider text-white md:text-2xl">
                FOX GARAGE
              </h2>
            </div>
          </div>

          {/* Essence Balance */}
          <div className="flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-amber-200 backdrop-blur-md">
            <Sparkles className="h-4 w-4 fill-amber-300/40 text-amber-300" />
            <span className="font-sans text-sm font-bold tracking-wide tabular-nums text-white">
              {totalFlies}
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-amber-200/70 uppercase">
              Essence
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto p-6 md:grid-cols-12 md:gap-6">
          {/* Left / Center: Interactive Preview & Details */}
          <div className="flex flex-col items-center md:col-span-7">
            {/* Live Interactive Fox Canvas */}
            <div className="relative w-full max-w-[340px]">
              <FoxPreviewCanvas pelt={selectedPelt} className="h-52 w-full" />
              <div className="absolute top-3 left-3">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase backdrop-blur-md ${rarity.badgeClass}`}
                >
                  {rarity.label}
                </span>
              </div>
            </div>

            {/* Fox Stats & Lore */}
            <div className="mt-4 w-full text-center md:text-left">
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <h3 className="font-display text-2xl font-bold tracking-wide text-white">
                  {selectedPelt.name}
                </h3>
              </div>
              <p className="text-xs font-medium tracking-widest text-amber-200/70 uppercase mt-0.5">
                {selectedPelt.title}
              </p>

              <p className="mt-2.5 text-xs font-light leading-relaxed text-white/65">
                {selectedPelt.description}
              </p>

              {/* Perk Callout */}
              <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left">
                <Zap className="h-4 w-4 shrink-0 text-amber-300" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold tracking-wider text-white/45 uppercase">
                    Pelt Trait
                  </span>
                  <span className="text-xs font-medium text-amber-100">
                    {selectedPelt.perk}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5">
                {isEquipped ? (
                  <button
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 py-3 text-xs font-semibold tracking-widest text-emerald-200 uppercase cursor-default"
                  >
                    <Check className="h-4 w-4" /> Equipped
                  </button>
                ) : isUnlocked ? (
                  <button
                    onClick={handleAction}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-100 py-3 text-xs font-semibold tracking-widest text-stone-950 uppercase shadow-[0_4px_25px_rgba(255,210,122,0.4)] transition-all hover:scale-[1.02] hover:bg-white active:scale-95 cursor-pointer"
                  >
                    Equip Pelt
                  </button>
                ) : (
                  <button
                    disabled={!canAfford}
                    onClick={handleAction}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold tracking-widest uppercase transition-all ${
                      canAfford
                        ? "bg-amber-300 text-stone-950 shadow-[0_4px_25px_rgba(251,191,36,0.35)] hover:scale-[1.02] hover:bg-white active:scale-95 cursor-pointer"
                        : "border border-white/10 bg-white/5 text-white/35 cursor-not-allowed"
                    }`}
                  >
                    {canAfford ? (
                      <>
                        <Sparkles className="h-4 w-4 fill-current" />
                        Unlock ({selectedPelt.cost} Essence)
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Need {selectedPelt.cost - totalFlies} More Essence
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Pelts Selector Grid */}
          <div className="mt-6 flex flex-col gap-2.5 md:col-span-5 md:mt-0">
            <span className="text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase mb-1">
              Select Attunement
            </span>

            {Object.values(FOX_PELTS).map((pelt) => {
              const unlocked = unlockedPelts.includes(pelt.id);
              const equipped = activePeltId === pelt.id;
              const selected = selectedId === pelt.id;
              const peltRarity = RARITY_CONFIG[pelt.rarity || "common"];

              return (
                <button
                  key={pelt.id}
                  type="button"
                  onClick={() => handleSelect(pelt.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                    selected
                      ? "border-amber-400/60 bg-amber-500/10 shadow-[0_0_25px_rgba(251,191,36,0.15)]"
                      : unlocked
                      ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      : "border-white/5 bg-black/40 opacity-70 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Pelt Color Sphere Indicator */}
                    <div
                      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 shadow-inner"
                      style={{ background: pelt.bodyColor }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          background: pelt.eyeColor,
                          boxShadow: `0 0 8px ${pelt.eyeColor}`,
                        }}
                      />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">
                          {pelt.name}
                        </span>
                        {equipped && (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[8px] font-bold text-emerald-300 border border-emerald-400/30">
                            EQUIPPED
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-white/45">
                        {peltRarity.label}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {equipped ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : unlocked ? (
                      <span className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                        READY
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-300/80">
                        <Lock className="h-3 w-3" />
                        <span className="text-[10px] font-semibold tabular-nums">
                          {pelt.cost}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
