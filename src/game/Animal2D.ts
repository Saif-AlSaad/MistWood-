/* MistWood Masterclass 2D Realistic Animal Anatomy, Art & Animation System */

import type { AnimalDefinition } from "./animals";
import { TAU, clamp, lerp } from "./types";

export interface AnimalAnimParams {
  time: number;
  runCycle: number;
  speed: number;
  isGrounded: boolean;
  vy: number;
  isSliding: boolean;
  squash: number;
  stretch: number;
  scale: number;
  inspectTilt?: number; // -1 to 1 horizontal tilt during garage inspection
  inspectPitch?: number; // -1 to 1 vertical pitch during garage inspection
  rimColor?: string; // Celestial ambient rim light color from the world
  flipRotation?: number; // Double jump acrobatic front-flip rotation
}

function getFoxAssetUrl(path: string): string {
  const base = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "./").replace(/\/?$/, "/");
  const cleanPath = path.replace(/^\.?\//, "");
  return `${base}${cleanPath}`;
}

class FoxSpriteManager {
  static idleSheet: HTMLImageElement | null = null;
  static runSheet: HTMLImageElement | null = null;
  static jumpSheet: HTMLImageElement | null = null;
  static crouchSheet: HTMLImageElement | null = null;
  static initialized = false;

  private static loadSheet(path: string): HTMLImageElement {
    const img = new Image();
    const resolved = getFoxAssetUrl(path);
    img.src = resolved;
    img.onerror = () => {
      // Fallback in case relative path resolution is mismatched in hosting context
      const fallback = path.startsWith("/") ? path : `/${path}`;
      if (img.src !== fallback && !img.src.endsWith(path)) {
        img.src = fallback;
      }
    };
    return img;
  }

  static init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.idleSheet = this.loadSheet("assets/characters/fox/fox_idle.png");
    this.runSheet = this.loadSheet("assets/characters/fox/fox_run.png");
    this.jumpSheet = this.loadSheet("assets/characters/fox/fox_jump.png");
    this.crouchSheet = this.loadSheet("assets/characters/fox/extra/crouch.png");
    this.initialized = true;
  }

  static isReady(): boolean {
    this.init();
    // At minimum, idleSheet must be loaded to render the sprite fox
    return !!(this.idleSheet?.complete && this.idleSheet.naturalWidth > 0);
  }
}

// Preload immediately in browser context
if (typeof window !== "undefined") {
  FoxSpriteManager.init();
}

export class Animal2DRenderer {
  static renderFoxSprite(
    ctx: CanvasRenderingContext2D,
    anim: AnimalAnimParams,
    sx: number,
    sy: number
  ): boolean {
    if (!FoxSpriteManager.isReady()) {
      return false;
    }

    const { time, runCycle, speed, isGrounded, vy, isSliding, squash } = anim;

    let sheet: HTMLImageElement;
    let frameIdx = 0;

    if (isSliding && FoxSpriteManager.crouchSheet?.complete && FoxSpriteManager.crouchSheet.naturalWidth > 0) {
      sheet = FoxSpriteManager.crouchSheet;
      frameIdx = 0;
    } else if (!isGrounded && FoxSpriteManager.jumpSheet?.complete && FoxSpriteManager.jumpSheet.naturalWidth > 0) {
      sheet = FoxSpriteManager.jumpSheet;
      // 8-frame jump sequence based on ballistics:
      if (squash > 0.35) {
        frameIdx = 6; // Landing squash
      } else if (vy > 400) {
        frameIdx = 1; // Takeoff leap
      } else if (vy > 150) {
        frameIdx = 2; // Rising
      } else if (vy > -150) {
        frameIdx = 3; // Apex float
      } else if (vy > -400) {
        frameIdx = 4; // Descent
      } else {
        frameIdx = 5; // Falling reach
      }
    } else if (isGrounded && speed > 20 && FoxSpriteManager.runSheet?.complete && FoxSpriteManager.runSheet.naturalWidth > 0) {
      sheet = FoxSpriteManager.runSheet;
      frameIdx = Math.floor(runCycle * 8) % 8;
    } else if (FoxSpriteManager.idleSheet?.complete && FoxSpriteManager.idleSheet.naturalWidth > 0) {
      sheet = FoxSpriteManager.idleSheet;
      frameIdx = Math.floor(time * 8) % 8;
    } else {
      return false;
    }

    ctx.save();
    ctx.scale(sx, sy);

    // Uniform 128x128 frame parameters:
    // Foot baseline is at y = 112, center is at x = 64
    // 0.72 scale fits the 50px hitbox and ~48px body height in MistWood
    const spriteScale = 0.72;
    const drawW = 128 * spriteScale;
    const drawH = 128 * spriteScale;
    const drawX = -64 * spriteScale;
    const drawY = -112 * spriteScale;

    if (sheet === FoxSpriteManager.crouchSheet) {
      ctx.drawImage(sheet, 0, 0, 128, 128, drawX, drawY, drawW, drawH);
    } else {
      ctx.drawImage(sheet, frameIdx * 128, 0, 128, 128, drawX, drawY, drawW, drawH);
    }

    ctx.restore();
    return true;
  }

