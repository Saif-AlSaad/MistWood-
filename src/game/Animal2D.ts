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

export class Animal2DRenderer {
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

    // 2. TAIL (rendered behind body)
    this.renderTail(ctx, animal, anim, time);

    // 3. MAIN ANATOMICAL BODY & MARKINGS
    this.renderTorsoAndHead(ctx, animal, anim, time);

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
      this.renderLionMane(ctx, animal, time);
    } else if (id === "moon_fox") {
      this.renderMoonFoxCelestialEffects(ctx, animal, time);
    }

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
  /* TAIL DYNAMICS                                                 */
  /* ------------------------------------------------------------ */

  private static renderTail(
    ctx: CanvasRenderingContext2D,
    animal: AnimalDefinition,
    anim: AnimalAnimParams,
    time: number
  ): void {
    const { id, colors } = animal;
    const { isGrounded, speed, isSliding } = anim;

    const waveSpeed = isGrounded && speed > 20 ? 7.2 : 3.2;
    const waveAmp = isGrounded && speed > 20 ? 4.5 : 2.5;
    const tailWave = Math.sin(time * waveSpeed + 1.2) * waveAmp + (isGrounded ? 0 : -6) + (isSliding ? 12 : 0);

    if (id === "fox" || id === "moon_fox") {
      // Bushy organic plume tail with tapered layers
      ctx.strokeStyle = colors.body;
      ctx.lineCap = "round";

      // Base thick curve
      ctx.lineWidth = 12.5;
      ctx.beginPath();
      ctx.moveTo(-16, -30);
      ctx.quadraticCurveTo(-28, -35 + tailWave * 0.4, -36, -28 + tailWave * 0.7);
      ctx.stroke();

      // Middle brush
      ctx.lineWidth = 9.0;
      ctx.beginPath();
      ctx.moveTo(-36, -28 + tailWave * 0.7);
      ctx.quadraticCurveTo(-42, -22 + tailWave, -46, -14 + tailWave);
      ctx.stroke();

      // Contrasting White/Accent Tip
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(-46, -13 + tailWave, 5.2, 0, TAU);
      ctx.fill();

    } else if (id === "lion") {
      // Long muscular feline tail curving down then up
      ctx.strokeStyle = colors.body;
      ctx.lineWidth = 5.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-18, -29);
      ctx.quadraticCurveTo(-32, -36 + tailWave * 0.5, -40, -23 + tailWave * 0.8);
      ctx.stroke();

      // Dark fur tuft at tip
      ctx.fillStyle = colors.secondary || "#3d1b06";
      ctx.beginPath();
      ctx.arc(-40, -22 + tailWave * 0.8, 6.8, 0, TAU);
      ctx.fill();

    } else if (id === "deer") {
      // Short graceful flicking tail with white underside
      ctx.fillStyle = colors.body;
      ctx.beginPath();
      ctx.ellipse(-19, -32 + tailWave * 0.25, 4.2, 7.5, -0.4, 0, TAU);
      ctx.fill();

      ctx.fillStyle = colors.underbelly;
      ctx.beginPath();
      ctx.ellipse(-20, -32 + tailWave * 0.25, 2.8, 5.5, -0.4, 0, TAU);
      ctx.fill();

    } else if (id === "panda") {
      // Short rounded bear tail
      ctx.fillStyle = colors.secondary || "#18181b";
      ctx.beginPath();
      ctx.arc(-18, -27 + tailWave * 0.2, 6.0, 0, TAU);
      ctx.fill();
    }
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

      // Pointed ears
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

      // Elegant ears
      bodyPath.moveTo(15, -64);
      bodyPath.lineTo(18, -76);
      bodyPath.lineTo(23, -65);
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

      // Round furry bear ears
      bodyPath.moveTo(14, -54);
      bodyPath.arc(17, -62, 5.5, 0, TAU);
      bodyPath.moveTo(24, -55);
      bodyPath.arc(28, -63, 5.5, 0, TAU);

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

      // Rounded feline ears
      bodyPath.moveTo(18, -55);
      bodyPath.arc(21, -61, 4.8, 0, TAU);

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

  private static renderLionMane(ctx: CanvasRenderingContext2D, animal: AnimalDefinition, time: number): void {
    const maneColor = animal.colors.mane || "#451a03";
    ctx.fillStyle = maneColor;

    // Organic wavy flowing mane around head, neck and shoulders
    const wave = Math.sin(time * 3.5) * 1.5;
    ctx.beginPath();
    ctx.ellipse(17, -46, 16 + wave * 0.5, 19, 0.35, 0, TAU);
    ctx.fill();

    // Layered mane tufts catching light
    ctx.fillStyle = "#632707";
    ctx.beginPath();
    ctx.ellipse(14, -48, 11, 14, 0.4, 0, TAU);
    ctx.fill();
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
