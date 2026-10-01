/* The fox — a hand-drawn silhouette with procedural trot gait, squash & stretch,
   coyote time, jump buffering and variable jump height for a game-feel-first run */

import type { FoxPelt, Palette } from "./types";
import { FOX_PELTS, rgb, clamp, lerp, TAU } from "./types";

const GRAVITY = 2100;
const JUMP_V = 720;
const DBL_V = 620;
const MAX_FALL = 1500;

type PlayerEvent = "jump" | "dbl" | "land";

export class Player {
  /** height above ground, px */
  py = 0;
  vy = 0;
  grounded = true;
  jumps = 0;
  sliding = false;
  fastFall = false;
  ghostT = 0;
  dead = false;
  deadT = 0;
  runT = 0;

  private coyote = 0;
  private buf = 0;
  private squash = 0;
  private stretch = 0;
  private slideTimer = 0;
  private stepT = 0;

  constructor(private onEvent: (e: PlayerEvent) => void) {}

  reset(): void {
    this.py = 0;
    this.vy = 0;
    this.grounded = true;
    this.jumps = 0;
    this.sliding = false;
    this.fastFall = false;
    this.ghostT = 0;
    this.dead = false;
    this.deadT = 0;
    this.runT = 0;
    this.coyote = 0;
    this.buf = 0;
    this.squash = 0;
    this.stretch = 0;
    this.slideTimer = 0;
  }

  pressJump(): void {
    this.buf = 0.13;
  }

  releaseJump(): void {
    if (!this.dead && this.vy > 0) this.vy *= 0.45;
  }

  slideImpulse(): void {
    this.slideTimer = 0.55;
  }

  die(): void {
    this.dead = true;
    this.deadT = 0;
  }

  /** world-space hitbox [x0, y0, x1, y1] */
  hb(x: number, gy: number): [number, number, number, number] {
    if (this.sliding) return [x - 21, gy - this.py - 27, x + 25, gy - this.py];
    return [x - 17, gy - this.py - 52, x + 22, gy - this.py - 4];
  }

  update(dt: number, slideHeld: boolean, speedK: number): void {
    if (this.dead) {
      this.deadT += dt;
      return;
    }

    this.coyote -= dt;
    this.buf -= dt;
    this.slideTimer -= dt;
    this.ghostT -= dt;
    this.squash = Math.max(0, this.squash - dt * 6);
    this.stretch = Math.max(0, this.stretch - dt * 5);

    // buffered jump / coyote jump / double jump
    if (this.buf > 0) {
      if (this.grounded || this.coyote > 0) {
        this.vy = JUMP_V;
        this.grounded = false;
        this.coyote = 0;
        this.buf = 0;
        this.jumps = 1;
        this.stretch = 1;
        this.onEvent("jump");
      } else if (this.jumps < 2) {
        this.vy = DBL_V;
        this.buf = 0;
        this.jumps = 2;
        this.stretch = 0.8;
        this.onEvent("dbl");
      }
    }

    if (!this.grounded) {
      const g = GRAVITY * (this.fastFall ? 2.4 : 1);
      this.vy = Math.max(this.vy - g * dt, -MAX_FALL);
      this.py += this.vy * dt;

      if (this.py <= 0) {
        this.py = 0;
        this.vy = 0;
        this.grounded = true;
        this.fastFall = false;
        this.jumps = 0;
        this.coyote = 0.09;
        this.squash = 1;
        this.onEvent("land");
      }
    } else {
      this.py = 0;
      this.vy = 0;
    }

    this.sliding = ((slideHeld && this.grounded) || this.slideTimer > 0) && !this.dead;

    this.runT += dt * speedK;
  }

  /** footsteps / slide particles timing helper */
  stepPulse(): boolean {
    const s = Math.floor(this.runT * 3.2);
    if (s !== this.stepT) {
      this.stepT = s;
      return this.grounded;
    }
    return false;
  }

