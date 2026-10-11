/* Living Forest Wildlife System — distant stags, perched birds that startle into flight, and soaring raptors */

import type { Palette } from "./types";
import { TAU, clamp, hash, mix, rand, rgb } from "./types";

interface StartledBird {
  x: number; // world x
  y: number; // relative to groundY
  baseY: number;
  vx: number;
  vy: number;
  wingPhase: number;
  wingSpeed: number;
  scale: number;
  state: "perched" | "startled" | "flying";
  glideTimer: number;
  flapTimer: number;
  lookDir: number;
}

interface SoaringBird {
  x: number; // screen/parallax relative
  y: number;
  vx: number;
  vy: number;
  scale: number;
  phase: number;
  circleRadius: number;
  circleSpeed: number;
  baseX: number;
  baseY: number;
}

interface DistantStag {
  worldX: number;
  groundOffset: number;
  scale: number;
  facing: number; // 1 or -1
  alert: number;  // 0 = grazing/calm, 1 = alert head raised
  breathPhase: number;
}

export class WildlifeSystem {
  private birds: StartledBird[] = [];
  private soaringBirds: SoaringBird[] = [];
  private stags: DistantStag[] = [];
  private nextStagX = 900;
  private nextBirdSpawnX = 400;

  constructor() {
    this.initSoaringBirds();
  }

  private initSoaringBirds(): void {
    // 3 high-altitude soaring ravens/hawks in distant parallax
    for (let i = 0; i < 3; i++) {
      this.soaringBirds.push({
        x: rand(200, 1400),
        y: rand(90, 220),
        vx: rand(-18, 24),
        vy: rand(-4, 4),
        scale: rand(0.55, 0.85),
        phase: rand(TAU),
        circleRadius: rand(60, 160),
        circleSpeed: rand(0.25, 0.45) * (Math.random() > 0.5 ? 1 : -1),
        baseX: rand(300, 1300),
        baseY: rand(110, 240),
      });
    }
  }

  reset(): void {
    this.birds = [];
    this.stags = [];
    this.nextStagX = 900;
    this.nextBirdSpawnX = 400;
  }

