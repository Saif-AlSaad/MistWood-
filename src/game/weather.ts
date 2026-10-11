/* Dynamic Weather & Atmospheric Particle System — slanted mist rain, ground impact splash ripples, and swirling autumn leaf vortices */

import type { Palette } from "./types";
import { TAU, clamp, mix, rand, rgb } from "./types";

interface Raindrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  depth: number; // 0 = far soft rain, 1 = near crisp rain
  alpha: number;
}

interface GroundSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  droplets: { dx: number; dy: number; vx: number; vy: number }[];
}

interface SwirlingLeaf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: [number, number, number];
  rotZ: number;
  rotSpeedZ: number;
  pitch: number;
  pitchSpeed: number;
  kind: "maple" | "oak" | "birch" | "needle";
  wobblePhase: number;
  wobbleFreq: number;
}

const RAIN_COUNT = 110;
const LEAF_COUNT = 38;
const MAX_SPLASHES = 35;

export class WeatherSystem {
  private raindrops: Raindrop[] = [];
  private splashes: GroundSplash[] = [];
  private leaves: SwirlingLeaf[] = [];

  // Wind turbulence
  windSpeed = -45; // baseline gentle headwind
  windGust = 0;
  private gustTimer = 2.0;

  // Rain intensity (0 = clear, 1 = torrential squall)
  rainIntensity = 0.45;
  private targetIntensity = 0.45;

  constructor() {
    this.initRain();
    this.initLeaves();
  }

