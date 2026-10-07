/* Mistwood engine — game loop, input, spawning, collisions, camera & HUD */

import { AudioEngine } from "./audio";
import { Particles } from "./particles";
import { Player, type LandingInfo } from "./player";
import { SEGMENTS, WorldRenderer, makeObstacle } from "./world";
import type { Bloom, Fly, FoxPelt, GameSettings, GameState, HUDData, Obstacle, ObstacleKind, Stats } from "./types";
import { DEFAULT_SETTINGS, FOX_PELTS, clamp, lerp, rand, speedToKmh } from "./types";
import type { AnimalDefinition } from "./animals";
import { ANIMALS, mapLegacyPeltId } from "./animals";
import { haptics, setHapticsEnabled } from "../utils/haptics";

interface EngineCallbacks {
  onState: (s: GameState) => void;
  onGameOver: (s: Stats) => void;
  onToast: (id: number, name: string, line: string) => void;
  onFirstJump: () => void;
  onMuted: (m: boolean) => void;
  onHUD?: (hud: HUDData) => void;
  onNearMiss?: (count: number) => void;
}

const BEST_KEY = "mistwood_best";

export class Engine {
  state: GameState = "loading";
  best = 0;
  muted = false;
  pelt: FoxPelt = FOX_PELTS.ember;
  animal: AnimalDefinition = ANIMALS.fox;
  settings: GameSettings = DEFAULT_SETTINGS;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private world = new WorldRenderer();
  private player: Player;
  private particles = new Particles();
  private audio = new AudioEngine();

  private raf = 0;
  private last = 0;
  private time = 0;
  private timeScale = 1;
  private w = 0;
  private h = 0;
  private dpr = 1;

  private scroll = 0;
  private dist = 0;
  private speed = 340;
  private fliesN = 0;
  private obstacles: Obstacle[] = [];
  private flies: Fly[] = [];
  private bloom: Bloom | null = null;
  private lastPatternEnd = 0;
  private nextBloomAt = rand(380, 620) * 16;

  private slideHeld = false;
  private slideImpulseT = 0;
  private activePointers = new Map<
    number,
    { startX: number; startY: number; t: number; role: "slide" | "jump" }
  >();
  private hasJumped = false;
  private shake = 0;
  private deadReal = 0;
  private lastSeg = 0;
  private toastId = 0;
  private leafTimer = 2;
  private trailTimer = 0;
  private speedStreakTimer = 0;
  private cameraZoom = 1;
  private cameraY = 0;
  private cameraTilt = 0;
  private cameraBounceY = 0;
  private hitStopTimer = 0;
  private reduced = false;
  private disposed = false;
  private startGraceTime = 0;
  private nearMisses = 0;
  private slowMoTimer = 0;
  private hudTimer = 0;
  private maxSpeedReached = 340;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.cb = cb;
    this.player = new Player((e, info) => this.onPlayerEvent(e, info));
    this.best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
    this.reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ------------------------------------------------------------ */

  async init(): Promise<void> {
    await this.world.load();
    this.bind();
    this.resize();
    this.setState("menu");
    this.last = performance.now();
    const loop = (ts: number) => {
      if (this.disposed) return;
      const dt = clamp((ts - this.last) / 1000, 0, 0.033) * this.timeScale;
      this.last = ts;
      this.time += dt;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVis);
    window.removeEventListener("pagehide", this.onPageHide);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
  }

  getAudio(): AudioEngine {
    return this.audio;
  }

  applySettings(s: GameSettings): void {
    this.settings = s;
    this.reduced = s.reducedMotion;
    this.audio.setMasterVolume(s.masterVolume);
    this.audio.setSfxVolume(s.sfxVolume);
    this.audio.setMusicVolume(s.musicVolume);
    setHapticsEnabled(s.haptics ?? true);
  }

  /* ------------------------------------------------------------ */

  private setState(s: GameState): void {
    this.state = s;
    this.cb.onState(s);
  }

