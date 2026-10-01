/* World renderer — layered photoreal backdrop with procedural parallax silhouettes,
   a continuous dawn→day→dusk→night palette cycle, god rays, fog and fireflies */

import type { Fly, Obstacle, ObstacleKind, Palette, RGB } from "./types";
import { TAU, clamp, hash, hex, lerp, mix, rand, rgb, smooth } from "./types";

/* ------------------------------------------------------------------ */
/* palette keyframes                                                    */
/* ------------------------------------------------------------------ */

const K = (
  skyTop: string, skyLow: string, fog: string, sun: string, sunX: number, sunY: number,
  accent: string, ray: string, treeFar: string, treeMid: string, ground: string,
  rim: string, mote: string, night: number,
): Palette => ({
  skyTop: hex(skyTop), skyLow: hex(skyLow), fog: hex(fog), sun: hex(sun),
  sunX, sunY, accent: hex(accent), ray: hex(ray), treeFar: hex(treeFar),
  treeMid: hex(treeMid), ground: hex(ground), rim: hex(rim), mote: hex(mote), night,
});

export const KEYFRAMES: readonly Palette[] = [
  K("#e8a368", "#f6dfb2", "#e6d3b2", "#ffdf9e", 0.68, 0.22, "#ffd27a", "#ffe6ac",
    "#b8a587", "#66594a", "#101311", "#ffd88f", "#ffe8bd", 0),
  K("#a4c4c0", "#dde4d0", "#ccd8c6", "#fff3d2", 0.5, 0.1, "#ffe094", "#f8efd0",
    "#93a493", "#47523f", "#0d120f", "#efeabf", "#fff4cf", 0),
  K("#3b2f60", "#a0657f", "#6c5b8e", "#ff9f6e", 0.3, 0.3, "#b8c4ff", "#cf9bd0",
    "#5c5184", "#241d3e", "#080810", "#c0a8ff", "#ccd6ff", 0.15),
  K("#0a1030", "#1d2a52", "#1e2c50", "#cdd9ff", 0.3, 0.15, "#7fe3ff", "#96b8ff",
    "#25335c", "#0e1228", "#04060c", "#8fd4ff", "#b4e6ff", 1),
];

export const SEGMENTS = [
  { name: "Golden Dawn", line: "First light through the pines" },
  { name: "Quiet Midday", line: "The forest holds its breath" },
  { name: "Violet Dusk", line: "Shadows stretch and wander" },
  { name: "Firefly Night", line: "Follow the little lights" },
] as const;

const NPAL = KEYFRAMES.length;

export function samplePalette(phase: number): Palette {
  const p = ((phase % NPAL) + NPAL) % NPAL;
  const i = Math.floor(p);
  const t = smooth(p - i);
  const A = KEYFRAMES[i % NPAL];
  const B = KEYFRAMES[(i + 1) % NPAL];
  return {
    skyTop: mix(A.skyTop, B.skyTop, t),
    skyLow: mix(A.skyLow, B.skyLow, t),
    fog: mix(A.fog, B.fog, t),
    sun: mix(A.sun, B.sun, t),
    sunX: lerp(A.sunX, B.sunX, t),
    sunY: lerp(A.sunY, B.sunY, t),
    accent: mix(A.accent, B.accent, t),
    ray: mix(A.ray, B.ray, t),
    treeFar: mix(A.treeFar, B.treeFar, t),
    treeMid: mix(A.treeMid, B.treeMid, t),
    ground: mix(A.ground, B.ground, t),
    rim: mix(A.rim, B.rim, t),
    mote: mix(A.mote, B.mote, t),
    night: lerp(A.night, B.night, t),
  };
}

/* ------------------------------------------------------------------ */
/* obstacle factory                                                     */
/* ------------------------------------------------------------------ */

export function makeObstacle(kind: ObstacleKind, x: number): Obstacle {
  const seed = rand(1000);
  switch (kind) {
    case "rock": {
      const w = rand(34, 52);
      const h = rand(26, 42);
      return { kind, x, w, h, seed, verts: rockVerts(w, h, 8, seed) };
    }
    case "boulder": {
      const w = rand(56, 72);
      const h = rand(54, 70);
      return { kind, x, w, h, seed, verts: rockVerts(w, h, 11, seed) };
    }
    case "log":
      return { kind, x, w: rand(72, 96), h: rand(23, 30), seed };
    case "bramble":
      return { kind, x, w: rand(62, 86), h: rand(30, 42), seed };
    case "stump":
      return { kind, x, w: rand(30, 38), h: rand(36, 46), seed };
    case "vine":
      return { kind, x, w: 26, h: 44, seed };
  }
}

function rockVerts(w: number, h: number, n: number, seed: number): number[] {
  const v: number[] = [];
  v.push(-w / 2, 0);
  for (let i = 1; i < n - 1; i++) {
    const a = (i / (n - 2)) * Math.PI;
    const j = hash(seed + i, 3);
    v.push(Math.cos(Math.PI - a) * (w / 2) * (0.85 + j * 0.3), -Math.sin(a) * h * (0.75 + j * 0.4));
  }
  v.push(w / 2, 0);
  return v;
}