  private initRain(): void {
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.raindrops.push({
        x: rand(-200, 1800),
        y: rand(-100, 900),
        speed: rand(750, 1100),
        length: rand(14, 28),
        depth: Math.random() > 0.4 ? 1 : 0,
        alpha: rand(0.35, 0.75),
      });
    }
  }

  private initLeaves(): void {
    const leafPalettes: [number, number, number][] = [
      [217, 119, 6],   // Golden Amber
      [180, 83, 9],    // Deep Ochre
      [153, 27, 27],   // Crimson Maple
      [185, 28, 28],   // Russet Red
      [245, 158, 11],  // Bright Golden Birch
      [22, 101, 52],   // Forest Pine Green
    ];

    const kinds: ("maple" | "oak" | "birch" | "needle")[] = [
      "maple",
      "oak",
      "birch",
      "needle",
    ];

    for (let i = 0; i < LEAF_COUNT; i++) {
      const col = leafPalettes[Math.floor(rand(0, leafPalettes.length))];
      const kind = kinds[Math.floor(rand(0, kinds.length))];
      this.leaves.push({
        x: rand(-100, 1700),
        y: rand(-50, 750),
        vx: rand(-65, -25),
        vy: rand(25, 75),
        size: kind === "needle" ? rand(4.5, 7.5) : rand(3.5, 6.5),
        color: col,
        rotZ: rand(TAU),
        rotSpeedZ: rand(-3.2, 3.2),
        pitch: rand(TAU),
        pitchSpeed: rand(2.0, 5.5),
        kind,
        wobblePhase: rand(TAU),
        wobbleFreq: rand(1.8, 3.4),
      });
    }
  }

  update(
    dt: number,
    w: number,
    h: number,
    groundY: number,
    runnerSpeed: number,
    time: number,
    nightFactor: number,
    phase: number,
    reducedMotion = false,
  ): void {
    // ---- 1. Weather Phase Modulation ----
    // Natural atmospheric shifts according to day/night cycle
    // Dawn: 0.25 (morning dew) | Midday: 0.15 | Dusk: 0.85 (moody autumn rain) | Night: 0.5 (glinting night rain)
    const cycle = ((phase % 4) + 4) % 4;
    if (cycle < 1) {
      // Dawn
      this.targetIntensity = 0.28;
    } else if (cycle < 2) {
      // Midday (clearer intervals)
      this.targetIntensity = 0.18 + Math.sin(time * 0.15) * 0.12;
    } else if (cycle < 3) {
      // Dusk (heavy moody mist squalls)
      this.targetIntensity = 0.78 + Math.sin(time * 0.25) * 0.18;
    } else {
      // Firefly Night (glistening luminous rain)
      this.targetIntensity = 0.48;
    }

    this.rainIntensity += (this.targetIntensity - this.rainIntensity) * Math.min(1, dt * 0.8);

    // ---- 2. Wind Gust Dynamics ----
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      this.gustTimer = rand(2.5, 5.0);
      this.windGust = rand(-95, -20);
    }
    // Smooth gust decay
    this.windGust *= 1 - Math.min(1, dt * 0.7);
    const activeWind = this.windSpeed + this.windGust;

    // ---- 3. Raindrops Physics & Ground Splashes ----
    // Rain angle tilts dynamically with runner speed + wind
    const slantX = activeWind - runnerSpeed * 0.42;

    const activeRainDrops = Math.floor(RAIN_COUNT * this.rainIntensity);
    for (let i = 0; i < this.raindrops.length; i++) {
      const drop = this.raindrops[i];
      if (i > activeRainDrops) continue;

      drop.x += slantX * dt;
      drop.y += drop.speed * dt;

      // Ground impact check
      if (drop.y >= groundY) {
        if (drop.depth === 1 && Math.random() < 0.65) {
          this.spawnSplash(drop.x, groundY);
        }
        // Respawn above screen
        drop.y = rand(-80, -10);
        drop.x = rand(-150, w + 300);
      }

      // Viewport wrap horizontal
      if (drop.x < -200) drop.x += w + 400;
      else if (drop.x > w + 200) drop.x -= w + 400;
    }

    // ---- 4. Update Ground Splash Ripples ----
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.splashes.splice(i, 1);
        continue;
      }
      const progress = 1 - s.life / s.maxLife;
      s.radius = 1.5 + progress * s.maxRadius;

      // Droplet projectile rebound
      for (const d of s.droplets) {
        d.dx += d.vx * dt;
        d.dy += d.vy * dt;
        d.vy += 320 * dt; // gravity
      }
    }

    // ---- 5. Swirling Autumn Leaves Physics ----
    const motionScale = reducedMotion ? 0.4 : 1.0;
    for (const leaf of this.leaves) {
      leaf.wobblePhase += leaf.wobbleFreq * dt;
      leaf.rotZ += leaf.rotSpeedZ * dt * motionScale;
      leaf.pitch += leaf.pitchSpeed * dt * motionScale;

      // Micro-vortices turbulence
      const swirlX = Math.sin(leaf.wobblePhase) * 38;
      const swirlY = Math.cos(leaf.wobblePhase * 1.3) * 16;

      leaf.x += (leaf.vx + activeWind * 0.65 - runnerSpeed * 0.35 + swirlX) * dt * motionScale;
      leaf.y += (leaf.vy + swirlY) * dt;

      // Ground settling / wrap-around
      if (leaf.y > groundY + 40 || leaf.x < -180) {
        leaf.y = rand(-40, h * 0.35);
        leaf.x = rand(w * 0.3, w + 240);
        leaf.vx = rand(-75, -28);
        leaf.vy = rand(22, 68);
      }
    }
  }

  private spawnSplash(x: number, groundY: number): void {
    if (this.splashes.length >= MAX_SPLASHES) return;

    const droplets: { dx: number; dy: number; vx: number; vy: number }[] = [];
    const count = Math.floor(rand(2, 4));
    for (let k = 0; k < count; k++) {
      droplets.push({
        dx: rand(-2, 2),
        dy: -rand(1, 3),
        vx: rand(-35, 35),
        vy: -rand(60, 115),
      });
    }

    this.splashes.push({
      x,
      y: groundY + rand(0, 3),
      radius: 1.5,
      maxRadius: rand(6.5, 11.5),
      life: 0.28,
      maxLife: 0.28,
      droplets,
    });
  }

  /**
   * Render slanted atmospheric rain streaks and ground impact ripples
   */
  renderRain(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    groundY: number,
    runnerSpeed: number,
    pal: Palette,
  ): void {
    if (this.rainIntensity < 0.05) return;

    const activeWind = this.windSpeed + this.windGust;
    const slantX = activeWind - runnerSpeed * 0.42;

    // Angle of rain streaks
    const avgSpeedY = 900;
    const angle = Math.atan2(avgSpeedY, slantX);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Color: cool sky mist tint, with subtle rim glint
    const rainRgb = mix(pal.fog, pal.rim, 0.35);
    const activeDrops = Math.floor(RAIN_COUNT * this.rainIntensity);

    // 1. Background Rain (Softer, slightly blurred)
    ctx.save();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = rgb(rainRgb, 0.22 * this.rainIntensity);
    ctx.beginPath();
    for (let i = 0; i < activeDrops; i++) {
      const drop = this.raindrops[i];
      if (drop.depth === 1) continue;
      const x2 = drop.x + cosA * drop.length * 0.8;
      const y2 = drop.y + sinA * drop.length * 0.8;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // 2. Foreground Rain (Crisp, reflective specular streaks)
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = rgb(rainRgb, 0.48 * this.rainIntensity);
    ctx.beginPath();
    for (let i = 0; i < activeDrops; i++) {
      const drop = this.raindrops[i];
      if (drop.depth === 0) continue;
      const x2 = drop.x + cosA * drop.length;
      const y2 = drop.y + sinA * drop.length;
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // 3. Ground Impact Splashes (Ripples + Micro Droplet Crowns)
    const splashCol = rgb(pal.rim, 0.55);
    for (const s of this.splashes) {
      const alpha = (s.life / s.maxLife) * 0.65;
      ctx.strokeStyle = rgb(rainRgb, alpha);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.radius * 1.3, s.radius * 0.35, 0, 0, TAU);
      ctx.stroke();

      // Micro Droplets bouncing upward
      ctx.fillStyle = splashCol;
      for (const d of s.droplets) {
        ctx.beginPath();
        ctx.arc(s.x + d.dx, s.y + d.dy, 1.0, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Render dynamic 3D tumbling autumn foliage swirling on the wind
   */
  renderSwirlingLeaves(ctx: CanvasRenderingContext2D, pal: Palette): void {
    ctx.save();

    for (const leaf of this.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);

      // 3D Tumbling Projection:
      // Yaw/heading rotation
      ctx.rotate(leaf.rotZ);
      // Perspective pitch squish (tumbles edge-on)
      const pitchScale = Math.cos(leaf.pitch);
      ctx.scale(1.0, pitchScale);

      // Color slightly influenced by environment fog
      const leafColor = mix(leaf.color, pal.ground, 0.15);
      ctx.fillStyle = rgb(leafColor, 0.88);

      const s = leaf.size;

      switch (leaf.kind) {
        case "maple":
          // 3-lobed jagged maple leaf silhouette
          ctx.beginPath();
          ctx.moveTo(0, -s * 1.2);
          ctx.lineTo(s * 0.45, -s * 0.5);
          ctx.lineTo(s * 1.1, -s * 0.35);
          ctx.lineTo(s * 0.5, s * 0.3);
          ctx.lineTo(s * 0.7, s * 0.95);
          ctx.lineTo(0, s * 0.55);
          ctx.lineTo(-s * 0.7, s * 0.95);
          ctx.lineTo(-s * 0.5, s * 0.3);
          ctx.lineTo(-s * 1.1, -s * 0.35);
          ctx.lineTo(-s * 0.45, -s * 0.5);
          ctx.closePath();
          ctx.fill();
          break;

        case "oak":
          // Wavy rounded oak leaf silhouette
          ctx.beginPath();
          ctx.moveTo(0, -s * 1.3);
          ctx.quadraticCurveTo(s * 0.7, -s * 0.7, s * 0.8, -s * 0.2);
          ctx.quadraticCurveTo(s * 0.9, s * 0.4, 0, s * 1.1);
          ctx.quadraticCurveTo(-s * 0.9, s * 0.4, -s * 0.8, -s * 0.2);
          ctx.quadraticCurveTo(-s * 0.7, -s * 0.7, 0, -s * 1.3);
          ctx.closePath();
          ctx.fill();
          break;

        case "birch":
          // Delicate teardrop birch leaf
          ctx.beginPath();
          ctx.moveTo(0, -s * 1.1);
          ctx.quadraticCurveTo(s * 0.85, 0, 0, s * 1.0);
          ctx.quadraticCurveTo(-s * 0.85, 0, 0, -s * 1.1);
          ctx.closePath();
          ctx.fill();
          break;

        case "needle":
          // Slender pine needle
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 1.4, 0.9, 0, 0, TAU);
          ctx.fill();
          break;
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