  update(dt: number, scroll: number, playerX: number, groundY: number, speed: number, time: number): void {
    // ---- 1. Spawn distant stags procedurally ----
    while (this.nextStagX < scroll + 2800) {
      this.stags.push({
        worldX: this.nextStagX,
        groundOffset: rand(-12, 4),
        scale: rand(0.48, 0.65),
        facing: Math.random() > 0.35 ? -1 : 1, // mostly facing left towards oncoming runner
        alert: 0,
        breathPhase: rand(TAU),
      });
      this.nextStagX += rand(1800, 3200);
    }

    // Cull offscreen stags
    for (let i = this.stags.length - 1; i >= 0; i--) {
      const s = this.stags[i];
      // Parallax rate is 0.12x for distant stags
      const screenX = (s.worldX - scroll * 0.12);
      if (screenX < -300) {
        this.stags.splice(i, 1);
        continue;
      }
      s.breathPhase += dt * 1.8;
      // Alert awareness when player is close in world space
      const worldDist = Math.abs(s.worldX - (scroll + playerX));
      if (worldDist < 600) {
        s.alert = Math.min(1, s.alert + dt * 2.5);
      } else {
        s.alert = Math.max(0, s.alert - dt * 0.8);
      }
    }

    // ---- 2. Spawn perched birds ahead ----
    while (this.nextBirdSpawnX < scroll + 1600) {
      // Spawn small flock of 2-4 birds perched on midground branches/trunks
      const flockCount = Math.floor(rand(2, 5));
      const groupX = this.nextBirdSpawnX;
      const groupY = -rand(60, 240); // perched up on tree limbs
      for (let k = 0; k < flockCount; k++) {
        this.birds.push({
          x: groupX + rand(-45, 45),
          y: groupY + rand(-18, 18),
          baseY: groupY,
          vx: 0,
          vy: 0,
          wingPhase: rand(TAU),
          wingSpeed: rand(18, 26),
          scale: rand(0.65, 0.95),
          state: "perched",
          glideTimer: 0,
          flapTimer: rand(0.8, 1.8),
          lookDir: Math.random() > 0.5 ? 1 : -1,
        });
      }
      this.nextBirdSpawnX += rand(900, 1800);
    }

    // Update birds
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      const screenX = b.x - scroll;

      // Cull far left
      if (screenX < -250 || b.y < -700) {
        this.birds.splice(i, 1);
        continue;
      }

      if (b.state === "perched") {
        // Trigger startled flight if runner is within 340px
        const distToPlayer = Math.hypot(screenX - playerX, b.y);
        if (distToPlayer < 360) {
          b.state = "startled";
          // Explode upward and forward-right into the sky away from runner
          const scatterAngle = -rand(0.75, 1.35); // upward arc
          const launchSpeed = rand(240, 380) + speed * 0.15;
          b.vx = Math.cos(scatterAngle) * launchSpeed * (Math.random() > 0.25 ? 1 : -0.6);
          b.vy = Math.sin(scatterAngle) * launchSpeed;
          b.wingSpeed = rand(26, 34);
        } else {
          // Subtle idle head turn / peck while perched
          if (Math.random() < 0.02) b.lookDir *= -1;
        }
      } else {
        // In flight (startled or flying)
        b.x += (b.vx + speed * 0.05) * dt;
        b.y += b.vy * dt;

        // Wing flap mechanics (cycles between frantic bursts and gliding)
        b.wingPhase += b.wingSpeed * dt;
        b.flapTimer -= dt;
        if (b.flapTimer <= 0) {
          if (b.glideTimer <= 0) {
            // Enter glide
            b.glideTimer = rand(0.4, 1.2);
            b.flapTimer = rand(1.0, 2.0);
          } else {
            b.glideTimer -= dt;
          }
        }

        // Flight aerodynamics: climb then level out into upper mist
        if (b.vy < -80) {
          b.vy += 120 * dt; // gravity deceleration
        } else {
          b.vy -= 20 * dt; // gentle lift
        }
        b.vx *= (1 - 0.25 * dt);
      }
    }