  /** Renders a realistic 2D quadruped animal with anatomical accuracy, layered fur markings, and dynamic gait */
  static render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    animal: AnimalDefinition,
    anim: AnimalAnimParams
  ): void {
    const { id } = animal;
    const {
      time,
      runCycle,
      speed,
      isGrounded,
      vy,
      isSliding,
      squash,
      stretch,
      scale,
      inspectTilt = 0,
      inspectPitch = 0,
      flipRotation = 0,
    } = anim;

    ctx.save();
    ctx.translate(x, y);

    // Dynamic lean, acrobatic flips & inspection tilt
    const runningLean = isGrounded && speed > 20 ? 0.05 : 0;
    const inAirPitch = !isGrounded ? clamp(-vy * 0.00024, -0.25, 0.28) : 0;
    const totalRotation = runningLean + inAirPitch + inspectPitch * 0.15 + flipRotation;
    ctx.rotate(totalRotation);

    // Squash & stretch deformation
    let sx = scale * (1 + squash * 0.28 - stretch * 0.1);
    let sy = scale * (1 - squash * 0.26 + stretch * 0.14);
    if (isSliding) {
      sx *= 1.22;
      sy *= 0.52;
    }
    // Inspection horizontal tilt compression
    sx *= 1 - Math.abs(inspectTilt) * 0.12;

    // 2D Cartoon Fox Sprite Integration:
    if (id === "fox" && Animal2DRenderer.renderFoxSprite(ctx, anim, sx, sy)) {
      ctx.restore();
      return;
    }

    ctx.scale(sx, sy);

    // Idle breathing & dynamic running bounce
    const isRunning = isGrounded && speed > 20;
    const bodyBob = isRunning
      ? Math.sin(runCycle * TAU) * (id === "deer" ? 3.4 : id === "panda" ? 2.0 : 2.6)
      : Math.sin(time * 2.2) * 1.2;

    ctx.save();
    ctx.translate(0, bodyBob);

    // 1. BACK LEGS (rendered behind body for natural depth)
    if (!isSliding) {
      this.renderLegs(ctx, animal, anim, bodyBob, true);
    }

    // 2. TAIL (multi-joint aerodynamic kinematic chain rendered behind body)
    this.renderTail(ctx, animal, anim, time);

    // 2.5 FAR EAR (rendered behind the cranium for true stereoscopic 3D depth)
    this.renderEars(ctx, animal, anim, time, true);

    // 3. MAIN ANATOMICAL BODY & MARKINGS
    this.renderTorsoAndHead(ctx, animal, anim, time);

    // 3.5 NEAR EAR (rendered in front of cranium with high-fidelity pinna and fluff)
    this.renderEars(ctx, animal, anim, time, false);

    // 4. FRONT LEGS (rendered in front of body for depth)
    if (!isSliding) {
      this.renderLegs(ctx, animal, anim, bodyBob, false);
    } else {
      // Sliding paws forward
      this.renderSlidingLegs(ctx, animal);
    }

    // 5. SPECIAL SPECIES DETAILS (Antlers, Lion Mane, Moon Fox Aura)
    if (id === "deer") {
      this.renderDeerAntlers(ctx, animal);
    } else if (id === "lion") {
      this.renderLionMane(ctx, animal, time, speed);
    } else if (id === "moon_fox") {
      this.renderMoonFoxCelestialEffects(ctx, animal, time);
    }

    // 5.5 DELICATE SNOUT WHISKERS (Secondary motion fluttering in airstream)
    this.renderWhiskers(ctx, animal, anim, time);

    // 6. EYE & SPECULAR GLEAM
    this.renderEye(ctx, animal);

    // 7. SLEEK CONTOUR RIM LIGHTING
    this.renderRimLight(ctx, animal, anim);

    ctx.restore(); // un-bob
    ctx.restore(); // un-translate/rotate
  }

  /* ------------------------------------------------------------ */
  /* LEGS & QUADRUPED GAIT KINEMATICS                              */
  /* ------------------------------------------------------------ */

  private static renderLegs(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    anim: AnimalAnimParams,
    bob: number,
    isBackLayer: boolean
  ): void {
    const { id, colors } = animal;
    const { runCycle, speed, isGrounded, vy } = anim;

    // Darker shading for back-layer legs to create realistic depth
    const legBaseColor = isBackLayer
      ? (colors.secondary || colors.body)
      : (colors.secondary || colors.body);
    ctx.strokeStyle = legBaseColor;
    ctx.fillStyle = legBaseColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Species-specific leg thickness
    const legWidth = id === "panda" ? 8.6 : id === "lion" ? 7.6 : id === "deer" ? 5.0 : 5.8;
    ctx.lineWidth = isBackLayer ? legWidth * 0.92 : legWidth;

    if (isBackLayer) {
      ctx.globalAlpha = 0.85;
    } else {
      ctx.globalAlpha = 1.0;
    }

    // Hips/Shoulder joint origins [X, Y]
    const hipX = id === "deer" ? -17 : id === "panda" ? -15 : -14;
    const hipY = id === "deer" ? -28 : id === "panda" ? -25 : -24;
    const shoulderX = id === "deer" ? 14 : id === "panda" ? 11 : 9;
    const shoulderY = id === "deer" ? -29 : id === "panda" ? -26 : -25;

    const isRunning = isGrounded && speed > 20;

    if (isRunning) {
      // Dynamic quadruped trot/gallop phase shift
      // Back layer uses opposite phase for diagonal symmetry
      const phaseOffset = isBackLayer ? Math.PI : 0;
      const th = runCycle * TAU + phaseOffset;

      // Foreleg
      const foreStride = id === "deer" ? 18 : id === "lion" ? 15 : 12;
      const foreLift = id === "deer" ? 18 : id === "panda" ? 11 : 14;
      const foreFootX = shoulderX + Math.cos(th) * foreStride;
      const foreFootY = -Math.max(0, Math.sin(th)) * foreLift;
      const foreKneeX = (shoulderX + foreFootX) / 2 + Math.sin(th) * -3;
      const foreKneeY = (shoulderY + bob + foreFootY) / 2;

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY + bob);
      ctx.quadraticCurveTo(foreKneeX, foreKneeY, foreFootX, foreFootY);
      ctx.stroke();

      // Hindleg
      const hindStride = id === "deer" ? 19 : id === "lion" ? 16 : 13;
      const hindLift = id === "deer" ? 17 : id === "panda" ? 10 : 13;
      const hindFootX = hipX + Math.cos(th + Math.PI * 0.85) * hindStride;
      const hindFootY = -Math.max(0, Math.sin(th + Math.PI * 0.85)) * hindLift;
      const hindHockX = (hipX + hindFootX) / 2 + Math.sin(th + Math.PI * 0.85) * 4;
      const hindHockY = (hipY + bob + hindFootY) / 2;

      ctx.beginPath();
      ctx.moveTo(hipX, hipY + bob);
      ctx.quadraticCurveTo(hindHockX, hindHockY, hindFootX, hindFootY);
      ctx.stroke();

      // Cloven Hooves for Deer / Paws for others
      this.renderFootEnd(ctx, foreFootX, foreFootY, id, colors.secondary);
      this.renderFootEnd(ctx, hindFootX, hindFootY, id, colors.secondary);

    } else if (isGrounded) {
      // Stance / Idle Leg Placement firmly on ground
      const foreX = shoulderX + (isBackLayer ? -3 : 2);
      const hindX = hipX + (isBackLayer ? -3 : 2);

      // Standing foreleg
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY + bob);
      ctx.quadraticCurveTo(foreX - 1, (shoulderY + bob) / 2, foreX, 0);
      ctx.stroke();

      // Standing hindleg
      ctx.beginPath();
      ctx.moveTo(hipX, hipY + bob);
      ctx.quadraticCurveTo(hindX + 2, (hipY + bob) / 2, hindX, 0);
      ctx.stroke();

      this.renderFootEnd(ctx, foreX, 0, id, colors.secondary);
      this.renderFootEnd(ctx, hindX, 0, id, colors.secondary);

    } else {
      // In-Air Flight Paws (rising = tucked, falling = reaching)
      const u = clamp(vy / 1100, -1, 1) * 0.5 + 0.5; // 0 rising -> 1 falling
      const foreTuckX = lerp(shoulderX + 16, shoulderX + 8, u);
      const foreTuckY = lerp(-14, -2, u);
      const hindTuckX = lerp(hipX - 12, hipX - 5, u);
      const hindTuckY = lerp(-11, -2, u);

      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.quadraticCurveTo(shoulderX + 5, shoulderY / 2, foreTuckX, foreTuckY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.quadraticCurveTo(hipX - 4, hipY / 2, hindTuckX, hindTuckY);
      ctx.stroke();

      this.renderFootEnd(ctx, foreTuckX, foreTuckY, id, colors.secondary);
      this.renderFootEnd(ctx, hindTuckX, hindTuckY, id, colors.secondary);
    }

    ctx.globalAlpha = 1.0;
  }

  private static renderFootEnd(
    ctx: CanvasRenderingContext2D,
    fx: number,
    fy: number,
    id: string,
    color?: string
  ): void {
    ctx.save();
    ctx.fillStyle = color || "#18181b";
    if (id === "deer") {
      // Cloven Hoof
      ctx.beginPath();
      ctx.ellipse(fx + 1, fy - 1, 3.2, 2.2, 0.2, 0, TAU);
      ctx.fill();
    } else {
      // Padded Paw
      const r = id === "panda" ? 4.5 : id === "lion" ? 4.2 : 3.2;
      ctx.beginPath();
      ctx.arc(fx + 1, fy - 1, r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private static renderSlidingLegs(ctx: CanvasRenderingContext2D, animal: AnimalDefinition): void {
    const { colors } = animal;
    ctx.strokeStyle = colors.secondary || colors.body;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    // Paws swept forward in skid
    ctx.beginPath();
    ctx.moveTo(10, -14);
    ctx.lineTo(24, 0);
    ctx.moveTo(-12, -14);
    ctx.lineTo(-24, 0);
    ctx.stroke();
  }

  /* ------------------------------------------------------------ */
  /* TAIL DYNAMICS & MULTI-JOINT AERODYNAMIC KINEMATIC CHAIN      */
  /* ------------------------------------------------------------ */

  private static renderTail(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    anim: AnimalAnimParams,
    time: number
  ): void {
    const { id, colors } = animal;
    const { isGrounded, speed, vy, isSliding } = anim;

    // Relative airspeed and aerodynamic drag
    const airspeed = Math.max(speed, 60);
    const windDrag = clamp((airspeed - 160) / 460, 0, 1.4);
    const streamX = -windDrag * 8.5; // Horizontal streaming lag
    const airFlutter = Math.sin(time * 26 + 1.2) * (windDrag * 1.6);

    // In-air vertical inertia & air resistance
    // On upward leap (vy < 0): heavy tail drags down relative to rising pelvis
    // On downward drop (vy > 0): upward air stream billows fluffy brush upward like a parachute
    const inAirLag = !isGrounded ? clamp(-vy * 0.016, -10, 10) : 0;
    const inAirBillow = !isGrounded ? clamp(vy * 0.024, 0, 14) : 0;
    const slideDrop = isSliding ? 13 : 0;

    // Quadruped gallop/trot gait wave frequency with traveling phase lag
    const gaitFreq = isGrounded && speed > 20 ? (speed / 360) * 8.6 : 3.4;
    const basePhase = time * gaitFreq;

    // 3-Joint Progressive Wave Delays (S-curve flow)
    const wave1 = Math.sin(basePhase) * 4.2 - inAirLag * 0.45 + inAirBillow * 0.5 + slideDrop * 0.5;
    const wave2 = Math.sin(basePhase - 0.75) * 5.8 - inAirLag * 0.75 + inAirBillow * 0.85 + slideDrop * 0.85 + airFlutter;
    const wave3 = Math.sin(basePhase - 1.5) * 7.2 - inAirLag * 1.05 + inAirBillow * 1.25 + slideDrop + airFlutter * 1.4;

    if (id === "fox" || id === "moon_fox") {
      // Fox / Moon Fox: Majestic, lush multi-tiered plume with aerodynamic trailing taper
      const rootX = -16;
      const rootY = -28;

      const j1X = -27 + streamX * 0.4;
      const j1Y = -34 + wave1 * 0.6;

      const j2X = -37 + streamX * 0.8;
      const j2Y = -26 + wave2 * 0.85;

      const tipX = -48 + streamX * 1.15;
      const tipY = -15 + wave3;

      // 1. Base thick root spine
      ctx.strokeStyle = colors.body;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 12.5;
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.quadraticCurveTo(j1X, j1Y, j2X, j2Y);
      ctx.stroke();

      // 2. Voluminous middle brush plume (widest fluffy section)
      ctx.lineWidth = 14.2;
      ctx.beginPath();
      ctx.moveTo(j1X, j1Y);
      ctx.quadraticCurveTo((j1X + j2X) * 0.5 - 2, (j1Y + j2Y) * 0.5, j2X, j2Y);
      ctx.stroke();

      // 3. Tapered tip connection
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.moveTo(j2X, j2Y);
      ctx.quadraticCurveTo((j2X + tipX) * 0.5 - 1, (j2Y + tipY) * 0.5, tipX, tipY);
      ctx.stroke();

      // 4. Iconic contrasting tip (white or celestial silver/cyan)
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(j2X + 2, j2Y + 1);
      ctx.quadraticCurveTo(j2X - 4, (j2Y + tipY) * 0.5, tipX - 2, tipY);
      ctx.arc(tipX, tipY, 4.8, 0, TAU);
      ctx.fill();

      // Moon Fox Starlight Embers streaming from tail plume
      if (id === "moon_fox" && (speed > 80 || !isGrounded)) {
        ctx.save();
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 3; i++) {
          const emPhase = (time * 6 + i * 2.1) % 1;
          const emX = tipX - emPhase * 28 - i * 6;
          const emY = tipY + Math.sin(time * 12 + i * 2) * 4 - emPhase * 8;
          const emR = (1 - emPhase) * 2.2;
          ctx.beginPath();
          ctx.arc(emX, emY, emR, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

    } else if (id === "lion") {
      // Panthera Leo: Long, muscular feline tail with expressive S-curve and whip-lagged pom-pom tuft
      const rootX = -18;
      const rootY = -27;

      const j1X = -28 + streamX * 0.35;
      const j1Y = -20 + wave1 * 0.4;

      const j2X = -38 + streamX * 0.75;
      const j2Y = -24 + wave2 * 0.7;

      const tipX = -46 + streamX * 1.05;
      const tipY = -18 + wave3 * 0.9;

      ctx.strokeStyle = colors.body;
      ctx.lineWidth = 5.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rootX, rootY);
      ctx.bezierCurveTo(j1X, j1Y, j2X, j2Y, tipX, tipY);
      ctx.stroke();

      // Signature dark tassel tuft at the terminal end
      ctx.fillStyle = colors.secondary || "#3d1b06";
      ctx.beginPath();
      ctx.ellipse(tipX, tipY, 6.6, 5.2, -0.3 + wave3 * 0.05, 0, TAU);
      ctx.fill();

      // Fine wisps at tip
      ctx.strokeStyle = colors.secondary || "#3d1b06";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - 4, tipY + 2);
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - 3, tipY - 3);
      ctx.stroke();

    } else if (id === "deer") {
      // Cervid: Short graceful white-tailed deer flag that raises & flicks alertly on jumps
      const rootX = -19;
      const rootY = -30;
      const alertLift = !isGrounded ? -6 : 0;
      const deerWave = wave1 * 0.35 + alertLift;

      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.ellipse(rootX - 2, rootY + deerWave, 4.4, 7.8, -0.45, 0, TAU);
      ctx.fill();

      // Contrasting white underside flashing
      ctx.fillStyle = colors.underbelly || "#f4f4f5";
      ctx.beginPath();
      ctx.ellipse(rootX - 3, rootY + deerWave, 2.9, 5.8, -0.45, 0, TAU);
      ctx.fill();

    } else if (id === "panda") {
      // Stubby rounded ursine tail with subtle springy step bounce
      const rootX = -18;
      const rootY = -27;
      const pandaWave = Math.sin(basePhase) * 1.8 + slideDrop * 0.3;

      ctx.fillStyle = colors.secondary || "#18181b";
      ctx.beginPath();
      ctx.arc(rootX, rootY + pandaWave, 6.2, 0, TAU);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------ */
  /* DYNAMIC SECONDARY EAR MOTION & STEREOSCOPIC 3D LAYERING     */
  /* ------------------------------------------------------------ */

  private static renderEars(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    anim: AnimalAnimParams,
    time: number,
    isBackLayer: boolean
  ): void {
    const { id, colors } = animal;
    const { speed, isGrounded, isSliding } = anim;

    // Aerodynamic layback from forward relative airspeed
    const speedRatio = clamp((speed - 180) / 480, 0, 1);
    let layback = speedRatio * 0.28;

    // Airborne alertness: ears stand erect and tilt forward to gauge jump trajectory
    if (!isGrounded) {
      layback -= 0.16;
    }

    // Sliding tuck: ears streamline flat back against skull to dodge low branches
    if (isSliding) {
      layback += 0.44;
    }

    // Involuntary wild animal micro-twitching (scanning the forest sounds)
    const twitchCycle = (time * 1.7 + (isBackLayer ? 2.1 : 0)) % 3.6;
    const twitch = twitchCycle < 0.15 ? Math.sin(twitchCycle * 42) * 0.14 : 0;

    const earRotation = layback + twitch;

    ctx.save();

    if (id === "fox" || id === "moon_fox") {
      // Vulpes vulpes: Large pointed triangular pinnae with dark backs and inner fur tufts
      const baseX = isBackLayer ? 13 : 23;
      const baseY = isBackLayer ? -52 : -53.5;
      const earScale = isBackLayer ? 0.90 : 1.0;

      ctx.translate(baseX, baseY);
      ctx.rotate(earRotation * (isBackLayer ? 0.88 : 1.0));
      ctx.scale(earScale, earScale);

      // Back layer is in shadow for 3D stereoscopic depth
      const earBodyColor = isBackLayer
        ? (colors.secondary || "#8a3411")
        : colors.body;

      // 1. Outer Ear Pinna Shell
      ctx.fillStyle = earBodyColor;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.quadraticCurveTo(-4, -10, 0, -15.5); // ear tip
      ctx.quadraticCurveTo(5, -9, 4, 0);
      ctx.closePath();
      ctx.fill();

      // 2. Dark Charcoal/Black Outer Rim Backing (classic fox ear mark)
      ctx.strokeStyle = "#18181b";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-3, -8);
      ctx.lineTo(0, -15.5);
      ctx.lineTo(3.5, -7);
      ctx.stroke();

      if (!isBackLayer) {
        // 3. Warm Inner Ear Canal Cavity
        ctx.fillStyle = colors.underbelly || "#fef3c7";
        ctx.beginPath();
        ctx.moveTo(-2.8, -1.5);
        ctx.quadraticCurveTo(-2, -7.5, 0, -12);
        ctx.quadraticCurveTo(2.4, -7, 2.2, -1.5);
        ctx.closePath();
        ctx.fill();

        // 4. Fluffy White Inner Fur Tufts (sprouting from ear canal)
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-1, -2);
        ctx.lineTo(-2, -6.5);
        ctx.moveTo(0.5, -2);
        ctx.lineTo(1, -7.2);
        ctx.stroke();
      }

    } else if (id === "deer") {
      // Cervid: Slender, graceful oval ears tilted outward
      const baseX = isBackLayer ? 15 : 24;
      const baseY = isBackLayer ? -62 : -64;
      const earScale = isBackLayer ? 0.90 : 1.0;

      ctx.translate(baseX, baseY);
      ctx.rotate(earRotation * (isBackLayer ? 0.82 : 1.0) - 0.22);
      ctx.scale(earScale, earScale);

      const earBodyColor = isBackLayer ? "#6e3f1c" : colors.body;

      // Outer Pinna
      ctx.fillStyle = earBodyColor;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(-5, -8, 0, -14);
      ctx.quadraticCurveTo(4.5, -8, 3.5, 0);
      ctx.closePath();
      ctx.fill();

      // Velvet Interior
      if (!isBackLayer) {
        ctx.fillStyle = colors.underbelly || "#e4d5b7";
        ctx.beginPath();
        ctx.moveTo(-2.2, -1);
        ctx.quadraticCurveTo(-2.8, -6.5, 0, -11);
        ctx.quadraticCurveTo(2.4, -6.5, 1.8, -1);
        ctx.closePath();
        ctx.fill();
      }

    } else if (id === "panda") {
      // Ursine: Rounded, velvety black ears
      const baseX = isBackLayer ? 15 : 25;
      const baseY = isBackLayer ? -54 : -56;
      const earScale = isBackLayer ? 0.90 : 1.0;

      ctx.translate(baseX, baseY);
      ctx.rotate(earRotation * 0.65);
      ctx.scale(earScale, earScale);

      ctx.fillStyle = colors.secondary || "#18181b";
      ctx.beginPath();
      ctx.arc(0, -6, 5.6, 0, TAU);
      ctx.fill();

      // Subtle edge sheen
      if (!isBackLayer) {
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(0, -6, 5.0, Math.PI * 0.75, Math.PI * 1.5);
        ctx.stroke();
      }

    } else if (id === "lion") {
      // Feline: Rounded tawny ears with black rear false-eye patch
      const baseX = isBackLayer ? 17 : 27;
      const baseY = isBackLayer ? -53 : -55;
      const earScale = isBackLayer ? 0.90 : 1.0;

      ctx.translate(baseX, baseY);
      ctx.rotate(earRotation * (isBackLayer ? 0.85 : 1.0));
      ctx.scale(earScale, earScale);

      ctx.fillStyle = isBackLayer ? "#855420" : colors.body;
      ctx.beginPath();
      ctx.arc(0, -5, 5.2, 0, TAU);
      ctx.fill();

      // Dark rear edge
      ctx.fillStyle = colors.secondary || "#221108";
      ctx.beginPath();
      ctx.arc(0, -5, 5.2, -Math.PI * 0.8, -Math.PI * 0.1);
      ctx.lineTo(0, -5);
      ctx.closePath();
      ctx.fill();

      // Inner ear fluff
      if (!isBackLayer) {
        ctx.fillStyle = colors.underbelly || "#f3e8d2";
        ctx.beginPath();
        ctx.arc(0, -4.5, 3.2, 0, TAU);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* ------------------------------------------------------------ */
  /* TORSO, HEAD & SPECIES SILHOUETTES                            */
  /* ------------------------------------------------------------ */

  private static renderTorsoAndHead(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    _anim: AnimalAnimParams,
    _time: number
  ): void {
    const { id, colors } = animal;
    const bodyPath = new Path2D();

    if (id === "fox" || id === "moon_fox") {
      // Sleek agile canine silhouette
      bodyPath.moveTo(-18, -23);
      bodyPath.bezierCurveTo(-22, -37, -12, -45, 0, -45); // arched spine
      bodyPath.bezierCurveTo(7, -45, 10, -47, 12, -51);   // neck
      bodyPath.bezierCurveTo(15, -56, 23, -57, 27, -53);   // brow
      bodyPath.bezierCurveTo(32, -50, 36, -46, 39, -42);   // muzzle
      bodyPath.lineTo(41, -41);                            // nose
      bodyPath.bezierCurveTo(35, -38, 31, -38, 27, -38);   // jaw
      bodyPath.bezierCurveTo(21, -37, 19, -34, 16, -32);   // throat
      bodyPath.bezierCurveTo(13, -27, 11, -25, 6, -23);    // chest/belly
      bodyPath.bezierCurveTo(-2, -19, -11, -19, -18, -23);
      bodyPath.closePath();

      ctx.fillStyle = colors.body;
      ctx.fill(bodyPath);

      // White chest bib
      ctx.fillStyle = colors.underbelly;
      ctx.beginPath();
      ctx.ellipse(18, -37, 7.5, 10.5, 0.4, 0, TAU);
      ctx.fill();

      // White cheek / jaw tuft
      ctx.beginPath();
      ctx.ellipse(28, -44, 4.5, 5.0, 0.2, 0, TAU);
      ctx.fill();

      // Dark nose tip
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(41, -41, 1.8, 0, TAU);
      ctx.fill();

    } else if (id === "deer") {
      // Slender graceful cervid silhouette with long neck
      bodyPath.moveTo(-20, -26);
      bodyPath.bezierCurveTo(-23, -39, -11, -47, 2, -47);  // back
      bodyPath.bezierCurveTo(9, -47, 12, -52, 15, -61);    // graceful neck rising
      bodyPath.bezierCurveTo(18, -69, 26, -70, 31, -65);   // crown
      bodyPath.bezierCurveTo(36, -62, 41, -57, 45, -52);   // slender muzzle
      bodyPath.lineTo(47, -51);                            // dark nose tip
      bodyPath.bezierCurveTo(40, -48, 35, -48, 30, -49);   // chin
      bodyPath.bezierCurveTo(24, -47, 20, -38, 17, -34);   // throat
      bodyPath.bezierCurveTo(14, -28, 12, -26, 6, -24);    // chest/belly
      bodyPath.bezierCurveTo(-3, -20, -12, -20, -20, -26);
      bodyPath.closePath();

      ctx.fillStyle = colors.body;
      ctx.fill(bodyPath);

      // White throat & belly patch
      ctx.fillStyle = colors.underbelly;
      ctx.beginPath();
      ctx.ellipse(19, -44, 4.0, 9.0, 0.45, 0, TAU);
      ctx.fill();

      // Dappled fawn spots along flank
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      const spots = [[-9, -35], [-3, -37], [3, -36], [-6, -30], [0, -31], [6, -32]];
      for (const [sx, sy] of spots) {
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, TAU);
        ctx.fill();
      }

      // Nose
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(47, -51, 1.6, 0, TAU);
      ctx.fill();

    } else if (id === "panda") {
      // Robust round bear silhouette
      bodyPath.moveTo(-21, -25);
      bodyPath.bezierCurveTo(-25, -42, -10, -51, 4, -51);  // broad back
      bodyPath.bezierCurveTo(11, -51, 14, -52, 16, -54);   // thick neck
      bodyPath.bezierCurveTo(19, -58, 27, -59, 32, -55);   // broad cranium
      bodyPath.bezierCurveTo(36, -52, 39, -48, 41, -44);   // blunt snout
      bodyPath.lineTo(42, -43);
      bodyPath.bezierCurveTo(37, -40, 33, -40, 29, -40);
      bodyPath.bezierCurveTo(24, -38, 22, -34, 18, -31);
      bodyPath.bezierCurveTo(15, -26, 13, -23, 7, -21);
      bodyPath.bezierCurveTo(-2, -18, -12, -18, -21, -25);
      bodyPath.closePath();

      // White Body Base
      ctx.fillStyle = "#f4f4f5";
      ctx.fill(bodyPath);

      // Iconic Black Shoulder Band Wrapping Around
      ctx.fillStyle = "#18181b";
      ctx.beginPath();
      ctx.ellipse(8, -35, 12, 17, 0.25, 0, TAU);
      ctx.fill();

      // Bold Black Eye Patch
      ctx.beginPath();
      ctx.ellipse(31, -50, 4.5, 6.0, 0.4, 0, TAU);
      ctx.fill();

      // Black blunt nose
      ctx.beginPath();
      ctx.arc(42, -43, 2.2, 0, TAU);
      ctx.fill();

    } else if (id === "lion") {
      // Powerful muscular feline silhouette
      bodyPath.moveTo(-21, -26);
      bodyPath.bezierCurveTo(-24, -42, -11, -48, 4, -48);  // muscular back
      bodyPath.bezierCurveTo(12, -48, 16, -50, 19, -55);   // powerful neck
      bodyPath.bezierCurveTo(23, -59, 31, -60, 36, -56);   // brow
      bodyPath.bezierCurveTo(40, -52, 43, -48, 45, -43);   // strong jaw
      bodyPath.lineTo(46, -42);
      bodyPath.bezierCurveTo(41, -39, 36, -39, 32, -39);
      bodyPath.bezierCurveTo(26, -37, 23, -33, 19, -30);
      bodyPath.bezierCurveTo(15, -25, 13, -23, 7, -21);
      bodyPath.bezierCurveTo(-2, -18, -12, -18, -21, -26);
      bodyPath.closePath();

      ctx.fillStyle = colors.body;
      ctx.fill(bodyPath);

      // Nose
      ctx.fillStyle = "#221108";
      ctx.beginPath();
      ctx.arc(46, -42, 2.0, 0, TAU);
      ctx.fill();
    }
  }

  /* ------------------------------------------------------------ */
  /* SPECIES SPECIAL GRAPHICS: ANTLERS, MANE, MOON FOX AURA       */
  /* ------------------------------------------------------------ */

  private static renderDeerAntlers(ctx: CanvasRenderingContext2D, animal: AnimalDefinition): void {
    const antlerColor = animal.colors.antlers || "#e7d9c6";
    ctx.strokeStyle = antlerColor;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    // Main Beam 1 (arching back and up)
    ctx.moveTo(23, -68);
    ctx.bezierCurveTo(19, -80, 14, -88, 9, -96);
    // Brow tine
    ctx.moveTo(21, -73);
    ctx.lineTo(28, -79);
    // Crown tips
    ctx.moveTo(14, -86);
    ctx.lineTo(8, -91);
    ctx.moveTo(11, -92);
    ctx.lineTo(17, -98);

    // Main Beam 2 (secondary beam for natural depth)
    ctx.moveTo(27, -67);
    ctx.bezierCurveTo(29, -82, 27, -90, 22, -97);
    // Brow tine 2
    ctx.moveTo(28, -74);
    ctx.lineTo(34, -79);
    // Crown tips 2
    ctx.moveTo(25, -88);
    ctx.lineTo(30, -94);
    ctx.stroke();
  }

  private static renderLionMane(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    time: number,
    speed = 360
  ): void {
    const maneColor = animal.colors.mane || "#451a03";
    ctx.fillStyle = maneColor;

    // Organic wavy flowing mane around head, neck and shoulders with aerodynamic trailing flow
    const speedWave = (speed / 360) * 2.2;
    const wave = Math.sin(time * (4.5 + speedWave * 2)) * (1.5 + speedWave);

    ctx.beginPath();
    ctx.ellipse(17, -46, 16 + wave * 0.5, 19, 0.35, 0, TAU);
    ctx.fill();

    // Layered mane tufts catching light & rippling backward in airstream
    ctx.fillStyle = "#632707";
    ctx.beginPath();
    ctx.ellipse(14 - speedWave, -48, 11, 14, 0.4, 0, TAU);
    ctx.fill();

    // Trailing mane locks whipping in wind
    ctx.strokeStyle = maneColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(9, -42);
    ctx.quadraticCurveTo(1 - speedWave * 2, -40 + wave, -4 - speedWave * 3, -36 + wave * 1.4);
    ctx.moveTo(11, -50);
    ctx.quadraticCurveTo(2 - speedWave * 2, -51 + wave * 0.8, -3 - speedWave * 2.5, -48 + wave * 1.2);
    ctx.stroke();
  }

  /* ------------------------------------------------------------ */
  /* DELICATE SNOUT WHISKERS & AIRFLOW MICRO-VIBRATION            */
  /* ------------------------------------------------------------ */

  private static renderWhiskers(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    anim: AnimalAnimParams,
    time: number
  ): void {
    const { id } = animal;
    if (id !== "fox" && id !== "moon_fox" && id !== "lion") return;

    const { speed } = anim;
    const snoutX = id === "lion" ? 44 : 39;
    const snoutY = id === "lion" ? -42 : -41;

    // High frequency micro-vibrations in airstream
    const flutter = Math.sin(time * 36) * (0.8 + speed / 400);

    ctx.save();
    ctx.strokeStyle = id === "moon_fox" ? "rgba(186,230,253,0.7)" : "rgba(255,255,255,0.55)";
    ctx.lineWidth = 0.85;
    ctx.lineCap = "round";

    // 3 subtle whisker hairs curling forward & down
    ctx.beginPath();
    // Whisker 1 (upper)
    ctx.moveTo(snoutX, snoutY - 1);
    ctx.quadraticCurveTo(snoutX + 5, snoutY - 3 + flutter, snoutX + 11, snoutY - 2 + flutter * 1.2);
    // Whisker 2 (middle)
    ctx.moveTo(snoutX + 1, snoutY);
    ctx.quadraticCurveTo(snoutX + 6, snoutY + flutter * 0.8, snoutX + 13, snoutY + 2 + flutter);
    // Whisker 3 (lower)
    ctx.moveTo(snoutX, snoutY + 1.5);
    ctx.quadraticCurveTo(snoutX + 5, snoutY + 4 + flutter * 0.6, snoutX + 10, snoutY + 6 + flutter * 0.9);
    ctx.stroke();

    ctx.restore();
  }

  private static renderMoonFoxCelestialEffects(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    time: number
  ): void {
    const accent = animal.colors.accent;

    // Luminous crescent moon crest on forehead
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(28, -55, 3.2, -Math.PI * 0.3, Math.PI * 0.85);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Orbiting celestial starlight motes
    ctx.fillStyle = accent;
    const numMotes = 5;
    for (let i = 0; i < numMotes; i++) {
      const angle = time * 2.5 + (i * TAU) / numMotes;
      const radius = 22 + Math.sin(time * 4 + i) * 6;
      const mx = 6 + Math.cos(angle) * radius;
      const my = -32 + Math.sin(angle) * (radius * 0.5);
      const alpha = 0.4 + Math.sin(time * 5 + i * 2) * 0.35;

      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(mx, my, 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }

  /* ------------------------------------------------------------ */
  /* EYE & RIM LIGHTING                                            */
  /* ------------------------------------------------------------ */

  private static renderEye(ctx: CanvasRenderingContext2D, animal: AnimalDefinition): void {
    const { id, colors } = animal;
    const eyeX = id === "deer" ? 35 : id === "panda" ? 31.5 : id === "lion" ? 37 : 32.5;
    const eyeY = id === "deer" ? -59 : id === "panda" ? -50 : id === "lion" ? -50 : -49;

    // Glowing Iris
    ctx.fillStyle = colors.eyes;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 1.8, 0, TAU);
    ctx.fill();

    // Pupil
    ctx.fillStyle = "#09090b";
    ctx.beginPath();
    ctx.arc(eyeX + 0.2, eyeY, 1.0, 0, TAU);
    ctx.fill();

    // Sharp specular gleam
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(eyeX + 0.4, eyeY - 0.5, 0.65, 0, TAU);
    ctx.fill();
  }

  private static renderRimLight(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    anim?: AnimalAnimParams
  ): void {
    const { id, colors } = animal;
    // Sleek contour highlight on back reflecting world celestial rim lighting
    ctx.strokeStyle = anim?.rimColor || colors.accent;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.globalAlpha = id === "moon_fox" ? 0.85 : 0.55;

    ctx.beginPath();
    if (id === "deer") {
      ctx.moveTo(-16, -46);
      ctx.quadraticCurveTo(2, -47, 14, -60);
    } else if (id === "panda") {
      ctx.moveTo(-18, -48);
      ctx.quadraticCurveTo(3, -51, 16, -53);
    } else if (id === "lion") {
      ctx.moveTo(-17, -46);
      ctx.quadraticCurveTo(4, -47, 18, -54);
    } else {
      ctx.moveTo(-16, -44);
      ctx.quadraticCurveTo(0, -45, 12, -50);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}