  setPelt(pelt: FoxPelt): void {
    this.pelt = pelt;
    const animalId = mapLegacyPeltId(pelt.id);
    if (animalId in ANIMALS) {
      this.setAnimal(ANIMALS[animalId]);
    }
  }

  setAnimal(animal: AnimalDefinition): void {
    this.animal = animal;
    this.player.setAnimal(animal);
  }

  start(): void {
    this.audio.ensure();
    this.audio.resume();
    this.player.reset();
    this.particles.clear();
    this.obstacles = [];
    this.flies = [];
    this.bloom = null;
    this.scroll = 0;
    this.dist = 0;
    this.speed = 340;
    this.maxSpeedReached = 340;
    this.cameraZoom = 1;
    this.cameraY = 0;
    this.cameraTilt = 0;
    this.cameraBounceY = 0;
    this.hitStopTimer = 0;
    this.fliesN = 0;
    this.nearMisses = 0;
    this.slowMoTimer = 0;
    this.hudTimer = 0;
    this.lastPatternEnd = 600;
    this.nextBloomAt = rand(380, 620) * 16;
    this.lastSeg = 0;
    this.timeScale = 1;
    this.deadReal = 0;
    this.slideHeld = false;
    this.slideImpulseT = 0;
    this.activePointers.clear();
    this.startGraceTime = performance.now() + 180;
    this.setState("playing");
  }

  jump(): void {
    if (this.state !== "playing") return;
    if (performance.now() < this.startGraceTime) return;
    this.audio.ensure();
    this.player.pressJump();
    if (!this.hasJumped) {
      this.hasJumped = true;
      this.cb.onFirstJump();
    }
  }

  releaseJump(): void {
    this.player.releaseJump();
  }

  slideStart(): void {
    if (this.state !== "playing") return;
    this.slideHeld = true;
    this.slideImpulseT = 0.55;
    if (!this.player.grounded) this.player.fastFall = true;
    this.player.slideImpulse();
    haptics.slide();
  }

  slideEnd(): void {
    this.slideHeld = false;
  }

  toMenu(): void {
    this.player.reset();
    this.particles.clear();
    this.obstacles = [];
    this.flies = [];
    this.bloom = null;
    this.timeScale = 1;
    this.activePointers.clear();
    this.slideHeld = false;
    this.slideImpulseT = 0;
    this.audio.ensure();
    this.audio.resume();
    this.setState("menu");
  }