  render(
    ctx: CanvasRenderingContext2D,
    x: number,
    gy: number,
    pal: Palette,
    time: number,
    k: number,
    pelt: FoxPelt = FOX_PELTS.ember,
  ): void {
    const fade = this.dead ? Math.max(0, 1 - this.deadT * 1.8) : 1;
    if (fade <= 0) return;

    // soft shadow on the ground
    const sa = 0.32 * Math.max(0, 1 - this.py / 430);
    if (sa > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${sa.toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        gy + 7 * k,
        Math.max(12, 30 - this.py * 0.045) * k,
        7 * k,
        0,
        0,
        TAU,
      );
      ctx.fill();
    }

    const col = pelt.id === "spirit" ? "rgba(94, 234, 212, 0.55)" : (pelt.bodyColor || rgb(pal.ground));

    ctx.save();
    ctx.translate(x, gy - this.py);
    ctx.rotate(clamp(-this.vy * 0.00024, -0.18, 0.25));

    let sx = k * (1 + this.squash * 0.26 - this.stretch * 0.08);
    let sy = k * (1 - this.squash * 0.22 + this.stretch * 0.13);
    if (this.sliding) {
      sx *= 1.16;
      sy *= 0.58;
    }
    ctx.scale(sx, sy);
    ctx.globalAlpha = (this.ghostT > 0 ? 0.7 : (pelt.id === "spirit" ? 0.8 : 1)) * fade;

    // ghost-bloom aura or celestial spirit wisp aura
    if (this.ghostT > 0 || pelt.id === "spirit") {
      const auraColor = this.ghostT > 0 ? pal.accent : [94, 234, 212] as [number, number, number];
      const flick = (this.ghostT > 0 ? 0.3 : 0.15) + Math.sin(time * 18) * 0.06;
      const gr = ctx.createRadialGradient(0, -26, 4, 0, -26, 54);
      gr.addColorStop(0, rgb(auraColor, flick));
      gr.addColorStop(1, rgb(auraColor, 0));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, -26, 54, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const bob = this.grounded ? Math.sin(this.runT * TAU * 2) * 1.7 : 0;

    // ---- legs (stroked, trot gait) ----
    if (!this.sliding) {
      ctx.strokeStyle = col;
      ctx.lineCap = "round";
      ctx.lineWidth = 6.2;
      ctx.beginPath();
      if (this.grounded) {
        const hips: Array<[number, number]> = [
          [8, -25],
          [5, -25],
          [-12, -24],
          [-9, -24],
        ];
        const offs = [0, 0.5, 0.5, 0];
        for (let i = 0; i < 4; i++) {
          const th = (this.runT + offs[i]) * TAU;
          const fx = hips[i][0] + Math.cos(th) * 11;
          const fy = -Math.max(0, Math.sin(th)) * 13 - 1;
          const kneeX = (hips[i][0] + fx) / 2 + Math.sin(th) * -2.4;
          const kneeY = (hips[i][1] + bob + fy) / 2;
          ctx.moveTo(hips[i][0], hips[i][1] + bob);
          ctx.quadraticCurveTo(kneeX, kneeY, fx, fy);
        }
      } else {
        const u = clamp(this.vy / 1100, -1, 1) * 0.5 + 0.5; // 0 rise → 1 fall
        const feet: Array<[number, number, number, number]> = [
          [9, -25, lerp(28, 17, u), lerp(-11, -2, u)],
          [6, -25, lerp(13, 8, u), lerp(-15, -6, u)],
          [-12, -24, lerp(-23, -15, u), lerp(-7, -1, u)],
          [-9, -24, lerp(0, -3, u), lerp(-13, -7, u)],
        ];
        for (const [hx, hy2, fx2, fy2] of feet) {
          ctx.moveTo(hx, hy2);
          ctx.quadraticCurveTo((hx + fx2) / 2 - 2, (hy2 + fy2) / 2, fx2, fy2);
        }
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(0, bob);

    // ---- tail (tapered waving plume, behind body) ----
    const wave =
      Math.sin(time * 5.4 + 1.2) * 3.4 +
      (this.grounded ? 0 : -5) +
      (this.sliding ? 9 : 0);
    ctx.strokeStyle = col;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.lineWidth = 10.5;
    ctx.moveTo(-14, -30);
    ctx.quadraticCurveTo(-26, -34 + wave * 0.4, -32, -27 + wave * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth = 7.5;
    ctx.moveTo(-32, -27 + wave * 0.7);
    ctx.quadraticCurveTo(-37, -21 + wave, -39, -13 + wave);
    ctx.stroke();

    // tail tip glow/accent
    ctx.fillStyle = pelt.accentColor;
    ctx.beginPath();
    ctx.arc(-39, -12 + wave, 4.8, 0, TAU);
    ctx.fill();

    // ---- body + head + ears (single filled silhouette) ----
    const p = new Path2D();
    p.moveTo(-17, -23);
    p.bezierCurveTo(-20, -37, -11, -44, 1, -44); // arched back
    p.bezierCurveTo(7, -44, 10, -46, 12, -50); // neck rising
    p.bezierCurveTo(15, -55, 22, -56, 26, -52); // brow
    p.bezierCurveTo(31, -49, 35, -45, 38.5, -41.5); // snout
    p.lineTo(40, -40.4); // nose tip
    p.bezierCurveTo(34, -37.4, 31, -37, 26.5, -37); // jaw
    p.bezierCurveTo(21, -36.2, 19, -33, 16, -31); // throat → chest
    p.bezierCurveTo(13, -26, 11, -24, 6, -22); // chest → belly
    p.bezierCurveTo(-2, -18.6, -10, -18.6, -17, -23); // belly → rump
    p.closePath();
    // ears
    p.moveTo(11, -52);
    p.lineTo(14, -63);
    p.lineTo(19, -53.5);
    p.closePath();
    p.moveTo(19, -53.5);
    p.lineTo(23.5, -62.5);
    p.lineTo(27, -53);
    p.closePath();
    ctx.fillStyle = col;
    ctx.fill(p);

    // glowing spirit eye
    ctx.fillStyle = pelt.eyeColor;
    ctx.beginPath();
    ctx.arc(31, -47.5, 1.4, 0, TAU);
    ctx.fill();

    // subtle rim light with pelt accent
    ctx.strokeStyle = pelt.accentColor;
    ctx.globalAlpha = (this.ghostT > 0 ? 0.75 : 0.38) * fade;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    ctx.stroke(p);

    ctx.restore(); // un-bob
    ctx.restore();
  }
}