/* ------------------------------------------------------------------ */
/* tiny canvas helpers                                                  */
/* ------------------------------------------------------------------ */

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  return [c, c.getContext("2d") as CanvasRenderingContext2D];
}

function radialSprite(size: number, color: RGB, core = 0.9, mid = 0.32): HTMLCanvasElement {
  const [c, x] = makeCanvas(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgb(color, core));
  g.addColorStop(0.35, rgb(color, mid));
  g.addColorStop(1, rgb(color, 0));
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

/* ------------------------------------------------------------------ */
/* world renderer                                                       */
/* ------------------------------------------------------------------ */

interface Mote { x: number; y: number; r: number; ph: number; sp: number }
interface Wisp { x: number; y: number; s: number; vx: number; a: number }

export class WorldRenderer {
  pal: Palette = samplePalette(0);

  private dawnCv: HTMLCanvasElement | null = null;
  private duskCv: HTMLCanvasElement | null = null;

  private farMask!: HTMLCanvasElement;
  private nearMask!: HTMLCanvasElement;
  private trunkMask!: HTMLCanvasElement;
  private farTint!: HTMLCanvasElement;
  private nearTint!: HTMLCanvasElement;
  private trunkTint!: HTMLCanvasElement;

  private fogSprite!: HTMLCanvasElement;
  private softDot!: HTMLCanvasElement;
  private moonSprite!: HTMLCanvasElement;
  private glowSprites: HTMLCanvasElement[] = [];
  private stars: HTMLCanvasElement[] = [];
  private fgSprites: HTMLCanvasElement[] = [];
  private vignette: HTMLCanvasElement | null = null;

  private motes: Mote[] = [];
  private wisps: Wisp[] = [];
  private bucket = -1;
  private glowIdx = 0;

  async load(): Promise<void> {
    const loadImg = (src: string) =>
      new Promise<HTMLImageElement | null>((res) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = src;
      });
    const base = (import.meta.env.BASE_URL || "./").replace(/\/?$/, "/");
    const [dawn, dusk] = await Promise.all([
      loadImg(`${base}images/forest-dawn.jpg`),
      loadImg(`${base}images/forest-dusk.jpg`),
    ]);
    this.dawnCv = this.toLayer(dawn, ["#d8a06a", "#c9b78f", "#8fa39a"]);
    this.duskCv = this.toLayer(dusk, ["#2c2a55", "#3d3a68", "#141a36"]);
    this.buildStatic();
  }

  /** draw image into a same-size canvas, or synthesize a gradient fallback */
  private toLayer(img: HTMLImageElement | null, grad: string[]): HTMLCanvasElement {
    const w = img ? img.naturalWidth : 1600;
    const h = img ? img.naturalHeight : 900;
    const [c, x] = makeCanvas(w, h);
    if (img) {
      x.drawImage(img, 0, 0);
    } else {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, grad[0]);
      g.addColorStop(0.55, grad[1]);
      g.addColorStop(1, grad[2]);
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      // a few soft vertical trunk hints so the fallback still reads as forest
      x.fillStyle = "rgba(20,24,28,0.35)";
      for (let i = 0; i < 14; i++) {
        const tx = hash(i, 9) * w;
        x.fillRect(tx, 0, 14 + hash(i, 4) * 30, h);
      }
    }
    return c;
  }

  /* ---------------- one-time layer construction ---------------- */

  private buildStatic(): void {
    const [far, farX] = makeCanvas(2048, 340);
    this.ridge(farX, 2048, 340, 96, 0.42, 0.16);
    this.farMask = far;

    const [near, nearX] = makeCanvas(2048, 400);
    this.ridge(nearX, 2048, 400, 44, 0.6, 0.5);
    this.nearMask = near;

    const [trk, trkX] = makeCanvas(3072, 900);
    this.trunks(trkX, 3072, 900);
    this.trunkMask = trk;

    const [ft] = makeCanvas(2048, 340);
    this.farTint = ft;
    const [nt] = makeCanvas(2048, 400);
    this.nearTint = nt;
    const [tt] = makeCanvas(3072, 900);
    this.trunkTint = tt;

    this.softDot = radialSprite(48, [255, 246, 224], 0.95, 0.3);
    this.moonSprite = radialSprite(160, [214, 228, 255], 0.9, 0.3);
    this.glowSprites = KEYFRAMES.map((k) => radialSprite(72, k.accent, 0.95, 0.34));
    this.fogSprite = radialSprite(256, this.pal.fog, 0.55, 0.26);

    // foreground occluders (baked blur)
    this.fgSprites = [this.fgLeafCluster(), this.fgBranch(), this.fgFern()];

    // starfields (3 variants for twinkle)
    this.stars = [0, 1, 2].map((v) => {
      const [c, x] = makeCanvas(1600, 900);
      for (let i = 0; i < 170; i++) {
        const sx = hash(i, v * 7 + 1) * 1600;
        const sy = hash(i, v * 7 + 2) * 620;
        const r = 0.5 + hash(i, v * 7 + 3) * 1.1;
        x.fillStyle = `rgba(255,255,255,${(0.25 + hash(i, v * 7 + 4) * 0.7).toFixed(2)})`;
        x.beginPath();
        x.arc(sx, sy, r, 0, TAU);
        x.fill();
        if (hash(i, v * 7 + 5) > 0.9) {
          x.fillStyle = "rgba(220,235,255,0.12)";
          x.beginPath();
          x.arc(sx, sy, r * 3.4, 0, TAU);
          x.fill();
        }
      }
      return c;
    });
  }

  /** seamless ridge of hills + conifer/broadleaf silhouettes */
  private ridge(
    x: CanvasRenderingContext2D, w: number, h: number,
    trees: number, sizeK: number, broad: number,
  ): void {
    x.fillStyle = "#ffffff";
    // rolling hill line from wrapped sines
    x.beginPath();
    x.moveTo(0, h);
    for (let px = 0; px <= w; px += 8) {
      const u = (px / w) * TAU;
      const y =
        h - h * 0.34 -
        Math.sin(u * 3 + 1) * h * 0.075 -
        Math.sin(u * 7 + 4) * h * 0.05 -
        Math.sin(u * 13) * h * 0.02;
      x.lineTo(px, y);
    }
    x.lineTo(w, h);
    x.closePath();
    x.fill();

    // trees — placement is index-periodic so the tile wraps seamlessly
    const step = w / trees;
    for (let i = 0; i < trees; i++) {
      if (hash(i, 21) < 0.12) continue; // gaps
      const tx = i * step + hash(i, 5) * step * 0.6;
      const u = (tx / w) * TAU;
      const baseY =
        h - h * 0.34 - Math.sin(u * 3 + 1) * h * 0.075 - Math.sin(u * 7 + 4) * h * 0.05;
      const th = h * sizeK * (0.55 + hash(i, 6) * 0.75);
      const tw = th * (0.34 + hash(i, 7) * 0.12);
      if (hash(i, 8) < broad) {
        // broadleaf — cluster of discs
        x.beginPath();
        for (let b = 0; b < 4; b++) {
          const bx = tx + (hash(i * 4 + b, 11) - 0.5) * tw * 1.6;
          const by = baseY - th * (0.55 + hash(i * 4 + b, 12) * 0.5);
          const br = tw * (0.55 + hash(i * 4 + b, 13) * 0.5);
          x.moveTo(bx + br, by);
          x.arc(bx, by, br, 0, TAU);
        }
        x.fill();
        x.fillRect(tx - 2, baseY - th * 0.6, 4, th * 0.62);
      } else {
        // pine — stacked tiers
        const tiers = 4;
        for (let tr = 0; tr < tiers; tr++) {
          const fr = tr / tiers;
          const ty = baseY - th * (0.35 + fr * 0.6);
          const tww = tw * (1 - fr * 0.75);
          x.beginPath();
          x.moveTo(tx - tww / 2, ty + th * 0.18);
          x.quadraticCurveTo(tx, ty - th * 0.12, tx + tww / 2, ty + th * 0.18);
          x.closePath();
          x.fill();
        }
        x.fillRect(tx - 2, baseY - th * 0.4, 4, th * 0.42);
      }
    }
  }

  /** giant near trunks with mossy canopy — the "inside the forest" layer */
  private trunks(x: CanvasRenderingContext2D, w: number, h: number): void {
    x.fillStyle = "#ffffff";
    const n = 5;
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const tx = i * step + step * 0.2 + hash(i, 31) * step * 0.5;
      const tw = 30 + hash(i, 32) * 42;
      const lean = (hash(i, 33) - 0.5) * 60;
      // trunk body with flared base
      x.beginPath();
      x.moveTo(tx - tw / 2, h);
      x.quadraticCurveTo(tx - tw / 2 + lean * 0.3, h * 0.5, tx - tw * 0.32 + lean, -40);
      x.lineTo(tx + tw * 0.32 + lean, -40);
      x.quadraticCurveTo(tx + tw / 2 + lean * 0.3, h * 0.5, tx + tw / 2 + tw * 0.5, h);
      x.closePath();
      x.fill();
      // branch stubs
      for (let b = 0; b < 3; b++) {
        const by = h * (0.12 + hash(i * 3 + b, 34) * 0.4);
        const dir = hash(i * 3 + b, 35) > 0.5 ? 1 : -1;
        const bl = 60 + hash(i * 3 + b, 36) * 130;
        x.save();
        x.translate(tx + lean * (1 - by / h), by);
        x.rotate(dir * (0.5 + hash(i * 3 + b, 37) * 0.4));
        x.beginPath();
        x.moveTo(0, -7);
        x.quadraticCurveTo(bl * 0.5, -10, bl, 4);
        x.lineTo(bl, 12);
        x.quadraticCurveTo(bl * 0.4, 6, 0, 7);
        x.closePath();
        x.fill();
        x.restore();
      }
      // canopy blobs near top
      for (let cn = 0; cn < 5; cn++) {
        const cx2 = tx + lean + (hash(i * 5 + cn, 38) - 0.5) * 420;
        const cy2 = hash(i * 5 + cn, 39) * h * 0.16 - 20;
        const cr = 90 + hash(i * 5 + cn, 40) * 150;
        x.beginPath();
        x.arc(cx2, cy2, cr, 0, TAU);
        x.fill();
      }
    }
  }

  private fgLeafCluster(): HTMLCanvasElement {
    const [raw, rx] = makeCanvas(480, 480);
    rx.strokeStyle = "rgba(9,12,16,0.95)";
    rx.lineCap = "round";
    rx.lineWidth = 13;
    rx.beginPath();
    rx.moveTo(40, 440);
    rx.quadraticCurveTo(180, 300, 420, 140);
    rx.stroke();
    rx.fillStyle = "rgba(9,12,16,0.95)";
    for (let i = 0; i < 9; i++) {
      const t = 0.2 + (i / 9) * 0.8;
      const px = 40 + (420 - 40) * t + (hash(i, 51) - 0.5) * 90;
      const py = 440 + (140 - 440) * t + (hash(i, 52) - 0.5) * 90;
      rx.save();
      rx.translate(px, py);
      rx.rotate(hash(i, 53) * TAU);
      rx.beginPath();
      rx.ellipse(0, 0, 46 + hash(i, 54) * 40, 26 + hash(i, 55) * 20, 0, 0, TAU);
      rx.fill();
      rx.restore();
    }
    const [out, ox] = makeCanvas(480, 480);
    ox.filter = "blur(14px)";
    ox.drawImage(raw, 0, 0);
    ox.filter = "none";
    return out;
  }

  private fgBranch(): HTMLCanvasElement {
    const [raw, rx] = makeCanvas(480, 480);
    rx.strokeStyle = "rgba(9,12,16,0.95)";
    rx.lineCap = "round";
    rx.lineWidth = 22;
    rx.beginPath();
    rx.moveTo(-20, 120);
    rx.quadraticCurveTo(240, 200, 500, 400);
    rx.stroke();
    rx.lineWidth = 9;
    for (let i = 0; i < 5; i++) {
      const t = 0.25 + i * 0.15;
      const px = -20 + 520 * t;
      const py = 120 + 280 * t + (hash(i, 61) - 0.5) * 40;
      rx.beginPath();
      rx.moveTo(px, py);
      rx.quadraticCurveTo(px + 30, py - 60 - hash(i, 62) * 60, px + 10, py - 130);
      rx.stroke();
    }
    const [out, ox] = makeCanvas(480, 480);
    ox.filter = "blur(11px)";
    ox.drawImage(raw, 0, 0);
    ox.filter = "none";
    return out;
  }

  private fgFern(): HTMLCanvasElement {
    const [raw, rx] = makeCanvas(480, 480);
    rx.strokeStyle = "rgba(9,12,16,0.95)";
    rx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.34;
      const len = 200 + hash(i, 71) * 150;
      rx.lineWidth = 8 + hash(i, 72) * 5;
      rx.beginPath();
      rx.moveTo(240, 500);
      rx.quadraticCurveTo(
        240 + Math.cos(a) * len * 0.4, 500 + Math.sin(a) * len * 0.6,
        240 + Math.cos(a + 0.4) * len, 500 + Math.sin(a + 0.4) * len,
      );
      rx.stroke();
    }
    const [out, ox] = makeCanvas(480, 480);
    ox.filter = "blur(9px)";
    ox.drawImage(raw, 0, 0);
    ox.filter = "none";
    return out;
  }

  /* ---------------- palette + per-bucket tinting ---------------- */

  setPhase(phase: number): void {
    this.pal = samplePalette(phase);
    const b = Math.floor(((phase % NPAL) + NPAL) % NPAL * 8) % 32;
    if (b === this.bucket) return;
    this.bucket = b;
    this.glowIdx = Math.round(((phase % NPAL) + NPAL) % NPAL) % NPAL;
    this.tint(this.farTint, this.farMask, this.pal.treeFar);
    this.tint(this.nearTint, this.nearMask, this.pal.treeMid);
    this.tint(this.trunkTint, this.trunkMask, mix(this.pal.treeMid, this.pal.ground, 0.6));
    this.fogSprite = radialSprite(256, this.pal.fog, 0.55, 0.26);
  }

  private tint(dst: HTMLCanvasElement, mask: HTMLCanvasElement, color: RGB): void {
    const x = dst.getContext("2d") as CanvasRenderingContext2D;
    x.globalCompositeOperation = "source-over";
    x.clearRect(0, 0, dst.width, dst.height);
    x.fillStyle = rgb(color);
    x.fillRect(0, 0, dst.width, dst.height);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(mask, 0, 0);
    x.globalCompositeOperation = "source-over";
  }

  onResize(w: number, h: number): void {
    const [v, vx] = makeCanvas(w, h);
    const r = Math.hypot(w, h) * 0.62;
    const g = vx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.34, w / 2, h * 0.5, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(2,3,8,0.5)");
    vx.fillStyle = g;
    vx.fillRect(0, 0, w, h);
    this.vignette = v;

    this.motes = [];
    for (let i = 0; i < 80; i++) {
      this.motes.push({
        x: rand(w), y: rand(h * 0.75), r: rand(0.6, 1.9),
        ph: rand(TAU), sp: rand(4, 14),
      });
    }
    this.wisps = [];
    for (let i = 0; i < 6; i++) {
      this.wisps.push({
        x: rand(w), y: rand(h * 0.14, h * 0.62),
        s: rand(200, 430), vx: rand(7, 17), a: rand(0.05, 0.1),
      });
    }
  }

  /* ---------------- render passes ---------------- */

  renderSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgb(this.pal.skyTop));
    g.addColorStop(1, rgb(this.pal.skyLow));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  /** photoreal backdrop with mood grading, celestial glow, stars & moon */
  renderFar(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    const p = this.pal;
    // weight of the dusk image — cyclical triangle peaking at phase 3
    const phase = this.bucket / 8;
    const d = Math.abs(phase - 3);
    const cyc = Math.min(d, NPAL - d);
    const wB = smooth(clamp(1 - cyc / 1.4, 0, 1));
    const wA = 1 - wB;
    const driftX = Math.sin(time * 0.021) * 8;

    if (this.dawnCv && wA > 0.01) {
      this.drawCover(ctx, this.dawnCv, w, h, driftX, wA);
    }
    if (this.duskCv && wB > 0.01) {
      this.drawCover(ctx, this.duskCv, w, h, -driftX, wB);
    }

    // mood wash + night dim
    ctx.fillStyle = rgb(p.fog, 0.07);
    ctx.fillRect(0, 0, w, h);
    if (p.night > 0.01) {
      ctx.fillStyle = `rgba(3,5,16,${(p.night * 0.36).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }

    const ax = p.sunX * w;
    const ay = p.sunY * h * 0.9;

    // stars
    if (p.night > 0.03) {
      ctx.save();
      for (let i = 0; i < this.stars.length; i++) {
        ctx.globalAlpha = p.night * (0.34 + 0.3 * Math.sin(time * 1.6 + i * 2.2));
        const sx = -((time * (2 + i)) % w);
        const sc = Math.max(w / 1600, h / 900);
        const sw2 = 1600 * sc;
        ctx.drawImage(this.stars[i], sx, 0, sw2, 900 * sc);
        ctx.drawImage(this.stars[i], sx + sw2, 0, sw2, 900 * sc);
      }
      ctx.restore();
    }

    // celestial glow (sun or moon halo)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gr = ctx.createRadialGradient(ax, ay, 8, ax, ay, h * 0.72);
    gr.addColorStop(0, rgb(p.sun, 0.5 * (1 - p.night * 0.45)));
    gr.addColorStop(1, rgb(p.sun, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    if (p.night > 0.2) {
      ctx.globalAlpha = p.night;
      ctx.drawImage(this.moonSprite, ax - 60, ay - 60, 120, 120);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  private drawCover(
    ctx: CanvasRenderingContext2D, img: HTMLCanvasElement,
    w: number, h: number, dx: number, alpha: number,
  ): void {
    const s = Math.max(w / img.width, h / img.height) * 1.07;
    const dw = img.width * s;
    const dh = img.height * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (w - dw) / 2 + dx, h - dh, dw, dh);
    ctx.globalAlpha = 1;
  }

  /** distant forest silhouettes dissolving into fog */
  renderTreelines(
    ctx: CanvasRenderingContext2D, w: number, h: number, gy: number, scroll: number,
  ): void {
    const sF = (h * 0.3) / 340;
    const wF = 2048 * sF;
    const yF = gy + 26 - h * 0.3;
    let off = -((scroll * 0.06) % wF);
    ctx.globalAlpha = 0.8;
    for (; off < w; off += wF) ctx.drawImage(this.farTint, off, yF, wF, h * 0.3);
    ctx.globalAlpha = 1;

    // horizontal fog band swallowing the horizon
    const fg = ctx.createLinearGradient(0, gy - 95, 0, gy + 40);
    fg.addColorStop(0, rgb(this.pal.fog, 0));
    fg.addColorStop(0.55, rgb(this.pal.fog, 0.5));
    fg.addColorStop(1, rgb(this.pal.fog, 0));
    ctx.fillStyle = fg;
    ctx.fillRect(0, gy - 95, w, 135);

    const sN = (h * 0.37) / 400;
    const wN = 2048 * sN;
    const yN = gy + 18 - h * 0.37;
    off = -((scroll * 0.13) % wN);
    ctx.globalAlpha = 0.94;
    for (; off < w; off += wN) ctx.drawImage(this.nearTint, off, yN, wN, h * 0.37);
    ctx.globalAlpha = 1;
  }

  /** giant mid-ground trunks sweeping past */
  renderTrunks(ctx: CanvasRenderingContext2D, w: number, h: number, scroll: number): void {
    const sT = (h * 1.06) / 900;
    const wT = 3072 * sT;
    const y = h + 50 - h * 1.06;
    const off = -((scroll * 0.34) % wT);
    ctx.globalAlpha = 0.92;
    for (let o = off; o < w; o += wT) ctx.drawImage(this.trunkTint, o, y, wT, h * 1.06);
    ctx.globalAlpha = 1;
  }

  /** rotating volumetric god rays from the celestial anchor */
  renderRays(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    const p = this.pal;
    const strength = 1 - p.night * 0.72;
    if (strength < 0.05) return;
    const ax = p.sunX * w;
    const ay = p.sunY * h * 0.9;
    const len = h * 1.4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) {
      const a = 1.95 + i * 0.17 + Math.sin(time * 0.05 + i * 1.7) * 0.06;
      const wide = 0.03 + hash(i, 81) * 0.05;
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.11 + i * 2.3);
      ctx.fillStyle = rgb(p.ray, 0.045 * strength * pulse + 0.02 * strength);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(a - wide) * len, ay + Math.sin(a - wide) * len);
      ctx.lineTo(ax + Math.cos(a + wide) * len, ay + Math.sin(a + wide) * len);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------------- ground & decor ---------------- */

  renderGroundFill(ctx: CanvasRenderingContext2D, w: number, h: number, gy: number): void {
    ctx.fillStyle = rgb(this.pal.ground);
    ctx.fillRect(0, gy, w, h - gy);
    const sheen = ctx.createLinearGradient(0, gy, 0, gy + 26);
    sheen.addColorStop(0, rgb(this.pal.rim, 0.14));
    sheen.addColorStop(1, rgb(this.pal.rim, 0));
    ctx.fillStyle = sheen;
    ctx.fillRect(0, gy, w, 26);
    ctx.fillStyle = rgb(this.pal.rim, 0.2);
    ctx.fillRect(0, gy - 0.5, w, 1);
  }

  /** grass, tufts, stones, glow-shrooms — drawn over obstacle bases */
  renderFlora(ctx: CanvasRenderingContext2D, w: number, gy: number, scroll: number, time: number): void {
    const blade = mix(this.pal.ground, [255, 255, 255], 0.09);
    const tuft = mix(this.pal.ground, [255, 255, 255], 0.15);

    // dense fine grass — one batched path
    ctx.fillStyle = rgb(blade);
    ctx.beginPath();
    const step = 13;
    const i0 = Math.floor(scroll / step) - 1;
    const n = Math.ceil(w / step) + 3;
    for (let k = 0; k < n; k++) {
      const i = i0 + k;
      const sx = i * step - scroll + hash(i, 91) * 8;
      const hh = 7 + hash(i, 92) * 18;
      const lean = (hash(i, 93) - 0.5) * 6 + Math.sin(time * 1.3 + i * 0.35) * 2.4;
      ctx.moveTo(sx - 1.25, gy + 2);
      ctx.lineTo(sx + lean, gy - hh);
      ctx.lineTo(sx + 1.25, gy + 2);
    }
    ctx.fill();

    // tall accent tufts
    ctx.fillStyle = rgb(tuft);
    ctx.beginPath();
    const tStep = 97;
    const t0 = Math.floor(scroll / tStep) - 1;
    const tn = Math.ceil(w / tStep) + 3;
    for (let k = 0; k < tn; k++) {
      const i = t0 + k;
      if (hash(i, 94) < 0.3) continue;
      const bx = i * tStep - scroll + hash(i, 95) * 50;
      const blades = 3 + ((hash(i, 96) * 3) | 0);
      for (let b = 0; b < blades; b++) {
        const hh = 22 + hash(i * 7 + b, 97) * 26;
        const lean = (b - blades / 2) * 7 + Math.sin(time * 1.1 + i) * 2.6;
        ctx.moveTo(bx - 2, gy + 2);
        ctx.lineTo(bx + lean, gy - hh);
        ctx.lineTo(bx + 2, gy + 2);
      }
    }
    ctx.fill();

    // stones + glowing mushrooms
    const sStep = 173;
    const s0 = Math.floor(scroll / sStep) - 1;
    const sn = Math.ceil(w / sStep) + 3;
    for (let k = 0; k < sn; k++) {
      const i = s0 + k;
      const sx = i * sStep - scroll + hash(i, 98) * 90;
      if (hash(i, 99) < 0.4) {
        const sw = 8 + hash(i, 100) * 18;
        const sh = sw * 0.45;
        ctx.fillStyle = rgb(mix(this.pal.ground, [0, 0, 0], 0.4));
        ctx.beginPath();
        ctx.ellipse(sx, gy + sh * 0.2, sw * 0.5, sh, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = rgb(this.pal.rim, 0.12);
        ctx.fillRect(sx - sw * 0.32, gy + sh * 0.2 - sh - 1, sw * 0.64, 1);
      } else if (hash(i, 101) < 0.22) {
        // little glowing mushroom
        const mh = 7 + hash(i, 102) * 6;
        ctx.fillStyle = rgb(mix(this.pal.fog, this.pal.ground, 0.4), 0.9);
        ctx.fillRect(sx - 1, gy - mh, 2, mh);
        ctx.fillStyle = rgb(this.pal.accent, 0.35 + this.pal.night * 0.5);
        ctx.beginPath();
        ctx.ellipse(sx, gy - mh, 4.5, 2.8, 0, Math.PI, 0);
        ctx.fill();
      }
    }
  }

  /* ---------------- obstacles ---------------- */

  renderObstacle(
    ctx: CanvasRenderingContext2D, ob: Obstacle, gy: number, time: number,
  ): void {
    const p = this.pal;
    const col = rgb(p.ground);
    const rim = rgb(p.rim, 0.16);
    const x = ob.x;

    // ground shadow
    if (ob.kind !== "vine") {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.ellipse(x, gy + 5, ob.w * 0.62, 6.5, 0, 0, TAU);
      ctx.fill();
    }

    switch (ob.kind) {
      case "rock":
      case "boulder": {
        const v = ob.verts ?? [-ob.w / 2, 0, 0, -ob.h, ob.w / 2, 0];
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x + v[0], gy + v[1]);
        for (let i = 2; i < v.length; i += 2) ctx.lineTo(x + v[i], gy + v[i + 1]);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // a weathered crack
        ctx.strokeStyle = rgb(p.rim, 0.1);
        ctx.beginPath();
        ctx.moveTo(x - ob.w * 0.14, gy - ob.h * 0.75);
        ctx.lineTo(x + ob.w * 0.05, gy - ob.h * 0.35);
        ctx.lineTo(x - ob.w * 0.02, gy - ob.h * 0.1);
        ctx.stroke();
        break;
      }
      case "log": {
        const hw = ob.w / 2;
        const hh = ob.h / 2;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.roundRect(x - hw, gy - ob.h, ob.w, ob.h, hh);
        ctx.fill();
        ctx.strokeStyle = rim;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // end grain ring
        ctx.strokeStyle = rgb(p.rim, 0.22);
        ctx.beginPath();
        ctx.ellipse(x + hw - 3, gy - hh, 3.4, hh * 0.82, 0, 0, TAU);
        ctx.stroke();
        // branch stubs
        ctx.fillStyle = col;
        for (let s = 0; s < 2; s++) {
          const sx = x - hw * 0.5 + hash(ob.seed + s, 111) * ob.w * 0.8;
          const sl = 8 + hash(ob.seed + s, 112) * 9;
          ctx.beginPath();
          ctx.moveTo(sx - 3.4, gy - ob.h + 2);
          ctx.lineTo(sx, gy - ob.h - sl);
          ctx.lineTo(sx + 3.4, gy - ob.h + 2);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case "bramble": {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - ob.w / 2, gy);
        const spikes = 9;
        for (let s = 0; s < spikes; s++) {
          const fr = s / (spikes - 1);
          const sx = x - ob.w / 2 + ob.w * fr;
          const sh = ob.h * (0.5 + hash(ob.seed + s, 113) * 0.6);
          ctx.lineTo(sx - 5, gy - sh * 0.4);
          ctx.lineTo(sx, gy - sh);
          ctx.lineTo(sx + 5, gy - sh * 0.35);
        }
        ctx.lineTo(x + ob.w / 2, gy);
        ctx.closePath();
        ctx.fill();
        // arcing thorn stems
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.4;
        for (let s = 0; s < 4; s++) {
          const sx = x - ob.w / 2 + hash(ob.seed + s, 114) * ob.w;
          ctx.beginPath();
          ctx.moveTo(sx, gy);
          ctx.quadraticCurveTo(
            sx + (hash(ob.seed + s, 115) - 0.5) * 30,
            gy - ob.h * 1.1,
            sx + (hash(ob.seed + s, 116) - 0.5) * 46,
            gy - ob.h * (0.9 + hash(ob.seed + s, 117) * 0.4),
          );
          ctx.stroke();
        }
        break;
      }
      case "stump": {
        const hw = ob.w / 2;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - hw, gy);
        ctx.lineTo(x - hw * 0.86, gy - ob.h);
        ctx.quadraticCurveTo(x, gy - ob.h - 5, x + hw * 0.86, gy - ob.h);
        ctx.lineTo(x + hw, gy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgb(p.rim, 0.2);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(x, gy - ob.h + 1, hw * 0.8, 3.6, 0, 0, TAU);
        ctx.stroke();
        break;
      }
      case "vine": {
        // hanging thorn vine — slide beneath it
        const top = gy - 320 - hash(ob.seed, 118) * 140;
        const botY = gy - ob.h;
        const sway = Math.sin(time * 0.9 + ob.seed) * 7;
        ctx.strokeStyle = col;
        ctx.lineCap = "round";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + sway * 1.6, (top + botY) / 2, x + sway, botY + 8);
        ctx.quadraticCurveTo(x + sway - 2, botY + 4, x + sway - 4, botY);
        ctx.stroke();
        // leaves
        ctx.fillStyle = col;
        for (let l = 0; l < 6; l++) {
          const fr = (l + 1) / 7;
          const ly = top + (botY - top) * fr;
          const lx = x + sway * fr * 1.4 + (hash(ob.seed + l, 119) - 0.5) * 14;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(hash(ob.seed + l, 120) * TAU);
          ctx.beginPath();
          ctx.ellipse(0, 0, 8 + hash(ob.seed + l, 121) * 5, 3.6, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        // thorn cluster at the tip — the danger zone
        ctx.lineWidth = 3.2;
        for (let tth = 0; tth < 4; tth++) {
          const dir = (hash(ob.seed + tth, 122) - 0.5) * 2;
          ctx.beginPath();
          ctx.moveTo(x + sway, botY + 10);
          ctx.lineTo(x + sway + dir * 9, botY + 2 + hash(ob.seed + tth, 123) * 8);
          ctx.stroke();
        }
        break;
      }
    }
  }

  /* ---------------- pickups ---------------- */

  renderFly(ctx: CanvasRenderingContext2D, f: Fly, time: number): void {
    const y = f.baseY + Math.sin(time * 2.1 + f.phase) * 9;
    f.y = y;
    const pulse = 0.75 + Math.sin(time * 3.2 + f.phase) * 0.25;
    const glow = this.glowSprites[this.glowIdx];
    const s = 30 * pulse * (0.8 + this.pal.night * 0.4);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow, f.x - s / 2, y - s / 2, s, s);
    ctx.fillStyle = rgb(this.pal.mote, 0.95);
    ctx.beginPath();
    ctx.arc(f.x, y, 1.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  renderBloom(ctx: CanvasRenderingContext2D, b: { x: number; y: number; phase: number }, time: number): void {
    const p = this.pal;
    const pulse = 0.85 + Math.sin(time * 2.4 + b.phase) * 0.15;
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(time * 1.6 + b.phase) * 10);
    ctx.globalCompositeOperation = "lighter";
    const glow = this.glowSprites[(this.glowIdx + 2) % NPAL];
    const s = 90 * pulse;
    ctx.drawImage(glow, -s / 2, -s / 2, s, s);
    ctx.restore();

    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(time * 1.6 + b.phase) * 10);
    ctx.rotate(time * 0.6);
    ctx.fillStyle = rgb(p.rim, 0.9);
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * TAU);
      ctx.beginPath();
      ctx.ellipse(0, -9 * pulse, 4.6 * pulse, 8.5 * pulse, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#fff6dd";
    ctx.beginPath();
    ctx.arc(0, 0, 3.4 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- ambient air ---------------- */

  updateAmbient(dt: number, w: number, h: number, time: number): void {
    for (const m of this.motes) {
      m.x -= m.sp * dt;
      m.y += Math.sin(time * 0.7 + m.ph) * 5 * dt;
      if (m.x < -8) {
        m.x = w + 8;
        m.y = rand(h * 0.75);
      }
    }
    for (const ws of this.wisps) {
      ws.x -= ws.vx * dt;
      if (ws.x < -ws.s) {
        ws.x = w + ws.s;
        ws.y = rand(h * 0.14, h * 0.62);
      }
    }
  }

  renderWisps(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const ws of this.wisps) {
      ctx.globalAlpha = ws.a;
      ctx.drawImage(this.fogSprite, ws.x - ws.s / 2, ws.y - ws.s / 2, ws.s, ws.s);
    }
    ctx.restore();
  }

  renderMotes(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const col = this.softDot;
    for (const m of this.motes) {
      const tw = 0.5 + 0.5 * Math.sin(time * 1.5 + m.ph);
      ctx.globalAlpha = (0.1 + tw * 0.22) * (0.6 + this.pal.night * 0.7);
      const s = m.r * 7;
      ctx.drawImage(col, m.x - s / 2, m.y - s / 2, s, s);
    }
    ctx.restore();
  }

  /** huge out-of-focus foreground foliage whipping past the camera */
  renderForeground(ctx: CanvasRenderingContext2D, w: number, h: number, scroll: number): void {
    const spacing = 1150;
    const sc = scroll * 1.5;
    const i0 = Math.floor(sc / spacing);
    for (let i = i0 - 1; i * spacing < sc + w + 700; i++) {
      const px = i * spacing - sc + hash(i, 131) * 420;
      if (px < -620 || px > w + 320) continue;
      const v = hash(i, 132);
      const spr = this.fgSprites[(v * 3) | 0];
      const s = (0.9 + hash(i, 133) * 1.15) * (h / 760);
      const dw = 480 * s;
      const dh = 480 * s;
      const top = hash(i, 134) > 0.6;
      const y = top ? -dh * (0.3 + hash(i, 135) * 0.2) : h - dh * (0.4 + hash(i, 135) * 0.25);
      ctx.save();
      ctx.globalAlpha = 0.93;
      if (hash(i, 136) > 0.5) {
        ctx.translate(px + dw / 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(spr, -dw / 2, y, dw, dh);
      } else {
        ctx.drawImage(spr, px, y, dw, dh);
      }
      ctx.restore();
    }
  }

  renderVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.vignette) ctx.drawImage(this.vignette, 0, 0, w, h);
    if (this.pal.night > 0.02) {
      ctx.fillStyle = `rgba(2,4,12,${(this.pal.night * 0.12).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
