import React, { useEffect, useRef } from "react";
import type { FoxPelt } from "../../game/types";
import { Player } from "../../game/player";
import { Particles } from "../../game/particles";
import { samplePalette } from "../../game/world";

interface FoxPreviewCanvasProps {
  pelt: FoxPelt;
  className?: string;
}

export const FoxPreviewCanvas: React.FC<FoxPreviewCanvasProps> = ({ pelt, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let time = 0;
    const player = new Player(() => {});
    const particles = new Particles();
    const pal = samplePalette(0);

    const w = 260;
    const h = 170;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    let last = performance.now();
    let sparkTimer = 0;

    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 1000, 0.033);
      last = ts;
      time += dt;

      // Update player trot
      player.update(dt, false, 1.1);

      // Emit pelt aura sparks
      sparkTimer -= dt;
      if (sparkTimer <= 0) {
        sparkTimer = 0.08;
        particles.sparks(130 - 24, 120 - 4, 1);
      }
      particles.update(dt, -20);

      // Render
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Subtle ground indicator line
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fillRect(20, 120, w - 40, 1.2);

      // Render fox
      player.render(ctx, 130, 120, pal, time, 1.05, pelt);

      // Render aura particles
      particles.renderGlow(ctx, {
        ...pal,
        accent: hexToRgb(pelt.accentColor),
        mote: hexToRgb(pelt.trailColor),
      });

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [pelt]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-3xl bg-radial from-amber-500/10 via-black/40 to-black/60 border border-white/10 ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "260px", height: "170px" }}
        className="pointer-events-none"
      />
    </div>
  );
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
