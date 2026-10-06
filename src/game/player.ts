/* MistWood Runner Animal Player — Realistic Quadruped Anatomy, Physics Profiles & Dynamic Movement */

import type { AnimalDefinition } from "./animals";
import { ANIMALS } from "./animals";
import { Animal2DRenderer } from "./Animal2D";
import type { FoxPelt, Palette } from "./types";
import { rgb, clamp, TAU } from "./types";

type PlayerEvent = "jump" | "dbl" | "land";

export class Player {
  /** Height above ground, in px */
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

  animal: AnimalDefinition = ANIMALS.fox;

  private coyote = 0;
  private buf = 0;
  private squash = 0;
  private stretch = 0;
  private slideTimer = 0;
  private stepT = 0;
  private currentLean = 0;

  constructor(private onEvent: (e: PlayerEvent) => void) {}

  setAnimal(animal: AnimalDefinition): void {
    this.animal = animal;
  }

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
    this.currentLean = 0;
  }

  pressJump(): void {
    this.buf = 0.14;
  }

  releaseJump(): void {
    // Variable jump height cut
    if (!this.dead && this.vy > 0) {
      this.vy *= 0.45;
    }
  }

  slideImpulse(): void {
    this.slideTimer = 0.55 * this.animal.physics.groundFriction;
  }

  die(): void {
    this.dead = true;
    this.deadT = 0;
  }

  /** World-space dynamic bounding hitbox [x0, y0, x1, y1] customized to animal physics */
  hb(x: number, gy: number): [number, number, number, number] {
    const phys = this.animal.physics;
    if (this.sliding) {
      return [
        x - phys.hitboxHalfWidth * 1.15,
        gy - this.py - phys.slideHeight,
        x + phys.hitboxHalfWidth * 1.15,
        gy - this.py,
      ];
    }
    return [
      x - phys.hitboxHalfWidth,
      gy - this.py - phys.hitboxHeight,
      x + phys.hitboxHalfWidth,
      gy - this.py - 4,
    ];
  }

  update(dt: number, slideHeld: boolean, speedPxPerSec: number): void {
    if (this.dead) {
      this.deadT += dt;
      return;
    }

    const phys = this.animal.physics;

    this.coyote -= dt;
    this.buf -= dt;
    this.slideTimer -= dt;
    this.ghostT -= dt;

    // Physical recovery from landing squash and takeoff stretch
    this.squash = Math.max(0, this.squash - dt * phys.landingRecovery);
    this.stretch = Math.max(0, this.stretch - dt * 5.5);

    // Dynamic jump takeoff with animal jumpForce profile
    if (this.buf > 0) {
      if (this.grounded || this.coyote > 0) {
        this.vy = phys.jumpForce;
        this.grounded = false;
        this.coyote = 0;
        this.buf = 0;
        this.jumps = 1;
        this.stretch = 1;
        this.onEvent("jump");
      } else if (this.jumps < 2) {
        this.vy = phys.doubleJumpForce;
        this.buf = 0;
        this.jumps = 2;
        this.stretch = 0.85;
        this.onEvent("dbl");
      }
    }

    // Realistic vertical ballistics & gravity
    if (!this.grounded) {
      const baseGravity = 2100;
      const g = baseGravity * phys.gravityMultiplier * (this.fastFall ? 2.5 : 1.0);
      this.vy = Math.max(this.vy - g * dt, -1550);
      this.py += this.vy * dt;

      // Realistic ground impact
      if (this.py <= 0) {
        this.py = 0;
        this.vy = 0;
        this.grounded = true;
        this.fastFall = false;
        this.jumps = 0;
        this.coyote = 0.09;
        // Compression proportional to animal mass
        this.squash = Math.min(1.4, phys.landingSquash * (phys.mass / 20));
        this.onEvent("land");
      }
    } else {
      this.py = 0;
      this.vy = 0;
    }

    this.sliding = ((slideHeld && this.grounded) || this.slideTimer > 0) && !this.dead;

    // Synchronize quadruped stride cadence with forward velocity and animal strideLength
    const cycleSpeed = (speedPxPerSec / phys.strideLength) * (this.sliding ? 0.6 : 1.0);
    this.runT += dt * cycleSpeed;

    // Smooth racing bank / lean based on turning agility
    const targetLean = this.grounded ? 0.04 : clamp(-this.vy * 0.00022, -0.22, 0.28);
    this.currentLean += (targetLean - this.currentLean) * Math.min(1, dt * phys.turnResponsiveness);
  }

  /** Footstep / slide timing helper */
  stepPulse(): boolean {
    const s = Math.floor(this.runT * 2.0);
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
    _legacyPelt?: FoxPelt,
  ): void {
    const fade = this.dead ? Math.max(0, 1 - this.deadT * 1.8) : 1;
    if (fade <= 0) return;

    const animal = this.animal;
    const id = animal.id;
    const phys = animal.physics;

    // ---- Multi-layered realistic contact ground shadow ----
    const shadowAlpha = 0.45 * Math.max(0, 1 - this.py / 450);
    if (shadowAlpha > 0.01) {
      const footRadius = (phys.hitboxHalfWidth + 12) * k;
      const shadowLength = (phys.hitboxHalfWidth * 1.8 - this.py * 0.035) * k;

      // Soft diffuse ambient ground shadow
      ctx.fillStyle = `rgba(0,0,0,${(shadowAlpha * 0.5).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(x, gy + 5 * k, Math.max(16, shadowLength), 8 * k, 0, 0, TAU);
      ctx.fill();

      // Tight direct contact shadow when close to ground
      if (this.py < 40) {
        const contactA = (1 - this.py / 40) * 0.55;
        ctx.fillStyle = `rgba(0,0,0,${contactA.toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(x, gy + 3 * k, footRadius, 4 * k, 0, 0, TAU);
        ctx.fill();
      }
    }


    // Moon Fox Celestial Aura or Ghost Bloom
    if (this.ghostT > 0 || id === "moon_fox") {
      const auraColor = this.ghostT > 0 ? pal.accent : [125, 211, 252] as [number, number, number];
      const flick = (this.ghostT > 0 ? 0.35 : 0.18) + Math.sin(time * 16) * 0.06;
      const gr = ctx.createRadialGradient(x, gy - this.py - 30, 4, x, gy - this.py - 30, 60);
      gr.addColorStop(0, rgb(auraColor, flick));
      gr.addColorStop(1, rgb(auraColor, 0));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, gy - this.py - 30, 60, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Masterclass 2D Animal Model Rendering
    ctx.save();
    ctx.globalAlpha = (this.ghostT > 0 ? 0.72 : (id === "moon_fox" ? 0.95 : 1)) * fade;
    Animal2DRenderer.render(ctx, x, gy - this.py, animal, {
      time,
      runCycle: this.runT,
      speed: this.grounded ? 360 : 0,
      isGrounded: this.grounded,
      vy: this.vy,
      isSliding: this.sliding,
      squash: this.squash,
      stretch: this.stretch,
      scale: k,
      rimColor: rgb(pal.rim, 0.75),
    });
    ctx.restore();
  }
}
