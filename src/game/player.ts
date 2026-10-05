/* MistWood Runner Animal Player — Realistic Quadruped Anatomy, Physics Profiles & Dynamic Movement */

import type { AnimalDefinition } from "./animals";
import { ANIMALS } from "./animals";
import type { FoxPelt, Palette } from "./types";
import { rgb, clamp, lerp, TAU } from "./types";

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
    const colors = animal.colors;
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

    ctx.save();
    ctx.translate(x, gy - this.py);
    ctx.rotate(this.currentLean);

    // Squash & Stretch deformation
    let sx = k * (1 + this.squash * 0.3 - this.stretch * 0.1);
    let sy = k * (1 - this.squash * 0.28 + this.stretch * 0.15);
    if (this.sliding) {
      sx *= 1.2;
      sy *= 0.52;
    }
    ctx.scale(sx, sy);
    ctx.globalAlpha = (this.ghostT > 0 ? 0.72 : (id === "moon_fox" ? 0.95 : 1)) * fade;

    // Moon Fox Celestial Aura or Ghost Bloom
    if (this.ghostT > 0 || id === "moon_fox") {
      const auraColor = this.ghostT > 0 ? pal.accent : [125, 211, 252] as [number, number, number];
      const flick = (this.ghostT > 0 ? 0.35 : 0.18) + Math.sin(time * 16) * 0.06;
      const gr = ctx.createRadialGradient(0, -30, 4, 0, -30, 60);
      gr.addColorStop(0, rgb(auraColor, flick));
      gr.addColorStop(1, rgb(auraColor, 0));
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, -30, 60, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    const bob = this.grounded ? Math.sin(this.runT * TAU) * 2.2 : 0;

    // ---- Quadruped Legs (Stroked Anatomical Trot/Gallop Gait) ----
    if (!this.sliding) {
      const legColor = colors.secondary || colors.body;
      ctx.strokeStyle = legColor;
      ctx.lineCap = "round";
      ctx.lineWidth = id === "panda" ? 8.5 : id === "lion" ? 7.8 : id === "deer" ? 5.2 : 6.0;
      ctx.beginPath();

      if (this.grounded) {
        // 4-Leg Phase Offsets [FrontLeft, FrontRight, RearLeft, RearRight]
        const legOffsets: Array<[number, number]> = [
          [10, -26],
          [6, -26],
          [-14, -25],
          [-10, -25],
        ];
        const phaseShift = [0, 0.5, 0.5, 0];

        for (let i = 0; i < 4; i++) {
          const th = (this.runT + phaseShift[i]) * TAU;
          const strideSpread = id === "deer" ? 16 : id === "lion" ? 14 : 11;
          const fx = legOffsets[i][0] + Math.cos(th) * strideSpread;
          const liftHeight = id === "deer" ? 17 : id === "panda" ? 11 : 14;
          const fy = -Math.max(0, Math.sin(th)) * liftHeight - 1;
          const kneeX = (legOffsets[i][0] + fx) / 2 + Math.sin(th) * -3;
          const kneeY = (legOffsets[i][1] + bob + fy) / 2;

          ctx.moveTo(legOffsets[i][0], legOffsets[i][1] + bob);
          ctx.quadraticCurveTo(kneeX, kneeY, fx, fy);
        }
      } else {
        // In-Air Leaping Pose
        const flightRatio = clamp(this.vy / 1100, -1, 1) * 0.5 + 0.5; // 0 rising -> 1 falling
        const flightFeet: Array<[number, number, number, number]> = [
          [10, -26, lerp(30, 18, flightRatio), lerp(-12, -2, flightRatio)],
          [6, -26, lerp(14, 8, flightRatio), lerp(-16, -6, flightRatio)],
          [-14, -25, lerp(-24, -16, flightRatio), lerp(-8, -1, flightRatio)],
          [-10, -25, lerp(0, -3, flightRatio), lerp(-14, -7, flightRatio)],
        ];
        for (const [hx, hy, fx2, fy2] of flightFeet) {
          ctx.moveTo(hx, hy);
          ctx.quadraticCurveTo((hx + fx2) / 2 - 2, (hy + fy2) / 2, fx2, fy2);
        }
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(0, bob);

    // ---- Tail (Species-Specific Anatomy & Wave Dynamics) ----
    const tailWave = Math.sin(time * 6.0 + 1.2) * 3.5 + (this.grounded ? 0 : -6) + (this.sliding ? 10 : 0);

    if (id === "fox" || id === "moon_fox") {
      // Bushy Plume Tail
      ctx.strokeStyle = colors.body;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.lineWidth = 11;
      ctx.moveTo(-15, -31);
      ctx.quadraticCurveTo(-28, -35 + tailWave * 0.4, -34, -28 + tailWave * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 7.8;
      ctx.moveTo(-34, -28 + tailWave * 0.7);
      ctx.quadraticCurveTo(-39, -22 + tailWave, -42, -14 + tailWave);
      ctx.stroke();

      // Tail Tip Accent
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(-42, -13 + tailWave, 5.0, 0, TAU);
      ctx.fill();
    } else if (id === "lion") {
      // Long Muscular Tail with Dark Tuft
      ctx.strokeStyle = colors.body;
      ctx.lineCap = "round";
      ctx.lineWidth = 5.2;
      ctx.beginPath();
      ctx.moveTo(-18, -30);
      ctx.quadraticCurveTo(-32, -36 + tailWave * 0.5, -38, -24 + tailWave * 0.8);
      ctx.stroke();

      // Dark Fur Tuft at Tip
      ctx.fillStyle = colors.secondary || "#3d1b06";
      ctx.beginPath();
      ctx.arc(-38, -23 + tailWave * 0.8, 6.2, 0, TAU);
      ctx.fill();
    } else if (id === "deer") {
      // Short White-Bordered Tail
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.ellipse(-18, -32 + tailWave * 0.3, 4, 7, -0.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = colors.underbelly;
      ctx.beginPath();
      ctx.ellipse(-19, -32 + tailWave * 0.3, 2.5, 5, -0.4, 0, TAU);
      ctx.fill();
    } else if (id === "panda") {
      // Round Black Tail
      ctx.fillStyle = colors.secondary || "#18181b";
      ctx.beginPath();
      ctx.arc(-18, -28 + tailWave * 0.2, 5.5, 0, TAU);
      ctx.fill();
    }

    // ---- Body & Head Silhouette (Species-Specific Anatomy) ----
    const bodyPath = new Path2D();

    if (id === "fox" || id === "moon_fox") {
      // Sleek Agile Canine Silhouette
      bodyPath.moveTo(-18, -24);
      bodyPath.bezierCurveTo(-21, -38, -12, -45, 0, -45); // back
      bodyPath.bezierCurveTo(7, -45, 10, -47, 12, -51);   // neck
      bodyPath.bezierCurveTo(15, -56, 23, -57, 27, -53);   // brow
      bodyPath.bezierCurveTo(32, -50, 36, -46, 39, -42);   // snout
      bodyPath.lineTo(41, -41);                            // nose tip
      bodyPath.bezierCurveTo(35, -38, 31, -38, 27, -38);   // jaw
      bodyPath.bezierCurveTo(21, -37, 19, -34, 16, -32);   // throat
      bodyPath.bezierCurveTo(13, -27, 11, -25, 6, -23);    // chest/belly
      bodyPath.bezierCurveTo(-2, -19, -11, -19, -18, -24); // belly -> rump
      bodyPath.closePath();

      // Pointed Ears
      bodyPath.moveTo(11, -53);
      bodyPath.lineTo(14, -65);
      bodyPath.lineTo(20, -54.5);
      bodyPath.closePath();
      bodyPath.moveTo(20, -54.5);
      bodyPath.lineTo(24.5, -64.5);
      bodyPath.lineTo(28, -54);
      bodyPath.closePath();

      ctx.fillStyle = colors.body;
      ctx.fill(bodyPath);

      // White Chest Bib
      ctx.fillStyle = colors.underbelly;
      ctx.beginPath();
      ctx.ellipse(18, -37, 7, 10, 0.4, 0, TAU);
      ctx.fill();
    } else if (id === "deer") {
      // Slender Graceful Cervid Silhouette
      bodyPath.moveTo(-19, -27);
      bodyPath.bezierCurveTo(-22, -40, -11, -47, 2, -47);  // arched back
      bodyPath.bezierCurveTo(9, -47, 12, -52, 15, -60);    // long graceful neck
      bodyPath.bezierCurveTo(18, -68, 26, -69, 31, -64);   // head crown
      bodyPath.bezierCurveTo(36, -61, 41, -56, 44, -51);   // slender muzzle
      bodyPath.lineTo(46, -50);                            // nose
      bodyPath.bezierCurveTo(39, -47, 34, -47, 29, -48);   // chin
      bodyPath.bezierCurveTo(23, -46, 20, -38, 17, -34);   // throat
      bodyPath.bezierCurveTo(14, -28, 12, -26, 6, -24);    // chest -> belly
      bodyPath.bezierCurveTo(-3, -20, -12, -20, -19, -27);
      bodyPath.closePath();

      // Slender Ears
      bodyPath.moveTo(15, -63);
      bodyPath.lineTo(18, -74);
      bodyPath.lineTo(23, -64);
      bodyPath.closePath();

      ctx.fillStyle = colors.body;
      ctx.fill(bodyPath);

      // Antlers (Majestic Multi-Tined Branching Antlers)
      ctx.strokeStyle = colors.antlers || "#dfcfb8";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      // Main Beam
      ctx.moveTo(22, -67);
      ctx.quadraticCurveTo(17, -84, 12, -92);
      ctx.moveTo(25, -66);
      ctx.quadraticCurveTo(28, -85, 23, -93);
      // Brow Tines
      ctx.moveTo(20, -73);
      ctx.lineTo(27, -79);
      // Crown Tines
      ctx.moveTo(15, -83);
      ctx.lineTo(9, -89);
      ctx.moveTo(25, -83);
      ctx.lineTo(31, -89);
      ctx.stroke();

      // Dappled Flank Spots
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      for (const [sx2, sy2] of [[-8, -35], [-2, -37], [4, -36], [-5, -30], [1, -31]]) {
        ctx.beginPath();
        ctx.arc(sx2, sy2, 1.4, 0, TAU);
        ctx.fill();
      }
    } else if (id === "panda") {
      // Round Robust Ursid Silhouette
      bodyPath.moveTo(-20, -25);
      bodyPath.bezierCurveTo(-24, -42, -10, -50, 4, -50);   // broad rounded back
      bodyPath.bezierCurveTo(11, -50, 14, -51, 16, -53);   // thick neck
      bodyPath.bezierCurveTo(19, -57, 27, -58, 31, -54);   // broad brow
      bodyPath.bezierCurveTo(35, -51, 38, -47, 40, -43);   // blunt snout
      bodyPath.lineTo(41, -42);
      bodyPath.bezierCurveTo(36, -39, 32, -39, 28, -39);
      bodyPath.bezierCurveTo(23, -37, 21, -33, 17, -30);
      bodyPath.bezierCurveTo(14, -25, 12, -22, 6, -20);
      bodyPath.bezierCurveTo(-3, -17, -12, -17, -20, -25);
      bodyPath.closePath();

      // Rounded Bear Ears
      bodyPath.moveTo(14, -53);
      bodyPath.arc(17, -61, 5.0, 0, TAU);
      bodyPath.moveTo(24, -54);
      bodyPath.arc(27, -62, 5.0, 0, TAU);

      // White Body Base
      ctx.fillStyle = "#f4f4f5";
      ctx.fill(bodyPath);

      // Bold Black Shoulder Saddle Band
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.ellipse(8, -34, 11, 16, 0.25, 0, TAU);
      ctx.fill();

      // Bold Black Eye Patch
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.ellipse(30, -49, 4.2, 5.5, 0.4, 0, TAU);
      ctx.fill();
    } else if (id === "lion") {
      // Muscular Feline Silhouette
      bodyPath.moveTo(-20, -26);
      bodyPath.bezierCurveTo(-23, -41, -11, -47, 4, -47);   // muscular back
      bodyPath.bezierCurveTo(12, -47, 16, -49, 19, -54);   // powerful neck
      bodyPath.bezierCurveTo(23, -58, 30, -59, 35, -55);   // broad feline brow
      bodyPath.bezierCurveTo(39, -51, 42, -47, 44, -42);   // strong jaw
      bodyPath.lineTo(45, -41);
      bodyPath.bezierCurveTo(40, -38, 35, -38, 31, -38);
      bodyPath.bezierCurveTo(25, -36, 22, -32, 18, -29);
      bodyPath.bezierCurveTo(14, -24, 12, -22, 6, -20);
      bodyPath.bezierCurveTo(-3, -17, -12, -17, -20, -26);
      bodyPath.closePath();

      // Ears
      bodyPath.moveTo(17, -54);
      bodyPath.arc(20, -60, 4.5, 0, TAU);

      ctx.fillStyle = colors.body;
      ctx.fill(bodyPath);

      // Luxurious Voluminous Dark-Gold Mane
      ctx.fillStyle = colors.mane || "#451a03";
      ctx.beginPath();
      ctx.ellipse(17, -46, 15, 18, 0.35, 0, TAU);
      ctx.fill();
    }

    // Glowing Expressive Eye
    const eyeX = id === "deer" ? 34 : id === "panda" ? 31 : id === "lion" ? 36 : 32;
    const eyeY = id === "deer" ? -58 : id === "panda" ? -49 : id === "lion" ? -49 : -48;

    ctx.fillStyle = colors.eyes;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 1.7, 0, TAU);
    ctx.fill();

    // Specular Catchlight
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(eyeX + 0.4, eyeY - 0.4, 0.6, 0, TAU);
    ctx.fill();

    // Species Accent Rim Shimmer
    ctx.strokeStyle = colors.accent;
    ctx.globalAlpha = (this.ghostT > 0 ? 0.9 : id === "moon_fox" ? 0.75 : 0.4) * fade;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.stroke(bodyPath);

    ctx.restore(); // un-bob
    ctx.restore();
  }
}