    // ---- 3. Update high-altitude soaring birds ----
    for (const sb of this.soaringBirds) {
      sb.phase += sb.circleSpeed * dt;
      sb.x = sb.baseX + Math.cos(sb.phase) * sb.circleRadius + Math.sin(time * 0.2) * 40;
      sb.y = sb.baseY + Math.sin(sb.phase) * (sb.circleRadius * 0.35);
    }
  }

  /**
   * Render distant stags behind the near treeline (in the misty far ground)
   */
  renderDistantStags(
    ctx: CanvasRenderingContext2D,
    w: number,
    gy: number,
    scroll: number,
    time: number,
    pal: Palette,
  ): void {
    if (this.stags.length === 0) return;

    // Distant silhouettes blend between far tree tint and mist fog
    const stagColor = mix(pal.treeFar, pal.fog, 0.45);
    const eyeColor = rgb(pal.accent, 0.75 + Math.sin(time * 2) * 0.25);

    ctx.save();
    ctx.fillStyle = rgb(stagColor);

    for (const stag of this.stags) {
      // 0.12x parallax scroll rate
      const sx = stag.worldX - (scroll * 0.12) % 4096;
      // Adjust to viewport bounds
      const normalizedX = ((sx % w) + w) % w;
      const sy = gy - 18 + stag.groundOffset;

      ctx.save();
      ctx.translate(normalizedX, sy);
      ctx.scale(stag.scale * stag.facing, stag.scale);

      // Idle breathing offset
      const breath = Math.sin(stag.breathPhase) * 1.2;
      const alertNeck = stag.alert * 4.5;

      this.drawStagSilhouette(ctx, breath, alertNeck);

      // Night/dusk mystical glowing eye
      if (pal.night > 0.12 || stag.alert > 0.4) {
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(-22, -49 - alertNeck, 1.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgb(stagColor);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Draw an anatomically elegant stag silhouette with branching antlers
   */
  private drawStagSilhouette(ctx: CanvasRenderingContext2D, breath: number, alertNeck: number): void {
    ctx.beginPath();

    // 1. Torso & Flank
    ctx.ellipse(0, -22, 22, 12 + breath * 0.4, 0, 0, TAU);

    // 2. Haunches and Hind Legs
    // Back leg (far)
    ctx.rect(12, -18, 3.2, 24);
    // Front hind leg (near)
    ctx.rect(7, -18, 3.4, 24);

    // 3. Forequarters and Front Legs
    // Front leg 1
    ctx.rect(-11, -16, 3.2, 23);
    // Front leg 2 (slightly stepped)
    ctx.rect(-16, -16, 3.0, 23);

    // 4. Slender neck leading up to head
    ctx.moveTo(-12, -26);
    ctx.quadraticCurveTo(-16, -38 - alertNeck * 0.5, -20, -47 - alertNeck);
    ctx.lineTo(-24, -48 - alertNeck);
    ctx.quadraticCurveTo(-17, -35, -8, -26);
    ctx.closePath();
    ctx.fill();

    // 5. Head & Snout
    ctx.beginPath();
    ctx.ellipse(-22, -48 - alertNeck, 7, 4.2, -0.25, 0, TAU);
    // Snout
    ctx.ellipse(-27, -46 - alertNeck, 3.5, 2.5, -0.1, 0, TAU);
    // Ears
    ctx.ellipse(-17, -53 - alertNeck, 2.0, 5.0, 0.4, 0, TAU);
    ctx.fill();

    // 6. Branching Antlers
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.lineCap = "round";

    const antlerBaseY = -52 - alertNeck;
    // Left Main Beam
    ctx.beginPath();
    ctx.moveTo(-19, antlerBaseY);
    ctx.quadraticCurveTo(-22, antlerBaseY - 14, -20, antlerBaseY - 26);
    // Brow tine
    ctx.moveTo(-20, antlerBaseY - 6);
    ctx.lineTo(-25, antlerBaseY - 11);
    // Bez tine
    ctx.moveTo(-21, antlerBaseY - 13);
    ctx.lineTo(-26, antlerBaseY - 18);
    // Top fork
    ctx.moveTo(-20, antlerBaseY - 22);
    ctx.lineTo(-24, antlerBaseY - 28);
    ctx.moveTo(-20, antlerBaseY - 26);
    ctx.lineTo(-17, antlerBaseY - 30);
    ctx.stroke();

    // Right Main Beam (mirrored slightly for 3D depth)
    ctx.beginPath();
    ctx.moveTo(-17, antlerBaseY);
    ctx.quadraticCurveTo(-13, antlerBaseY - 15, -12, antlerBaseY - 27);
    ctx.moveTo(-16, antlerBaseY - 7);
    ctx.lineTo(-12, antlerBaseY - 12);
    ctx.moveTo(-14, antlerBaseY - 14);
    ctx.lineTo(-9, antlerBaseY - 19);
    ctx.moveTo(-13, antlerBaseY - 23);
    ctx.lineTo(-8, antlerBaseY - 28);
    ctx.stroke();
  }

  /**
   * Render high-altitude soaring raptors circling in the sky
   */
  renderSoaringRaptors(ctx: CanvasRenderingContext2D, pal: Palette): void {
    const birdCol = mix(pal.treeFar, [10, 14, 22], 0.65);
    ctx.save();
    ctx.fillStyle = rgb(birdCol, 0.65);

    for (const b of this.soaringBirds) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(b.scale, b.scale);

      // Banking angle based on circular trajectory
      const bankAngle = Math.cos(b.phase) * 0.35;
      ctx.rotate(bankAngle);

      this.drawSoaringBirdPath(ctx);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawSoaringBirdPath(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    // Torso & head
    ctx.ellipse(0, 0, 4.5, 2.0, 0, 0, TAU);
    // Fanned tail
    ctx.moveTo(3, -1);
    ctx.lineTo(8, -3);
    ctx.lineTo(8, 3);
    ctx.lineTo(3, 1);
    ctx.closePath();
    ctx.fill();

    // Graceful long outstretched soaring wings
    ctx.beginPath();
    // Left wing
    ctx.moveTo(-1, 0);
    ctx.quadraticCurveTo(-6, -11, -16, -9);
    ctx.quadraticCurveTo(-8, -2, -1, 1);
    // Right wing
    ctx.moveTo(-1, 0);
    ctx.quadraticCurveTo(-6, 11, -16, 9);
    ctx.quadraticCurveTo(-8, 2, -1, -1);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Render perched and startled midground birds fluttering through the forest
   */
  renderMidgroundBirds(
    ctx: CanvasRenderingContext2D,
    w: number,
    gy: number,
    scroll: number,
    pal: Palette,
  ): void {
    if (this.birds.length === 0) return;

    const birdCol = mix(pal.treeMid, [12, 14, 20], 0.7);
    ctx.save();
    ctx.fillStyle = rgb(birdCol, 0.88);

    for (const b of this.birds) {
      const sx = b.x - scroll;
      if (sx < -80 || sx > w + 80) continue;
      const sy = gy + b.y;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(b.scale, b.scale);

      if (b.state === "perched") {
        this.drawPerchedBird(ctx, b.lookDir);
      } else {
        // Flying with flapping or gliding wings
        const isGliding = b.glideTimer > 0;
        const wingFlap = isGliding ? 0.2 : Math.sin(b.wingPhase);
        const flightHeading = Math.atan2(b.vy, b.vx);
        ctx.rotate(flightHeading * 0.45);
        this.drawFlyingBird(ctx, wingFlap);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private drawPerchedBird(ctx: CanvasRenderingContext2D, dir: number): void {
    ctx.save();
    ctx.scale(dir, 1);

    // Torso
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.2, 3.2, 0.35, 0, TAU);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(3.6, -3.2, 2.2, 0, TAU);
    // Beak
    ctx.moveTo(5.2, -3.2);
    ctx.lineTo(8.0, -2.6);
    ctx.lineTo(5.0, -1.8);
    ctx.closePath();
    ctx.fill();

    // Folded wing
    ctx.beginPath();
    ctx.ellipse(-0.5, 0.4, 3.8, 1.8, 0.45, 0, TAU);
    ctx.fill();

    // Tail feathers
    ctx.beginPath();
    ctx.moveTo(-3, 1);
    ctx.lineTo(-7.5, 5.5);
    ctx.lineTo(-5.5, 6.2);
    ctx.lineTo(-2, 2);
    ctx.closePath();
    ctx.fill();

    // Feet
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.beginPath();
    ctx.moveTo(0, 3.0);
    ctx.lineTo(0.5, 5.2);
    ctx.moveTo(2, 3.0);
    ctx.lineTo(2.5, 5.2);
    ctx.stroke();

    ctx.restore();
  }

  private drawFlyingBird(ctx: CanvasRenderingContext2D, wingFlap: number): void {
    // Streamlined body
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.2, 2.2, 0, 0, TAU);
    // Head & beak
    ctx.arc(4.8, -0.6, 2.0, 0, TAU);
    ctx.moveTo(6.2, -0.8);
    ctx.lineTo(8.8, -0.3);
    ctx.lineTo(6.2, 0.4);
    // Tail
    ctx.moveTo(-4, 0);
    ctx.lineTo(-9, -2.2);
    ctx.lineTo(-9, 2.2);
    ctx.closePath();
    ctx.fill();

    // Dynamic Flapping Wings (wingFlap from -1 to 1)
    // Left wing
    const wingY = wingFlap * 9.5;
    const wingBend = wingFlap < 0 ? -4.5 : 2.5;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-3, -wingY * 0.6 + wingBend, -4, -wingY);
    ctx.quadraticCurveTo(-1, -wingY * 0.7, 2, -0.5);
    ctx.closePath();
    ctx.fill();

    // Right wing (slightly offset for perspective)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(2, wingY * 0.5 + wingBend, 3, wingY * 0.85);
    ctx.quadraticCurveTo(3, wingY * 0.4, 2, 0.5);
    ctx.closePath();
    ctx.fill();
  }
}
