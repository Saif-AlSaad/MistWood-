import React from "react";
import { Gauge } from "lucide-react";

interface SpeedometerProps {
  speedKmh: number;
  maxSpeedKmh?: number;
}

export const Speedometer: React.FC<SpeedometerProps> = ({ speedKmh }) => {
  // Speed mapping: 100 km/h is base, 260 km/h is near top
  const minKmh = 90;
  const maxKmh = 270;
  const clamped = Math.max(minKmh, Math.min(maxKmh, speedKmh));
  const fraction = (clamped - minKmh) / (maxKmh - minKmh);

  // 210 degree arc for racing speedometer gauge
  const radius = 38;
  const startAngle = 165;
  const arcLength = 210;
  const currentAngle = startAngle + fraction * arcLength;

  // Arc path math (radius 38, center 50, 50)
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(x, y, r, end);
    const e = polarToCartesian(x, y, r, start);
    const largeArcFlag = end - start <= 180 ? "0" : "1";
    return ["M", s.x, s.y, "A", r, r, 0, largeArcFlag, 0, e.x, e.y].join(" ");
  };

  const bgPath = describeArc(50, 50, radius, startAngle, startAngle + arcLength);
  const activePath = describeArc(50, 50, radius, startAngle, currentAngle);

  // Speed tiers
  const getTier = (s: number) => {
    if (s >= 225) return { label: "HYPER", color: "text-cyan-300 border-cyan-400/40 bg-cyan-950/40" };
    if (s >= 180) return { label: "RUSH", color: "text-amber-300 border-amber-400/40 bg-amber-950/40" };
    if (s >= 140) return { label: "SPRINT", color: "text-amber-200 border-amber-300/30 bg-black/40" };
    return { label: "CRUISE", color: "text-white/60 border-white/20 bg-black/30" };
  };

  const tier = getTier(speedKmh);

  return (
    <div className="pointer-events-none select-none flex items-center gap-3 rounded-2xl border border-white/15 bg-black/40 px-3.5 py-2 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Semi-circular gauge SVG */}
      <div className="relative h-14 w-14 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          {/* Background track */}
          <path
            d={bgPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Active speed track */}
          <path
            d={activePath}
            fill="none"
            stroke="url(#speedGrad)"
            strokeWidth="6.5"
            strokeLinecap="round"
            className="transition-all duration-100 ease-out"
            style={{
              filter: speedKmh > 190 ? "drop-shadow(0 0 6px rgba(56, 189, 248, 0.7))" : "none",
            }}
          />
        </svg>

        {/* Center gauge icon */}
        <div className="absolute inset-0 flex items-center justify-center text-amber-200/60">
          <Gauge className="h-4 w-4" />
        </div>
      </div>

      {/* Speedometer digital readout */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="font-hud text-2xl font-bold tracking-tight text-white md:text-3xl tabular-nums">
            {speedKmh}
          </span>
          <span className="font-game text-[10px] font-bold tracking-widest text-amber-200/80 uppercase">
            KM/H
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`font-game rounded-full border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${tier.color}`}
          >
            {tier.label}
          </span>
          {speedKmh > 200 && (
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};