  togglePause(): void {
    if (this.state === "playing") {
      this.setState("paused");
      this.audio.suspend();
    } else if (this.state === "paused") {
      this.setState("playing");
      this.audio.ensure();
      this.audio.resume();
      this.audio.ui();
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.audio.ensure();
    this.audio.setMuted(m);
    this.cb.onMuted(m);
  }

  /* ------------------------------------------------------------ */
  /* input                                                         */
  /* ------------------------------------------------------------ */

  private resize = (): void => {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.world.onResize(this.w, this.h);
  };

  private onVis = (): void => {
    if (document.hidden) {
      if (this.state === "playing") this.setState("paused");
      this.audio.suspend();
    }
  };

  private onPageHide = (): void => {
    if (this.state === "playing") this.setState("paused");
    this.audio.suspend();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const jumpKey =
      e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW";
    const downKey = e.code === "ArrowDown" || e.code === "KeyS";
    if (jumpKey || downKey) e.preventDefault();

    if (e.code === "KeyM") {
      this.setMuted(!this.muted);
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") {
      this.togglePause();
      return;
    }
    if (this.state !== "playing") return;
    if (performance.now() < this.startGraceTime) return;

    if (jumpKey) {
      this.audio.ensure();
      this.player.pressJump();
      if (!this.hasJumped) {
        this.hasJumped = true;
        this.cb.onFirstJump();
      }
    } else if (downKey) {
      this.slideHeld = true;
      if (!this.player.grounded) this.player.fastFall = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const jumpKey =
      e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW";
    if (jumpKey) this.player.releaseJump();
    if (e.code === "ArrowDown" || e.code === "KeyS") this.slideHeld = false;
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (this.state !== "playing") return;
    if (performance.now() < this.startGraceTime) return;
    e.preventDefault();
    this.audio.ensure();

    // Dual-thumb ergonomics:
    // Left 42% of screen -> SLIDE / DUCK
    // Right 58% of screen -> JUMP / DOUBLE JUMP
    const isLeftZone = e.clientX < this.w * 0.42;
    const role: "slide" | "jump" = isLeftZone ? "slide" : "jump";

    this.activePointers.set(e.pointerId, {
      startX: e.clientX,
      startY: e.clientY,
      t: performance.now(),
      role,
    });

    if (role === "slide") {
      this.slideStart();
    } else {
      this.jump();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.state !== "playing") return;
    const ptr = this.activePointers.get(e.pointerId);
    if (!ptr) return;

    // Detect downward swipe gesture to slide or fast-fall even if started in jump zone
    const dy = e.clientY - ptr.startY;
    const dt = performance.now() - ptr.t;
    if (dy > 38 && dt < 480 && ptr.role !== "slide") {
      ptr.role = "slide";
      this.player.releaseJump();
      this.slideStart();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const ptr = this.activePointers.get(e.pointerId);
    if (ptr) {
      this.activePointers.delete(e.pointerId);
      if (ptr.role === "jump") {
        let hasOtherJump = false;
        for (const p of this.activePointers.values()) {
          if (p.role === "jump") {
            hasOtherJump = true;
            break;
          }
        }
        if (!hasOtherJump) {
          this.releaseJump();
        }
      } else if (ptr.role === "slide") {
        let hasOtherSlide = false;
        for (const p of this.activePointers.values()) {
          if (p.role === "slide") {
            hasOtherSlide = true;
            break;
          }
        }
        if (!hasOtherSlide) {
          this.slideEnd();
        }
      }
    } else {
      this.releaseJump();
    }
  };

  private bind(): void {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVis);
    window.addEventListener("pagehide", this.onPageHide);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ------------------------------------------------------------ */

  private onPlayerEvent(e: "jump" | "dbl" | "land", info?: LandingInfo): void {
    const gy = this.groundY;
    const x = this.foxX;
    if (e === "jump") {
      this.audio.jump();
      haptics.jump();
      this.particles.dust(x - 10, gy, 5);
      this.particles.sparks(x - 8, gy - 12, 3);
    } else if (e === "dbl") {
      this.audio.dbl();
      haptics.doubleJump();
      this.particles.dust(x, gy - this.player.py, 6);
      this.particles.sparks(x, gy - this.player.py - 16, 9);
      this.particles.ring(x, gy - this.player.py - 4, 32);
    } else {
      this.audio.land();
      const isHeavy = info?.hardLanding || info?.fastFallLanding;
      haptics.land(isHeavy);
      const count = isHeavy ? 14 : 8;
      this.particles.dust(x - 6, gy, count, -this.speed * 0.14);
      if (isHeavy) {
        this.particles.dust(x + 8, gy, 6, this.speed * 0.06);
        this.particles.ring(x, gy - 2, 28);
        this.cameraBounceY = Math.min(12, (info?.impactVy || 600) * 0.012);
      }
      if (!this.reduced && this.settings.screenShake) {
        const shakeMult = isHeavy ? 2.2 : 1.5;
        this.shake = Math.max(this.shake, this.animal.physics.landingShake * shakeMult);
      }
    }
  }

  /* ------------------------------------------------------------ */
  /* spawning                                                      */
  /* ------------------------------------------------------------ */

  private get groundY(): number {
    return this.h * 0.78;
  }

  private get foxX(): number {
    const speedRatio = clamp((this.speed - 340) / 480, 0, 1);
    // Dynamically leads camera ahead: runner sits at 22% at low speed, easing back to 16.5% at top speed
    const factor = lerp(0.22, 0.165, speedRatio);
    return clamp(this.w * factor, 85, 300);
  }

  private get foxScale(): number {
    return clamp(this.h / 780, 0.72, 1.12);
  }

  private spawnPattern(): void {
    const d = this.dist;
    const startX = this.lastPatternEnd + this.speed * rand(0.85, 1.35);

    type Opt = { min: number; w: number; kinds: ObstacleKind[]; gap: number[] };
    const opts: Opt[] = [
      { min: 0, w: 3, kinds: ["rock"], gap: [0] },
      { min: 0, w: 3, kinds: ["log"], gap: [0] },
      { min: 0, w: 2, kinds: ["stump"], gap: [0] },
      { min: 120, w: 3, kinds: ["bramble"], gap: [0] },
      { min: 220, w: 2, kinds: ["rock", "rock"], gap: [0, 185] },
      { min: 300, w: 3, kinds: ["vine"], gap: [0] },
      { min: 400, w: 2, kinds: ["boulder"], gap: [0] },
      { min: 430, w: 2, kinds: ["rock", "vine"], gap: [0, 250] },
      { min: 520, w: 2, kinds: ["bramble", "rock"], gap: [0, 230] },
      { min: 620, w: 2, kinds: ["log", "log"], gap: [0, 205] },
      { min: 760, w: 1, kinds: ["rock", "rock", "rock"], gap: [0, 185, 190] },
      { min: 900, w: 1, kinds: ["vine", "boulder"], gap: [0, 300] },
    ];
    const pool = opts.filter((o) => d >= o.min);
    const weights = pool.map((o) => o.w);
    let r = rand(weights.reduce((a, b) => a + b, 0));
    let chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = pool[i];
        break;
      }
    }

    const speedRatio = Math.max(1, this.speed / 340);
    let px = startX;
    let firstOb: Obstacle | null = null;
    for (let i = 0; i < chosen.kinds.length; i++) {
      px += chosen.gap[i] * speedRatio;
      const ob = makeObstacle(chosen.kinds[i], px);
      this.obstacles.push(ob);
      if (!firstOb) firstOb = ob;
    }

    // firefly arc over the first obstacle
    if (Math.random() < 0.62 && firstOb) {
      const fo: Obstacle = firstOb;
      const n = 3 + ((Math.random() * 3) | 0);
      const high = Math.random() < 0.6;
      for (let i = 0; i < n; i++) {
        const fr = n === 1 ? 0.5 : i / (n - 1);
        const arc = Math.sin(fr * Math.PI);
        const y = high
          ? this.groundY - 70 - arc * 140
          : this.groundY - 40 - arc * 36;
        this.flies.push({
          x: fo.x + (fr - 0.5) * 220 * (high ? 1.4 : 1),
          y,
          baseY: y,
          phase: rand(Math.PI * 2),
          got: false,
        });
      }
    }

    const patternLen = px - startX + 60;
    this.lastPatternEnd = px + 40;

    // spirit bloom pickup
    if (this.scroll + this.w >= this.nextBloomAt && !this.bloom) {
      this.bloom = {
        x: startX + patternLen + rand(120, 240),
        y: this.groundY - rand(70, 130),
        phase: rand(Math.PI * 2),
      };
      this.nextBloomAt += 16 * rand(450, 700);
    }
  }

  /* ------------------------------------------------------------ */
  /* update                                                        */
  /* ------------------------------------------------------------ */

  private update(dt: number): void {
    if (this.state === "paused") return;

    // Hit-stop frame freeze for maximum kinetic impact
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return;
    }

    const playing = this.state === "playing";
    const dying = this.state === "dying";

    // slow-mo recovery for near misses
    if (this.slowMoTimer > 0 && !dying) {
      this.slowMoTimer -= dt / Math.max(0.1, this.timeScale);
      if (this.slowMoTimer <= 0) {
        this.timeScale = 1;
      }
    }

    // phase & palette
    const phase =
      this.state === "menu" || this.state === "over"
        ? this.time * 0.018
        : this.dist / 600;
    this.world.setPhase(phase);
    this.world.updateAmbient(dt, this.w, this.h, this.time);

    // auto-drag in menu / slow-decay when dying
    if (!playing && !dying) {
      this.scroll += dt * 48;
    }
    if (dying) {
      this.scroll += this.speed * dt * 0.12;
      this.deadReal += dt / Math.max(this.timeScale, 0.001);
      if (this.deadReal > 1.05) {
        const distM = Math.floor(this.dist);
        const newBest = distM > this.best;
        if (newBest) {
          this.best = distM;
          localStorage.setItem(BEST_KEY, String(distM));
        }
        this.timeScale = 1;
        this.setState("over");
        const segIdx = Math.floor(this.dist / 600) % SEGMENTS.length;
        this.cb.onGameOver({
          dist: distM,
          flies: this.fliesN,
          best: this.best,
          newBest,
          nearMisses: this.nearMisses,
          maxSpeed: this.maxSpeedReached,
          maxSpeedKmh: speedToKmh(this.maxSpeedReached),
          biomeName: SEGMENTS[segIdx].name,
          totalFlies: this.fliesN,
        });
      }
    }

    if (playing) {
      const phys = this.animal.physics;
      const targetSpeed = (340 + Math.min(480, this.dist * 0.42 * phys.acceleration)) * phys.maxSpeedMultiplier;
      this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 2.5);
      if (this.speed > this.maxSpeedReached) {
        this.maxSpeedReached = Math.round(this.speed);
      }
      this.audio.setSpeed(this.speed);

      // Dynamic racing camera FOV zoom pull & banking tilt
      const speedRatio = clamp((this.speed - 340) / 480, 0, 1);
      const targetZoom = this.settings.speedEffects && !this.reduced
        ? 1 - speedRatio * 0.088
        : 1;
      this.cameraZoom += (targetZoom - this.cameraZoom) * dt * 3.5;

      const targetCamY = !this.reduced ? this.player.py * 0.12 : 0;
      this.cameraY += (targetCamY - this.cameraY) * dt * 7;
      this.cameraBounceY += (0 - this.cameraBounceY) * Math.min(1, dt * 14);

      let targetTilt = 0;
      if (!this.reduced) {
        if (this.player.sliding) {
          targetTilt = -0.016;
        } else if (!this.player.grounded) {
          targetTilt = clamp(-this.player.vy * 0.00003, -0.024, 0.024);
        }
      }
      this.cameraTilt += (targetTilt - this.cameraTilt) * Math.min(1, dt * 6.0);

      // High speed wind streaks
      if (this.speed > 520 && this.settings.speedEffects) {
        this.speedStreakTimer -= dt;
        if (this.speedStreakTimer <= 0) {
          this.speedStreakTimer = rand(0.04, 0.08);
          this.particles.streak(
            this.w + rand(10, 50),
            rand(40, this.h * 0.8),
            rand(60, 140) * (this.speed / 340),
          );
        }
      }

      this.scroll += this.speed * dt;
      this.dist += (this.speed * dt) / 16;
      this.slideImpulseT -= dt;

      // segment toasts
      const seg = Math.floor(this.dist / 600);
      if (seg !== this.lastSeg) {
        this.lastSeg = seg;
        const s = SEGMENTS[seg % 4];
        const line =
          seg >= 4 ? "The forest bends time around you…" : s.line;
        this.cb.onToast(++this.toastId, s.name, line);
      }

      // HUD updates emitted to React overlay at 20fps
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.05;
        const segIdx = Math.floor(this.dist / 600) % SEGMENTS.length;
        const nextSegIdx = (segIdx + 1) % SEGMENTS.length;
        this.cb.onHUD?.({
          dist: Math.floor(this.dist),
          flies: this.fliesN,
          speed: Math.round(this.speed),
          speedKmh: speedToKmh(this.speed),
          maxSpeed: this.maxSpeedReached,
          maxSpeedKmh: speedToKmh(this.maxSpeedReached),
          ghostT: Math.max(0, this.player.ghostT),
          biomeName: SEGMENTS[segIdx].name,
          biomeNext: SEGMENTS[nextSegIdx].name,
          biomeProgress: (this.dist % 600) / 600,
          nearMissCount: this.nearMisses,
        });
      }

