/* Mistwood engine — game loop, input, spawning, collisions, camera & HUD */

import { AudioEngine } from "./audio";
import { Particles } from "./particles";
import { Player } from "./player";
import { SEGMENTS, WorldRenderer, makeObstacle } from "./world";
import type { Bloom, Fly, GameState, Obstacle, ObstacleKind, Stats } from "./types";
import { clamp, rand, rgb } from "./types";

interface EngineCallbacks {
  onState: (s: GameState) => void;
  onGameOver: (s: Stats) => void;
  onToast: (id: number, name: string, line: string) => void;
  onFirstJump: () => void;
  onMuted: (m: boolean) => void;
}

const BEST_KEY = "mistwood_best";

export class Engine {
  state: GameState = "loading";
  best = 0;
  muted = false;

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
  private ptrDown: { y: number; t: number } | null = null;
  private hasJumped = false;
  private shake = 0;
  private deadReal = 0;
  private lastSeg = 0;
  private toastId = 0;
  private leafTimer = 2;
  private trailTimer = 0;
  private reduced = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.cb = cb;
    this.player = new Player((e) => this.onPlayerEvent(e));
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
  }

  /* ------------------------------------------------------------ */

  private setState(s: GameState): void {
    this.state = s;
    this.cb.onState(s);
  }

  start(): void {
    this.audio.ensure();
    this.player.reset();
    this.particles.clear();
    this.obstacles = [];
    this.flies = [];
    this.bloom = null;
    this.scroll = 0;
    this.dist = 0;
    this.speed = 340;
    this.fliesN = 0;
    this.lastPatternEnd = 600;
    this.nextBloomAt = rand(380, 620) * 16;
    this.lastSeg = 0;
    this.timeScale = 1;
    this.deadReal = 0;
    this.setState("playing");
  }

  toMenu(): void {
    this.player.reset();
    this.particles.clear();
    this.obstacles = [];
    this.flies = [];
    this.bloom = null;
    this.timeScale = 1;
    this.setState("menu");
  }

  togglePause(): void {
    if (this.state === "playing") {
      this.setState("paused");
    } else if (this.state === "paused") {
      this.setState("playing");
      this.audio.ensure();
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
    if (document.hidden && this.state === "playing") this.setState("paused");
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
    e.preventDefault();
    this.audio.ensure();
    this.ptrDown = { y: e.clientY, t: performance.now() };
    this.player.pressJump();
    if (!this.hasJumped) {
      this.hasJumped = true;
      this.cb.onFirstJump();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.state !== "playing" || !this.ptrDown) return;
    const dy = e.clientY - this.ptrDown.y;
    const dt = performance.now() - this.ptrDown.t;
    if (dy > 46 && dt < 420) {
      this.slideImpulseT = 0.55;
      if (!this.player.grounded) this.player.fastFall = true;
      this.player.slideImpulse();
      this.ptrDown = null;
    }
  };

  private onPointerUp = (): void => {
    this.player.releaseJump();
    this.ptrDown = null;
  };

  private bind(): void {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVis);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /* ------------------------------------------------------------ */

  private onPlayerEvent(e: "jump" | "dbl" | "land"): void {
    const gy = this.groundY;
    const x = this.foxX;
    if (e === "jump") {
      this.audio.jump();
      this.particles.dust(x - 10, gy, 4);
    } else if (e === "dbl") {
      this.audio.dbl();
      this.particles.dust(x, gy - this.player.py, 5);
      this.particles.sparks(x, gy - this.player.py - 20, 5);
    } else {
      this.audio.land();
      this.particles.dust(x - 6, gy, 8, -this.speed * 0.12);
      if (!this.reduced) this.shake = Math.max(this.shake, 1.6);
    }
  }

  /* ------------------------------------------------------------ */
  /* spawning                                                      */
  /* ------------------------------------------------------------ */

  private get groundY(): number {
    return this.h * 0.78;
  }

  private get foxX(): number {
    return clamp(this.w * 0.22, 90, 320);
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

    let px = startX;
    let firstOb: Obstacle | null = null;
    for (let i = 0; i < chosen.kinds.length; i++) {
      px += chosen.gap[i];
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

    const playing = this.state === "playing";
    const dying = this.state === "dying";

    // phase & palette
    const phase =
      this.state === "menu" || this.state === "over"
        ? this.time * 0.018
        : this.dist / 600;
    this.world.setPhase(phase);

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
        this.cb.onGameOver({
          dist: distM,
          flies: this.fliesN,
          best: this.best,
          newBest,
        });
      }
    }

    if (playing) {
      this.speed = 340 + Math.min(470, this.dist * 0.42);
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

      // spawn ahead
      if (this.lastPatternEnd < this.scroll + this.w + 260) this.spawnPattern();

      // player
      this.player.update(
        dt,
        this.slideHeld || this.slideImpulseT > 0,
        this.speed / 360,
      );

      // footsteps / slide dust
      if (this.player.stepPulse()) {
        this.particles.dust(this.foxX - 14 * this.foxScale, this.groundY, 1);
      }
      if (this.player.sliding) {
        this.trailTimer -= dt;
        if (this.trailTimer <= 0) {
          this.trailTimer = 0.05;
          this.particles.dust(this.foxX - 20, this.groundY, 2);
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
          this.player.ghostT = 4.2;
          this.audio.bloom();
          this.particles.spores(sx, this.bloom.y, 16, true);
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
    const gy = this.groundY;
    this.particles.spores(this.foxX, gy - this.player.py - 26, 22, true);
    this.particles.dust(this.foxX, gy, 10);
    if (!this.reduced) this.shake = 13;
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
    const shakeX = this.shake > 0 ? rand(-this.shake, this.shake) : 0;
    const shakeY = this.shake > 0 ? rand(-this.shake, this.shake) : 0;

    // ---- backdrop (unshaken) ----
    this.world.renderSky(ctx, w, h);
    this.world.renderFar(ctx, w, h, this.time);

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.world.renderTreelines(ctx, w, h, gy, this.scroll);
    this.world.renderTrunks(ctx, w, h, this.scroll);
    this.world.renderRays(ctx, w, h, this.time);

    // ---- gameplay plane ----
    this.world.renderGroundFill(ctx, w, h, gy);

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
        this.world.renderBloom(ctx, { x: sx, y: this.bloom.y, phase: this.bloom.phase }, this.time);
      }
    }

    for (const f of this.flies) {
      const sx = f.x - this.scroll;
      if (sx < -40 || sx > w + 40) continue;
      this.world.renderFly(ctx, { ...f, x: sx } as Fly, this.time);
      // keep world-space hover sync
      f.y = f.baseY + Math.sin(this.time * 2.1 + f.phase) * 9;
    }

    this.world.renderFlora(ctx, w, gy, this.scroll, this.time);

    if (this.state !== "menu" && this.state !== "over") {
      this.player.render(ctx, this.foxX, gy, pal, this.time, this.foxScale);
    }

    this.particles.renderFlat(ctx, pal);
    this.particles.renderGlow(ctx, pal);
    this.world.renderWisps(ctx);
    this.world.renderMotes(ctx, this.time);
    this.world.renderForeground(ctx, w, h, this.scroll);

    ctx.restore();

    this.world.renderVignette(ctx, w, h);

    if (this.state === "playing" || this.state === "dying") {
      this.renderHUD(ctx);
    }
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.pal;
    const fs = this.w < 640 ? 24 : 30;
    ctx.save();
    ctx.textBaseline = "alphabetic";

    // distance
    ctx.font = `${fs}px Marcellus, Georgia, serif`;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillText(`${Math.floor(this.dist)} m`, 27, 52);
    ctx.fillStyle = "rgba(255,251,240,0.94)";
    ctx.fillText(`${Math.floor(this.dist)} m`, 25, 50);

    // fireflies collected
    const fy = 80;
    ctx.fillStyle = rgb(pal.accent, 0.85);
    ctx.beginPath();
    ctx.arc(32, fy - 5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(pal.accent, 0.2);
    ctx.beginPath();
    ctx.arc(32, fy - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `300 ${Math.round(fs * 0.62)}px Outfit, sans-serif`;
    ctx.fillStyle = "rgba(255,251,240,0.85)";
    ctx.fillText(`× ${this.fliesN}`, 46, fy + 1);

    // ghost timer bar
    if (this.player.ghostT > 0) {
      const bw = 120;
      const fr2 = clamp(this.player.ghostT / 4.2, 0, 1);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath();
      ctx.roundRect(25, 94, bw, 4, 2);
      ctx.fill();
      ctx.fillStyle = rgb(pal.accent, 0.85);
      ctx.beginPath();
      ctx.roundRect(25, 94, bw * fr2, 4, 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
