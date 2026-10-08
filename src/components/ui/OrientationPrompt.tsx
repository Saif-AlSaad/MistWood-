import React from "react";
import { Compass, RotateCw, Smartphone, Trees } from "lucide-react";

interface OrientationPromptProps {
  onDismiss: () => void;
  onRotate?: () => void;
}

export const OrientationPrompt: React.FC<OrientationPromptProps> = ({
  onDismiss,
  onRotate,
}) => {
  const handleAttemptRotate = async () => {
    try {
      if (typeof window !== "undefined" && "orientation" in screen && "lock" in screen.orientation) {
        await (screen.orientation as any).lock("landscape");
      }
    } catch {}
    onRotate?.();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Rotate Device to Landscape"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070b]/95 p-6 text-center backdrop-blur-2xl animate-fade-in select-none"
    >
      <div className="relative flex max-w-sm flex-col items-center rounded-3xl border border-white/15 bg-gradient-to-b from-[#0e1422]/90 via-[#090e17]/95 to-[#04060b] p-7 shadow-[0_20px_70px_rgba(0,0,0,0.85)]">
        {/* Subtle Ambient Glow */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl" />

        {/* Top Forest Tag */}
        <div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3.5 py-1 font-game text-[10px] font-bold tracking-[0.25em] text-amber-200 uppercase">
          <Trees className="h-3 w-3 text-amber-300" />
          <span>WIDESCREEN RUNNER</span>
        </div>

        {/* Animated Phone Rotate Device Visual */}
        <div className="relative my-7 flex h-24 w-24 items-center justify-center">
          {/* Subtle Outer Radar Ring */}
          <div className="absolute inset-0 rounded-full border border-amber-300/20 animate-ping opacity-25" />
          <div className="absolute inset-2 rounded-full border border-white/10 bg-white/[0.02]" />

          {/* Rotating Device Graphic */}
          <div className="animate-phone-rotate relative flex items-center justify-center text-amber-200">
            <Smartphone className="h-14 w-14 stroke-[1.6] drop-shadow-[0_0_15px_rgba(255,210,122,0.4)]" />
          </div>

          {/* Rotation Indicator Arrow Overlay */}
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/20 text-amber-200 shadow-md backdrop-blur-md">
            <RotateCw className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Title */}
        <h2 className="font-display text-xl font-bold tracking-[0.18em] text-white uppercase sm:text-2xl">
          ROTATE TO LANDSCAPE
        </h2>

        {/* Description */}
        <p className="mt-2 text-xs font-normal leading-relaxed tracking-wide text-white/65">
          Mistwood is built for wide panoramic vision. Turn your device horizontally to spot ancient boulders, vines, and spirit blooms in time.
        </p>

        {/* Buttons */}
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={handleAttemptRotate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 py-3.5 font-game text-xs font-bold tracking-[0.2em] text-stone-950 uppercase shadow-[0_4px_25px_rgba(255,210,122,0.45)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <Compass className="h-4 w-4" />
            ROTATE SCREEN
          </button>

          <button
            type="button"
            onClick={onDismiss}
            className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-2.5 font-game text-[11px] font-bold tracking-wider text-white/70 uppercase transition-all hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
          >
            Continue in Portrait Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