      // spawn ahead
      if (this.lastPatternEnd < this.scroll + this.w + 260) this.spawnPattern();

      // player
      this.player.update(
        dt,
        this.slideHeld || this.slideImpulseT > 0,
        this.speed,
      );

      // footsteps / slide dust / streak
      if (this.player.stepPulse()) {
        this.particles.dust(this.foxX - 14 * this.foxScale, this.groundY, 1);
      }
      if (this.player.sliding) {
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
          this.trailTimer = 0.04;
          this.particles.dust(this.foxX - 20, this.groundY, 2);
          this.particles.streak(this.foxX - 16, this.groundY - 12, this.speed * 0.14);
          if (Math.random() < 0.28) {
            this.particles.leaf(this.foxX - 12, this.groundY - 6);
          }
        }
      } else if (this.player.ghostT > 0) {
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
          this.trailTimer = 0.04;
          this.particles.spores(
            this.foxX - 26,
            this.groundY - this.player.py - 30,
            1,
          );
        }
      }

      this.updateObjects(dt);

      // ambience — falling leaves
      this.leafTimer -= dt;
      if (this.leafTimer <= 0) {
        this.leafTimer = rand(1.4, 4.2);
        this.particles.leaf(this.scroll % 200 + this.w + 30, rand(50, this.h * 0.4));
      }
    }

    this.particles.update(dt, -40);
    this.world.updateAmbient(dt, this.w, this.h, this.time);
    this.audio.maybeChirp(dt, this.world.pal.night);
    this.audio.updateMusic(dt, phase);
    this.shake = Math.max(0, this.shake - dt * 26);
  }

  private updateObjects(dt: number): void {
    const gy = this.groundY;
    const fx = this.foxX;
    const hb = this.player.hb(fx, gy);

    // obstacles — offscreen cull + collision
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const ob = this.obstacles[i];
      if (ob.x < this.scroll - 160) {
        this.obstacles.splice(i, 1);
        continue;
      }
      const sx = ob.x - this.scroll;
      if (sx < -80 || sx > this.w + 80) continue;
      let b: [number, number, number, number];
      switch (ob.kind) {
        case "vine":
          // tip hovers just above sliding height — duck beneath it
          b = [sx - 9, gy - 44, sx + 9, gy - 33];
          break;
        case "log":
          b = [sx - ob.w / 2 + 6, gy - ob.h + 6, sx + ob.w / 2 - 6, gy - 4];
          break;
        case "bramble":
          b = [sx - ob.w / 2 + 9, gy - ob.h + 9, sx + ob.w / 2 - 9, gy - 3];
          break;
        default:
          b = [sx - ob.w * 0.42, gy - ob.h + 5, sx + ob.w * 0.42, gy - 2];
      }
      if (
        hb[0] < b[2] && hb[2] > b[0] &&
        hb[1] < b[3] && hb[3] > b[1] &&
        this.player.ghostT <= 0
      ) {
        this.die();
        return;
      }

      // near miss detection: close horizontal pass with tight vertical clearance
      if (!ob.nearMissed && hb[0] < b[2] && hb[2] > b[0] && this.player.ghostT <= 0) {
        const isLeapingOver = b[1] - hb[3] >= 0 && b[1] - hb[3] < 24;
        const isDuckingUnder = hb[1] - b[3] >= 0 && hb[1] - b[3] < 22;
        if (isLeapingOver || isDuckingUnder) {
          ob.nearMissed = true;
          this.nearMisses++;
          this.audio.nearMiss();
          haptics.nearMiss();
          this.particles.sparks(fx, hb[3], 12);
          this.hitStopTimer = 0.045; // 45ms impact freeze
          this.slowMoTimer = 0.14;
          this.timeScale = 0.55;
          this.cb.onNearMiss?.(this.nearMisses);
          this.fliesN++;
        }
      }
    }

    // fireflies — magnet + collect
    const magnet = this.player.ghostT > 0 ? 180 : 120;
    for (let i = this.flies.length - 1; i >= 0; i--) {
      const f = this.flies[i];
      if (f.x < this.scroll - 80) {
        this.flies.splice(i, 1);
        continue;
      }
      const sx = f.x - this.scroll;
      const fy = f.y || f.baseY;
      const pcy = gy - this.player.py - 28;
      const dx = fx - sx;
      const dy = pcy - fy;
      const dd = Math.hypot(dx, dy);
      if (dd < magnet && dd > 1) {
        f.x += (dx / dd) * 260 * dt;
        f.baseY += (dy / dd) * 260 * dt;
      }
      if (Math.abs(dx) < 30 && Math.abs(dy) < 34) {
        this.flies.splice(i, 1);
        this.fliesN++;
        this.audio.collect();
        haptics.collect();
        this.particles.sparks(sx, fy, 7);
      }
    }

    // spirit bloom
    if (this.bloom) {
      if (this.bloom.x < this.scroll - 120) {
        this.bloom = null;
      } else {
        const sx = this.bloom.x - this.scroll;
        const pcy = gy - this.player.py - 28;
        if (Math.hypot(fx - sx, pcy - this.bloom.y) < 42) {
          this.player.ghostT = 4.5;
          this.audio.bloom();
          haptics.bloom();
          this.particles.spores(sx, this.bloom.y, 20, true);
          this.particles.ring(sx, this.bloom.y, 36);
          this.hitStopTimer = 0.055; // 55ms sacred bloom impact freeze
          this.cb.onToast(++this.toastId, "Spirit Bloom", "You are untouchable");
          this.bloom = null;
        }
      }
    }
  }

  private die(): void {
    if (this.state !== "playing") return;
    this.player.die();
    this.setState("dying");
    this.timeScale = 0.3;
    this.deadReal = 0;
    this.audio.death();
    haptics.death();
    const gy = this.groundY;
    this.particles.spores(this.foxX, gy - this.player.py - 26, 22, true);
    this.particles.dust(this.foxX, gy, 10);
    if (!this.reduced && this.settings.screenShake) this.shake = 13;
  }

  /* ------------------------------------------------------------ */
  /* render                                                        */
  /* ------------------------------------------------------------ */

  private render(): void {
    const ctx = this.ctx;
    const { w, h } = this;
    if (!w || !h) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const gy = this.groundY;
    const pal = this.world.pal;
    const shakeX =
      this.settings.screenShake && !this.reduced && this.shake > 0
        ? rand(-this.shake, this.shake)
        : 0;
    const shakeY =
      this.settings.screenShake && !this.reduced && this.shake > 0
        ? rand(-this.shake, this.shake)
        : 0;

    // ---- dynamic camera transform (FOV zoom, banking tilt & vertical spring) ----
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.save();
    ctx.translate(cx, cy + this.cameraY + this.cameraBounceY);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.rotate(this.cameraTilt);
    ctx.translate(-cx, -cy);

    // ---- backdrop (unshaken) ----
    this.world.renderSky(ctx, w, h);
    this.world.renderFar(ctx, w, h, this.time);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.world.renderTreelines(ctx, w, h, gy, this.scroll, this.time);
    this.world.renderTrunks(ctx, w, h, this.scroll);
    this.world.renderRays(ctx, w, h, this.time);

    // ---- gameplay plane ----
    this.world.renderGroundFill(ctx, w, h, gy, this.scroll, this.time);

    for (const ob of this.obstacles) {
      const sx = ob.x - this.scroll;
      if (sx < -140 || sx > w + 140) continue;
      ctx.save();
      ctx.translate(sx, 0);
      const obS = { ...ob, x: 0 };
      this.world.renderObstacle(ctx, obS, gy, this.time);
      ctx.restore();
    }

    if (this.bloom) {
      const sx = this.bloom.x - this.scroll;
      if (sx > -80 && sx < w + 80) {
        this.world.renderBloom(ctx, { x: sx, y: this.bloom.y, phase: this.bloom.phase }, this.time, gy);
      }
    }

    for (const f of this.flies) {
      const sx = f.x - this.scroll;
      if (sx < -40 || sx > w + 40) continue;
      this.world.renderFly(ctx, { ...f, x: sx } as Fly, this.time, gy);
      // keep world-space hover sync
      f.y = f.baseY + Math.sin(this.time * 2.1 + f.phase) * 9;
    }

    this.world.renderFlora(
      ctx,
      w,
      gy,
      this.scroll,
      this.time,
      this.foxX,
      this.player.py,
      this.player.grounded,
      this.player.sliding,
      this.speed,
      this.player.vy
    );

    if (this.state !== "menu" && this.state !== "over") {
      this.player.render(ctx, this.foxX, gy, pal, this.time, this.foxScale, undefined, this.speed);
    }

    this.particles.renderFlat(ctx, pal);
    this.particles.renderGlow(ctx, pal);
    this.world.renderWisps(ctx);
    this.world.renderMotes(ctx, this.time);
    this.world.renderForeground(ctx, w, h, this.scroll);

    ctx.restore(); // restore shake

    // High-speed horizontal motion streaks
    if (
      this.speed > 520 &&
      this.settings.speedEffects &&
      !this.reduced &&
      (this.state === "playing" || this.state === "dying")
    ) {
      this.renderSpeedEffects(ctx, w, h);
    }

    ctx.restore(); // restore camera transform

    this.world.renderVignette(ctx, w, h);

    if (this.state === "playing" || this.state === "dying") {
      this.renderHUD(ctx);
    }
  }

  /** Subtle peripheral racing wind streaks & corner tunnel vision when reaching high velocities */
  private renderSpeedEffects(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const speedRatio = Math.min(1, (this.speed - 520) / 380);
    const alpha = 0.06 + speedRatio * 0.22;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 1.4;

    // Horizontal rushing air streams
    for (let i = 0; i < 9; i++) {
      const sy = (this.time * 880 + i * 137) % (h * 0.86);
      const len = 80 + (i * 47) % 130 + speedRatio * 80;
      const sx = w - ((this.time * 2800 + i * 370) % (w * 0.8));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - len, sy);
      ctx.stroke();
    }

    // Peripheral corner tunnel lines when breaking high speeds (>620 px/s)
    if (this.speed > 620) {
      const tunnelAlpha = Math.min(0.18, (this.speed - 620) / 600);
      ctx.strokeStyle = `rgba(255, 255, 255, ${tunnelAlpha.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      const corners = [
        [0, 0],
        [w, 0],
        [0, h * 0.78],
        [w, h * 0.78],
      ];
      const cx = w * 0.5;
      const cy = h * 0.5;
      for (const [corX, corY] of corners) {
        for (let j = 0; j < 3; j++) {
          const t = (this.time * 4 + j * 0.33) % 1;
          const px = lerp(corX, cx, t);
          const py = lerp(corY, cy, t);
          const pEnd = lerp(corX, cx, Math.min(1, t + 0.18));
          const pEndY = lerp(corY, cy, Math.min(1, t + 0.18));
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(pEnd, pEndY);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  private renderHUD(_ctx: CanvasRenderingContext2D): void {}
}
