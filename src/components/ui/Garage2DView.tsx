/* MistWood Masterclass Interactive 2D Animal Sanctuary Showcase Viewport */

import React, { useEffect, useRef, useState } from "react";
import type { AnimalDefinition } from "../../game/animals";
import { Animal2DRenderer } from "../../game/Animal2D";
import { TAU } from "../../game/types";
import { RotateCcw, Play, Pause, ZoomIn } from "lucide-react";

interface Garage2DViewProps {
  animal: AnimalDefinition;
  className?: string;
}

export const Garage2DView: React.FC<Garage2DViewProps> = ({ animal, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [previewRunning, setPreviewRunning] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.4);
  const [isDragging, setIsDragging] = useState(false);

  const stateRef = useRef({
    inspectTilt: 0,
    inspectPitch: 0,
    targetTilt: 0,
    targetPitch: 0,
    runCycle: 0,
    time: 0,
    transitionAlpha: 1,
    prevAnimal: animal,
    currAnimal: animal,
  });

  // Track animal transitions
  useEffect(() => {
    if (stateRef.current.currAnimal.id !== animal.id) {
      stateRef.current.prevAnimal = stateRef.current.currAnimal;
      stateRef.current.currAnimal = animal;
      stateRef.current.transitionAlpha = 0; // fade in new animal
    }
  }, [animal]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    // Mote particles for atmosphere
    const motes = Array.from({ length: 24 }, () => ({
      x: Math.random() * 600,
      y: Math.random() * 380,
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 15 - 5,
      size: Math.random() * 2.2 + 0.8,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 380;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    window.addEventListener("resize", resize);

    const loop = (ts: number) => {
      const dt = Math.min((ts - lastTime) / 1000, 0.033);
      lastTime = ts;

      const state = stateRef.current;
      state.time += dt;

      // Smooth inertia return to center if not dragging
      if (!isDragging) {
        state.targetTilt += (0 - state.targetTilt) * Math.min(1, dt * 4);
        state.targetPitch += (0 - state.targetPitch) * Math.min(1, dt * 4);
      }
      state.inspectTilt += (state.targetTilt - state.inspectTilt) * Math.min(1, dt * 10);
      state.inspectPitch += (state.targetPitch - state.inspectPitch) * Math.min(1, dt * 10);

      // Transition fade-in
      if (state.transitionAlpha < 1) {
        state.transitionAlpha = Math.min(1, state.transitionAlpha + dt * 4);
      }

      // Stride cycle update if running preview
      if (previewRunning) {
        state.runCycle += dt * 2.8;
      }

      const w = container.clientWidth || 640;
      const h = container.clientHeight || 380;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const centerX = w * 0.5;
      const groundY = h * 0.72;

      // 1. Atmosphere Radial Forest Glow
      const bgGrad = ctx.createRadialGradient(centerX, groundY - 30, 20, centerX, groundY - 30, w * 0.65);
      bgGrad.addColorStop(0, "rgba(251, 191, 36, 0.08)");
      bgGrad.addColorStop(0.5, "rgba(14, 28, 48, 0.25)");
      bgGrad.addColorStop(1, "rgba(4, 7, 13, 0.7)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Sanctuary Stone Pedestal & Glowing Rune Ring
      ctx.save();
      // Stone Disc
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.ellipse(centerX, groundY + 8, 160 * (zoomLevel / 1.4), 28 * (zoomLevel / 1.4), 0, 0, TAU);
      ctx.fill();

      // Outer Rune Ring
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(centerX, groundY + 8, 142 * (zoomLevel / 1.4), 24 * (zoomLevel / 1.4), 0, 0, TAU);
      ctx.stroke();

      // Inner Luminous Ring Pulse
      const pulse = 0.25 + Math.sin(state.time * 2.5) * 0.12;
      ctx.strokeStyle = `rgba(251, 191, 36, ${pulse.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(centerX, groundY + 8, 126 * (zoomLevel / 1.4), 20 * (zoomLevel / 1.4), 0, 0, TAU);
      ctx.stroke();
      ctx.restore();

      // 3. Realistic Layered Contact Ground Shadows
      const shadowW = (animal.physics.hitboxHalfWidth * 2.2 + 20) * (zoomLevel / 1.4);
      // Soft Ambient Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(centerX, groundY + 4, shadowW, 10 * (zoomLevel / 1.4), 0, 0, TAU);
      ctx.fill();
      // Intense Direct Contact Shadow under paws
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.beginPath();
      ctx.ellipse(centerX, groundY + 2, shadowW * 0.65, 4.5 * (zoomLevel / 1.4), 0, 0, TAU);
      ctx.fill();

      // 4. Floating Sanctuary Motes
      for (const m of motes) {
        m.y += m.vy * dt;
        m.x += m.vx * dt;
        if (m.y < 20) {
          m.y = h - 20;
          m.x = Math.random() * w;
        }
        const alpha = 0.3 + Math.sin(state.time * 3 + m.phase) * 0.25;
        ctx.fillStyle = `rgba(254, 243, 199, ${Math.max(0, alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, TAU);
        ctx.fill();
      }

      // 5. Render Animal Model with Transition Interpolation
      ctx.save();
      ctx.globalAlpha = state.transitionAlpha;
      Animal2DRenderer.render(ctx, centerX, groundY, state.currAnimal, {
        time: state.time,
        runCycle: state.runCycle,
        speed: previewRunning ? 360 : 0,
        isGrounded: true,
        vy: 0,
        isSliding: false,
        squash: 0,
        stretch: 0,
        scale: zoomLevel,
        inspectTilt: state.inspectTilt,
        inspectPitch: state.inspectPitch,
      });
      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [animal, previewRunning, zoomLevel, isDragging]);

  // Pointer Drag Handlers for Interactive Tilting
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initTilt = stateRef.current.targetTilt;
    const initPitch = stateRef.current.targetPitch;

    const onMove = (me: PointerEvent) => {
      const dx = (me.clientX - startX) / 120;
      const dy = (me.clientY - startY) / 120;
      stateRef.current.targetTilt = Math.max(-1, Math.min(1, initTilt + dx));
      stateRef.current.targetPitch = Math.max(-0.6, Math.min(0.6, initPitch - dy));
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoomLevel((prev) => Math.max(0.9, Math.min(2.1, prev + delta)));
  };

  const handleReset = () => {
    stateRef.current.targetTilt = 0;
    stateRef.current.targetPitch = 0;
    setZoomLevel(1.4);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing ${className}`}
      title="Drag horizontally to tilt · Scroll to zoom"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Floating Control Overlays */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {/* Toggle Stance: Idle vs Gallop */}
        <button
          type="button"
          onClick={() => setPreviewRunning(!previewRunning)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-white/80 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
        >
          {previewRunning ? (
            <>
              <Pause className="h-3 w-3 text-amber-300" />
              <span>STANCE: GALLOP</span>
            </>
          ) : (
            <>
              <Play className="h-3 w-3 text-emerald-300" />
              <span>STANCE: IDLE</span>
            </>
          )}
        </button>

        {/* Reset View Button */}
        <button
          type="button"
          onClick={handleReset}
          title="Reset Zoom & Tilt"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/70 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white active:scale-95 cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.5)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hint Pill */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-1 text-[9px] font-medium tracking-widest text-white/50 uppercase backdrop-blur-sm shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        <ZoomIn className="h-3 w-3 text-amber-300/70" />
        <span>Drag to Inspect · Scroll to Zoom</span>
      </div>
    </div>
  );
};
