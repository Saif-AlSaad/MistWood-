/* Lightweight pooled particle system — dust, sparks, spores, drifting leaves */

import type { Palette } from "./types";
import { rgb, mix, rand, TAU } from "./types";

enum PT {
  Dust,
  Spark,
  Spore,
  Leaf,
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  type: PT;
}

const MAX = 340;

export class Particles {
  private pool: Particle[] = [];
  private ri = 0;

  clear(): void {
    this.pool.length = 0;
  }

  private add(p: Particle): void {
    if (this.pool.length < MAX) this.pool.push(p);
    else {
      this.pool[this.ri] = p;
      this.ri = (this.ri + 1) % MAX;
    }
  }

  dust(x: number, y: number, n: number, dir = 0): void {
    for (let i = 0; i < n; i++) {
      this.add({
        x: x + rand(-6, 6),
        y: y + rand(-3, 2),
        vx: rand(-60, 30) + dir,
        vy: rand(-95, -15),
        life: rand(0.35, 0.7),
        max: 0,
        size: rand(2.5, 6),
        rot: 0,
        vr: 0,
        type: PT.Dust,
      });
    }
  }

  sparks(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const sp = rand(40, 190);
      this.add({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: rand(0.3, 0.75),
        max: 0,
        size: rand(1, 2.4),
        rot: 0,
        vr: 0,
        type: PT.Spark,
      });
    }
  }

  spores(x: number, y: number, n: number, big = false): void {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const sp = rand(30, big ? 260 : 120);
      this.add({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (big ? 60 : 20),
        life: rand(0.6, big ? 1.6 : 1),
        max: 0,
        size: rand(1.5, big ? 5 : 3.2),
        rot: 0,
        vr: 0,
        type: PT.Spore,
      });
    }
  }

  leaf(x: number, y: number): void {
    this.add({
      x,
      y,
      vx: rand(-34, -8),
      vy: rand(16, 44),
      life: rand(3, 5.5),
      max: 0,
      size: rand(3.4, 6.2),
      rot: rand(TAU),
      vr: rand(-2.4, 2.4),
      type: PT.Leaf,
    });
  }

  update(dt: number, wind: number): void {
    const p = this.pool;
    for (let i = p.length - 1; i >= 0; i--) {
      const o = p[i];
      o.max += dt;
      o.life -= dt;
      if (o.life <= 0) {
        p[i] = p[p.length - 1];
        p.pop();
        continue;
      }
      if (o.type === PT.Leaf) {
        o.vx += Math.sin(o.max * 3.4 + o.rot) * 26 * dt;
        o.rot += o.vr * dt;
        o.x += (o.vx + wind * 0.6) * dt;
        o.y += o.vy * dt;
      } else {
        o.vy += (o.type === PT.Dust ? -26 : 130) * dt;
        o.vx *= 1 - 1.6 * dt;
        o.x += o.vx * dt;
        o.y += o.vy * dt;
      }
    }
  }

  /** flat pass — dust + leaves */
  renderFlat(ctx: CanvasRenderingContext2D, pal: Palette): void {
    const dustCol = mix(pal.fog, pal.ground, 0.42);
    const leafCol = mix(pal.ground, pal.fog, 0.3);
    for (const o of this.pool) {
      const a = Math.min(1, (o.life / 0.5) * 1.2);
      if (o.type === PT.Dust) {
        ctx.fillStyle = rgb(dustCol, a * 0.4);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size * (1 + o.max * 1.6), 0, TAU);
        ctx.fill();
      } else if (o.type === PT.Leaf) {
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.rot);
        ctx.fillStyle = rgb(leafCol, a * 0.85);
        ctx.beginPath();
        ctx.ellipse(0, 0, o.size, o.size * 0.45, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  /** additive pass — sparks + spores */
  renderGlow(ctx: CanvasRenderingContext2D, pal: Palette): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const o of this.pool) {
      if (o.type !== PT.Spark && o.type !== PT.Spore) continue;
      const a = Math.min(1, o.life * 2.4);
      if (o.type === PT.Spark) {
        ctx.fillStyle = rgb(pal.accent, a * 0.9);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = rgb(pal.accent, a * 0.16);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size * 3.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgb(pal.mote, a * 0.85);
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size * 0.7, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
