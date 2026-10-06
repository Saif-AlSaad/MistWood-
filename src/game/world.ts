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

  private mountainMask!: HTMLCanvasElement;
  private mountainTint!: HTMLCanvasElement;
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
    const base = ((import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL || "./").replace(/\/?$/, "/");
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
    // 1. Extreme background mountain ridge with deep DoF blur
    const [mount, mountX] = makeCanvas(2048, 280);
    this.mountainRidge(mountX, 2048, 280);
    const [mountBlur, mountBlurX] = makeCanvas(2048, 280);
    mountBlurX.filter = "blur(4.5px)";
    mountBlurX.drawImage(mount, -2048, 0);
    mountBlurX.drawImage(mount, 0, 0);
    mountBlurX.drawImage(mount, 2048, 0);
    mountBlurX.filter = "none";
    this.mountainMask = mountBlur;

    // 2. Far forest treeline ridge with soft DoF optical blur
    const [far, farX] = makeCanvas(2048, 340);
    this.ridge(farX, 2048, 340, 116, 0.44, 0.15, true);
    const [farBlur, farBlurX] = makeCanvas(2048, 340);
    farBlurX.filter = "blur(2.2px)";
    farBlurX.drawImage(far, -2048, 0);
    farBlurX.drawImage(far, 0, 0);
    farBlurX.drawImage(far, 2048, 0);
    farBlurX.filter = "none";
    this.farMask = farBlur;

    // 3. Near crisp pine treeline
    const [near, nearX] = makeCanvas(2048, 400);
    this.ridge(nearX, 2048, 400, 52, 0.62, 0.36, false);
    this.nearMask = near;

    // 4. Midground giant trunks
    const [trk, trkX] = makeCanvas(3072, 900);
    this.trunks(trkX, 3072, 900);
    this.trunkMask = trk;

    const [mt] = makeCanvas(2048, 280);
    this.mountainTint = mt;
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

  /**
   * Seamless grand rolling mountain crest for extreme distant parallax layer
   */
  private mountainRidge(x: CanvasRenderingContext2D, w: number, h: number): void {
    x.fillStyle = "#ffffff";
    x.beginPath();
    x.moveTo(0, h);
    for (let px = 0; px <= w; px += 4) {
      const u = (px / w) * TAU;
      const my =
        h -
        h * 0.42 -
        Math.sin(u * 1 + 0.5) * h * 0.22 -
        Math.sin(u * 3 + 2.1) * h * 0.11 -
        Math.sin(u * 7 + 4.5) * h * 0.05 -
        Math.sin(u * 13 + 1.2) * h * 0.02;
      x.lineTo(px, my);
    }
    x.lineTo(w, h);
    x.closePath();
    x.fill();
  }

  /**
   * Evaluates a multi-harmonic fractal hill curve that wraps perfectly at w
   */
  private ridgeHeight(px: number, w: number, h: number): number {
    const u = (px / w) * TAU;
    return (
      h -
      h * 0.34 -
      Math.sin(u * 2 + 1.2) * h * 0.055 -
      Math.sin(u * 5 + 3.8) * h * 0.038 -
      Math.sin(u * 9 + 0.5) * h * 0.02 -
      Math.sin(u * 17 + 2.3) * h * 0.011 -
      Math.sin(u * 31 + 4.1) * h * 0.005
    );
  }

  /**
   * Photorealistic conifer (fir, spruce, pine) with tapered trunk,
   * needle spire apex, serrated jagged needle boughs, and drooping branch tips
   */
  private drawRealisticConifer(
    x: CanvasRenderingContext2D,
    tx: number,
    baseY: number,
    th: number,
    tw: number,
    seed: number,
  ): void {
    const lean = (hash(seed, 101) - 0.5) * tw * 0.14;
    const rootW = Math.max(3, tw * 0.11);
    const topW = 0.9;
    const spireY = baseY - th;
    const trunkTopY = baseY - th * 0.88;

    // 1. Tapered trunk with root flare
    x.beginPath();
    x.moveTo(tx - rootW * 1.5, baseY + 3);
    x.quadraticCurveTo(tx - rootW * 0.8, baseY - th * 0.25, tx + lean * 0.7 - topW, trunkTopY);
    x.lineTo(tx + lean * 0.7 + topW, trunkTopY);
    x.quadraticCurveTo(tx + rootW * 0.8, baseY - th * 0.25, tx + rootW * 1.5, baseY + 3);
    x.closePath();
    x.fill();

    // 2. Apical needle spire tip
    x.beginPath();
    x.moveTo(tx + lean - 1.4, trunkTopY);
    x.lineTo(tx + lean, spireY);
    x.lineTo(tx + lean + 1.4, trunkTopY);
    x.closePath();
    x.fill();

    // Small spire needle whorls
    for (let s = 1; s <= 3; s++) {
      const sy = spireY + (trunkTopY - spireY) * (s / 3.5);
      const sw = tw * 0.13 * (s / 3.5);
      x.beginPath();
      x.moveTo(tx + lean, sy - 3);
      x.lineTo(tx + lean - sw, sy + 3);
      x.lineTo(tx + lean - sw * 0.4, sy + 1.5);
      x.lineTo(tx + lean, sy + 3.5);
      x.lineTo(tx + lean + sw * 0.4, sy + 1.5);
      x.lineTo(tx + lean + sw, sy + 3);
      x.closePath();
      x.fill();
    }

    // 3. Main needle bough whorls (8 to 13 tiers)
    const tiers = Math.max(8, Math.min(13, Math.floor(th / 13)));
    for (let tr = 0; tr < tiers; tr++) {
      const fr = (tr + 1) / (tiers + 1);
      const ty = spireY + th * (0.12 + fr * 0.76);
      const trLean = lean * fr;
      const cx = tx + trLean;

      const curveW = Math.pow(fr, 0.72) * tw;
      const leftW = curveW * (0.82 + hash(seed * 17 + tr * 3, 102) * 0.36);
      const rightW = curveW * (0.82 + hash(seed * 19 + tr * 5, 103) * 0.36);

      const droop = th * 0.038 * (0.4 + fr * 0.8);
      const tierH = th * 0.085 * (0.7 + fr * 0.5);

      // Left bough with serrated needle fringe
      x.beginPath();
      x.moveTo(cx, ty - tierH * 0.4);
      x.quadraticCurveTo(cx - leftW * 0.55, ty - tierH * 0.08, cx - leftW, ty + droop);
      const teethL = 3 + Math.floor(fr * 3);
      for (let t = teethL - 1; t >= 0; t--) {
        const p = t / teethL;
        const notchX = cx - leftW * p;
        const toothY = ty + droop * p + (t % 2 === 1 ? tierH * 0.35 : -tierH * 0.08);
        x.lineTo(notchX, toothY);
      }
      x.lineTo(cx, ty + tierH * 0.2);
      x.closePath();
      x.fill();

      // Right bough with serrated needle fringe
      x.beginPath();
      x.moveTo(cx, ty - tierH * 0.4);
      x.quadraticCurveTo(cx + rightW * 0.55, ty - tierH * 0.08, cx + rightW, ty + droop);
      const teethR = 3 + Math.floor(fr * 3);
      for (let t = teethR - 1; t >= 0; t--) {
        const p = t / teethR;
        const notchX = cx + rightW * p;
        const toothY = ty + droop * p + (t % 2 === 1 ? tierH * 0.35 : -tierH * 0.08);
        x.lineTo(notchX, toothY);
      }
      x.lineTo(cx, ty + tierH * 0.2);
      x.closePath();
      x.fill();
    }

    // 4. Lower dead twig stubs
    for (let d = 0; d < 2; d++) {
      const dy = baseY - th * (0.07 + d * 0.05);
      const dir = hash(seed * 11 + d, 104) > 0.5 ? 1 : -1;
      const len = tw * (0.16 + hash(seed * 13 + d, 105) * 0.22);
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(tx, dy);
      x.lineTo(tx + dir * len, dy - 2);
      x.stroke();
    }
  }

  /**
   * Photorealistic broadleaf tree (oak, maple, elderwood) with
   * spreading branch skeleton and organic ruffled foliage masses (no smooth discs)
   */
  private drawRealisticBroadleaf(
    x: CanvasRenderingContext2D,
    tx: number,
    baseY: number,
    th: number,
    tw: number,
    seed: number,
  ): void {
    const rootW = Math.max(3.5, tw * 0.12);
    const forkY = baseY - th * (0.36 + hash(seed, 201) * 0.14);

    // 1. Gnarled trunk
    x.beginPath();
    x.moveTo(tx - rootW * 1.5, baseY + 3);
    x.quadraticCurveTo(tx - rootW * 0.8, (baseY + forkY) / 2, tx - rootW * 0.5, forkY);
    x.lineTo(tx + rootW * 0.5, forkY);
    x.quadraticCurveTo(tx + rootW * 0.8, (baseY + forkY) / 2, tx + rootW * 1.5, baseY + 3);
    x.closePath();
    x.fill();

    // 2. Main spreading branch limbs
    const branchCount = 4 + Math.floor(hash(seed, 202) * 2);
    const lobes: { x: number; y: number; r: number }[] = [];

    for (let b = 0; b < branchCount; b++) {
      const angleFr = (b - (branchCount - 1) / 2) / (branchCount / 2);
      const spreadX = angleFr * tw * (0.45 + hash(seed + b * 5, 203) * 0.25);
      const reachY = th * (0.65 + hash(seed + b * 7, 204) * 0.28);
      const endX = tx + spreadX;
      const endY = baseY - reachY;
      const ctrlX = tx + spreadX * 0.5 + (hash(seed + b * 3, 205) - 0.5) * tw * 0.2;
      const ctrlY = (forkY + endY) / 2 + (hash(seed + b * 9, 206) - 0.5) * th * 0.1;

      x.lineWidth = Math.max(2, rootW * (0.6 - (reachY / th) * 0.3));
      x.beginPath();
      x.moveTo(tx, forkY);
      x.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
      x.stroke();

      lobes.push({
        x: endX,
        y: endY,
        r: tw * (0.28 + hash(seed + b * 11, 207) * 0.18),
      });

      if (hash(seed + b * 13, 208) > 0.35) {
        lobes.push({
          x: (ctrlX + endX) / 2 + (hash(seed + b * 17, 209) - 0.5) * tw * 0.16,
          y: (ctrlY + endY) / 2,
          r: tw * (0.2 + hash(seed + b * 19, 210) * 0.14),
        });
      }
    }

    // Central crown lobe
    lobes.push({
      x: tx + (hash(seed, 211) - 0.5) * tw * 0.2,
      y: baseY - th * 0.78,
      r: tw * 0.32,
    });

    // 3. Render organic ruffled foliage clusters (natural leaf outlines)
    for (let i = 0; i < lobes.length; i++) {
      const lobe = lobes[i];
      const points = 11;
      x.beginPath();
      for (let p = 0; p <= points; p++) {
        const idx = p % points;
        const angle = (idx / points) * TAU;
        const r = lobe.r * (0.78 + hash(seed * 23 + i * 31 + idx * 7, 212) * 0.42);
        const px = lobe.x + Math.cos(angle) * r;
        const py = lobe.y + Math.sin(angle) * r * 0.88;
        if (p === 0) {
          x.moveTo(px, py);
        } else {
          const prevAngle = ((idx - 0.5) / points) * TAU;
          const cr = lobe.r * (0.86 + hash(seed * 29 + i * 37 + idx * 5, 213) * 0.32);
          const cpx = lobe.x + Math.cos(prevAngle) * cr;
          const cpy = lobe.y + Math.sin(prevAngle) * cr * 0.88;
          x.quadraticCurveTo(cpx, cpy, px, py);
        }
      }
      x.closePath();
      x.fill();
    }
  }

  /**
   * Ancient weathered dead tree snag with broken crown and spiky limbs
   */
  private drawRealisticSnag(
    x: CanvasRenderingContext2D,
    tx: number,
    baseY: number,
    th: number,
    tw: number,
    seed: number,
  ): void {
    const rootW = Math.max(3, tw * 0.11);
    const lean = (hash(seed, 301) - 0.5) * tw * 0.22;
    const breakY = baseY - th * (0.68 + hash(seed, 302) * 0.24);

    x.beginPath();
    x.moveTo(tx - rootW * 1.5, baseY + 3);
    x.quadraticCurveTo(tx - rootW * 0.8 + lean * 0.4, (baseY + breakY) / 2, tx - rootW * 0.4 + lean, breakY);
    // Splintered broken crown
    x.lineTo(tx + lean - 1, breakY - 7);
    x.lineTo(tx + lean + 1, breakY - 3);
    x.lineTo(tx + lean + 3, breakY - 9);
    x.lineTo(tx + rootW * 0.4 + lean, breakY);
    x.quadraticCurveTo(tx + rootW * 0.8 + lean * 0.4, (baseY + breakY) / 2, tx + rootW * 1.5, baseY + 3);
    x.closePath();
    x.fill();

    // Spiky bare antler limbs
    x.lineWidth = rootW * 0.6;
    const limbs = 3 + Math.floor(hash(seed, 303) * 3);
    for (let l = 0; l < limbs; l++) {
      const ly = baseY - th * (0.3 + hash(seed + l * 5, 304) * 0.45);
      const dir = hash(seed + l * 7, 305) > 0.5 ? 1 : -1;
      const len = tw * (0.35 + hash(seed + l * 9, 306) * 0.35);
      const lx = tx + lean * (1 - (baseY - ly) / th);
      x.beginPath();
      x.moveTo(lx, ly);
      x.quadraticCurveTo(lx + dir * len * 0.5, ly - 8, lx + dir * len, ly - 4 + hash(seed + l, 307) * 14);
      x.stroke();
    }
  }

  /**
   * Underbrush, ferns, and salal clusters along the forest ridge
   */
  private drawRidgeUnderbrush(
    x: CanvasRenderingContext2D,
    tx: number,
    baseY: number,
    seed: number,
  ): void {
    const stems = 4 + Math.floor(hash(seed, 401) * 3);
    for (let s = 0; s < stems; s++) {
      const a = -Math.PI / 2 + (s - (stems - 1) / 2) * 0.4 + (hash(seed + s, 402) - 0.5) * 0.2;
      const len = 7 + hash(seed + s * 3, 403) * 13;
      const ex = tx + Math.cos(a) * len;
      const ey = baseY + Math.sin(a) * len * 0.8;
      x.lineWidth = 1.4;
      x.beginPath();
      x.moveTo(tx, baseY + 2);
      x.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, baseY - len * 0.5, ex, ey);
      x.stroke();
      x.beginPath();
      x.ellipse(ex, ey, 3.2, 1.8, a, 0, TAU);
      x.fill();
    }
  }

  /**
   * Seamless ridge of natural forest hills + realistic conifer/broadleaf silhouettes
   */
  private ridge(
    x: CanvasRenderingContext2D,
    w: number,
    h: number,
    trees: number,
    sizeK: number,
    broad: number,
    isFar = false,
  ): void {
    x.fillStyle = "#ffffff";
    x.strokeStyle = "#ffffff";

    // 1. Natural multi-harmonic rolling ground baseline
    x.beginPath();
    x.moveTo(0, h);
    for (let px = 0; px <= w; px += 4) {
      x.lineTo(px, this.ridgeHeight(px, w, h));
    }
    x.lineTo(w, h);
    x.closePath();
    x.fill();

    // 2. Lush underbrush along the ridge line
    if (!isFar) {
      const brushSteps = Math.floor(w / 32);
      for (let b = 0; b < brushSteps; b++) {
        const bx = b * 32 + hash(b, 501) * 20;
        const by = this.ridgeHeight(bx % w, w, h);
        this.drawRidgeUnderbrush(x, bx, by, b * 31);
        if (bx < 40) this.drawRidgeUnderbrush(x, bx + w, this.ridgeHeight((bx + w) % w, w, h), b * 31);
        if (bx > w - 40) this.drawRidgeUnderbrush(x, bx - w, this.ridgeHeight((bx - w + w) % w, w, h), b * 31);
      }
    }

    // 3. Dense, natural forest silhouettes
    const step = w / trees;
    for (let i = 0; i < trees; i++) {
      if (hash(i, 21) < (isFar ? 0.05 : 0.12)) continue; // gaps

      const tx = i * step + hash(i, 5) * step * 0.7;
      const baseY = this.ridgeHeight(tx % w, w, h);
      const th = h * sizeK * (0.6 + hash(i, 6) * 0.7);
      const tw = th * (isFar ? 0.3 : 0.38 + hash(i, 7) * 0.12);
      const isBroadleaf = hash(i, 8) < broad;
      const isSnag = !isFar && !isBroadleaf && hash(i, 9) > 0.92;

      const renderTreeAt = (atX: number) => {
        if (isSnag) {
          this.drawRealisticSnag(x, atX, baseY, th * 0.75, tw * 0.8, i * 47);
        } else if (isBroadleaf) {
          this.drawRealisticBroadleaf(x, atX, baseY, th, tw, i * 47);
        } else {
          this.drawRealisticConifer(x, atX, baseY, th, tw, i * 47);
        }
      };

      // Draw tree and wrap seamlessly across texture boundaries
      renderTreeAt(tx);
      if (tx - tw < 0) renderTreeAt(tx + w);
      if (tx + tw > w) renderTreeAt(tx - w);
    }
  }

  /**
   * Giant foreground/midground trunks with natural bark, branching boughs,
   * organic ruffled canopy masses, and hanging moss/lichen tendrils
   */
  private trunks(x: CanvasRenderingContext2D, w: number, h: number): void {
    x.fillStyle = "#ffffff";
    x.strokeStyle = "#ffffff";
    const n = 5;
    const step = w / n;

    for (let i = 0; i < n; i++) {
      const tx = i * step + step * 0.2 + hash(i, 31) * step * 0.5;
      const tw = 36 + hash(i, 32) * 44;
      const lean = (hash(i, 33) - 0.5) * 65;

      const renderTrunkAt = (atX: number) => {
        // Trunk body with organic tapering and flared base
        x.beginPath();
        x.moveTo(atX - tw * 0.7, h);
        x.quadraticCurveTo(atX - tw * 0.45 + lean * 0.3, h * 0.5, atX - tw * 0.32 + lean, -40);
        x.lineTo(atX + tw * 0.32 + lean, -40);
        x.quadraticCurveTo(atX + tw * 0.45 + lean * 0.3, h * 0.5, atX + tw * 0.75, h);
        x.closePath();
        x.fill();

        // Heavy spreading branch boughs
        for (let b = 0; b < 3; b++) {
          const by = h * (0.12 + hash(i * 3 + b, 34) * 0.38);
          const dir = hash(i * 3 + b, 35) > 0.5 ? 1 : -1;
          const bl = 70 + hash(i * 3 + b, 36) * 140;
          x.save();
          x.translate(atX + lean * (1 - by / h), by);
          x.rotate(dir * (0.45 + hash(i * 3 + b, 37) * 0.38));
          x.beginPath();
          x.moveTo(0, -9);
          x.quadraticCurveTo(bl * 0.5, -12, bl, 4);
          x.lineTo(bl, 13);
          x.quadraticCurveTo(bl * 0.4, 7, 0, 9);
          x.closePath();
          x.fill();
          x.restore();
        }

        // Hanging moss / lichen streamers from limbs
        for (let m = 0; m < 5; m++) {
          const my = h * (0.18 + hash(i * 7 + m, 601) * 0.3);
          const mx = atX + lean * (1 - my / h) + (hash(i * 7 + m, 602) - 0.5) * 160;
          const mLen = 28 + hash(i * 7 + m, 603) * 65;
          const sway = (hash(i * 7 + m, 604) - 0.5) * 14;
          x.lineWidth = 2.2;
          x.beginPath();
          x.moveTo(mx, my);
          x.quadraticCurveTo(mx + sway * 1.5, my + mLen * 0.5, mx + sway, my + mLen);
          x.stroke();
          // Moss tufts along streamer
          x.beginPath();
          x.ellipse(mx + sway * 0.6, my + mLen * 0.4, 3, 6, 0.2, 0, TAU);
          x.ellipse(mx + sway, my + mLen, 2.5, 5, 0.1, 0, TAU);
          x.fill();
        }

        // Overhead canopy: Organic ruffled leafy masses (replaces smooth circles)
        for (let cn = 0; cn < 7; cn++) {
          const cx2 = atX + lean + (hash(i * 7 + cn, 38) - 0.5) * 440;
          const cy2 = hash(i * 7 + cn, 39) * h * 0.14 - 15;
          const cr = 85 + hash(i * 7 + cn, 40) * 140;

          const points = 12;
          x.beginPath();
          for (let p = 0; p <= points; p++) {
            const idx = p % points;
            const angle = (idx / points) * TAU;
            const r = cr * (0.78 + hash(i * 53 + cn * 17 + idx, 605) * 0.42);
            const px = cx2 + Math.cos(angle) * r;
            const py = cy2 + Math.sin(angle) * r * 0.85;
            if (p === 0) {
              x.moveTo(px, py);
            } else {
              const prevAngle = ((idx - 0.5) / points) * TAU;
              const ccr = cr * (0.86 + hash(i * 41 + cn * 19 + idx, 606) * 0.3);
              x.quadraticCurveTo(cx2 + Math.cos(prevAngle) * ccr, cy2 + Math.sin(prevAngle) * ccr * 0.85, px, py);
            }
          }
          x.closePath();
          x.fill();
        }
      };

      renderTrunkAt(tx);
      if (tx - 300 < 0) renderTrunkAt(tx + w);
      if (tx + 300 > w) renderTrunkAt(tx - w);
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
    this.tint(this.mountainTint, this.mountainMask, mix(this.pal.skyLow, this.pal.treeFar, 0.42));
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

    // stars with twinkle
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

      // Rare ethereal shooting star / celestial spark in the deep night sky
      const starCycle = (time * 0.16) % 10;
      if (starCycle < 1.0) {
        const prog = starCycle / 1.0;
        const stX = w * 0.25 + prog * (w * 0.55);
        const stY = h * 0.06 + prog * (h * 0.22);
        const tLen = 60 * (1 - Math.abs(prog - 0.5) * 1.6);
        if (tLen > 4) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(220, 240, 255, ${(p.night * 0.7 * (1 - prog)).toFixed(3)})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(stX - tLen * 0.88, stY - tLen * 0.48);
          ctx.lineTo(stX, stY);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // Celestial glow (sun or moon halo + corona rings)
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // 1. Wide atmospheric sky diffusion
    const wideHalo = ctx.createRadialGradient(ax, ay, 10, ax, ay, Math.max(w, h) * 0.65);
    wideHalo.addColorStop(0, rgb(p.sun, Math.max(0, 0.42 - p.night * 0.22)));
    wideHalo.addColorStop(0.35, rgb(p.sun, Math.max(0, 0.16 - p.night * 0.09)));
    wideHalo.addColorStop(0.75, rgb(p.sun, Math.max(0, 0.04 - p.night * 0.02)));
    wideHalo.addColorStop(1, rgb(p.sun, 0));
    ctx.fillStyle = wideHalo;
    ctx.fillRect(0, 0, w, h);

    // 2. Focused optical corona ring (22-degree halo effect)
    const haloRadius = Math.min(w, h) * 0.22;
    const ringPulse = 0.94 + Math.sin(time * 0.4) * 0.06;
    const ringGrad = ctx.createRadialGradient(
      ax,
      ay,
      haloRadius * 0.85 * ringPulse,
      ax,
      ay,
      haloRadius * 1.15 * ringPulse
    );
    ringGrad.addColorStop(0, rgb(p.accent, 0));
    ringGrad.addColorStop(0.5, rgb(p.accent, 0.06 + (1 - p.night) * 0.04));
    ringGrad.addColorStop(1, rgb(p.accent, 0));
    ctx.fillStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(ax, ay, haloRadius * 1.2 * ringPulse, 0, TAU);
    ctx.fill();

    // 3. Subtle horizontal anamorphic lens streak across celestial center
    const streakW = Math.min(w * 0.75, 480);
    const streakH = 3.2;
    const streakGrad = ctx.createLinearGradient(ax - streakW, ay, ax + streakW, ay);
    streakGrad.addColorStop(0, rgb(p.sun, 0));
    streakGrad.addColorStop(0.35, rgb(p.sun, 0.06));
    streakGrad.addColorStop(0.5, rgb([255, 255, 255], 0.26));
    streakGrad.addColorStop(0.65, rgb(p.sun, 0.06));
    streakGrad.addColorStop(1, rgb(p.sun, 0));
    ctx.fillStyle = streakGrad;
    ctx.fillRect(ax - streakW, ay - streakH / 2, streakW * 2, streakH);

    // 4. Celestial Orb: Sun Disc vs Detailed Moon
    if (p.night < 0.65) {
      // Golden Sun disc with limb glow
      const sunRad = 28 * (1 - p.night * 0.35);
      const sunDisc = ctx.createRadialGradient(ax, ay, 0, ax, ay, sunRad);
      sunDisc.addColorStop(0, "#ffffff");
      sunDisc.addColorStop(0.45, rgb(p.sun, 0.95));
      sunDisc.addColorStop(0.85, rgb(p.sun, 0.4));
      sunDisc.addColorStop(1, rgb(p.sun, 0));
      ctx.fillStyle = sunDisc;
      ctx.beginPath();
      ctx.arc(ax, ay, sunRad, 0, TAU);
      ctx.fill();
    }

    if (p.night > 0.15) {
      // High-detail luminous moon disc with soft craters and moon halo
      ctx.globalAlpha = p.night;
      this.drawDetailedMoon(ctx, ax, ay, 44);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawDetailedMoon(ctx: CanvasRenderingContext2D, mx: number, my: number, rad: number): void {
    // Outer soft moon corona
    const moonGlow = ctx.createRadialGradient(mx, my, rad * 0.5, mx, my, rad * 2.8);
    moonGlow.addColorStop(0, "rgba(215, 238, 255, 0.55)");
    moonGlow.addColorStop(0.4, "rgba(165, 210, 255, 0.2)");
    moonGlow.addColorStop(1, "rgba(120, 180, 255, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, rad * 2.8, 0, TAU);
    ctx.fill();

    // Lunar body disc
    const moonBody = ctx.createRadialGradient(mx - rad * 0.25, my - rad * 0.25, 0, mx, my, rad);
    moonBody.addColorStop(0, "#ffffff");
    moonBody.addColorStop(0.7, "#dbeafe");
    moonBody.addColorStop(1, "#93c5fd");
    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(mx, my, rad, 0, TAU);
    ctx.fill();

    // Lunar mare maria (dark basalt plains on moon)
    ctx.fillStyle = "rgba(70, 95, 140, 0.22)";
    ctx.beginPath();
    ctx.arc(mx - rad * 0.22, my - rad * 0.15, rad * 0.32, 0, TAU);
    ctx.arc(mx + rad * 0.18, my - rad * 0.22, rad * 0.24, 0, TAU);
    ctx.arc(mx + rad * 0.08, my + rad * 0.25, rad * 0.36, 0, TAU);
    ctx.arc(mx - rad * 0.32, my + rad * 0.12, rad * 0.2, 0, TAU);
    ctx.fill();
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
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    gy: number,
    scroll: number,
    time = 0,
  ): void {
    // 1. Extreme background mountain ridge (0.025x parallax, deep atmospheric haze)
    const sM = (h * 0.3) / 280;
    const wM = 2048 * sM;
    const yM = gy + 32 - h * 0.3;
    let offM = -((scroll * 0.025) % wM);
    ctx.globalAlpha = 0.52;
    for (; offM < w; offM += wM) ctx.drawImage(this.mountainTint, offM, yM, wM, h * 0.3);
    ctx.globalAlpha = 1;

    // 2. Far forest treeline (0.06x parallax, out-of-focus DoF blur)
    const sF = (h * 0.32) / 340;
    const wF = 2048 * sF;
    const yF = gy + 26 - h * 0.32;
    let off = -((scroll * 0.06) % wF);
    ctx.globalAlpha = 0.78;
    for (; off < w; off += wF) ctx.drawImage(this.farTint, off, yF, wF, h * 0.32);
    ctx.globalAlpha = 1;

    // 3. Volumetric undulating ground mist ribbons between far and near treeline
    this.renderVolumetricMist(ctx, w, gy, scroll, time);

    // 4. Near crisp pine treeline (0.13x parallax)
    const sN = (h * 0.38) / 400;
    const wN = 2048 * sN;
    const yN = gy + 18 - h * 0.38;
    off = -((scroll * 0.13) % wN);
    ctx.globalAlpha = 0.95;
    for (; off < w; off += wN) ctx.drawImage(this.nearTint, off, yN, wN, h * 0.38);
    ctx.globalAlpha = 1;
  }

  /** Animated rolling volumetric ground mist with wave offsets */
  private renderVolumetricMist(
    ctx: CanvasRenderingContext2D,
    w: number,
    gy: number,
    scroll: number,
    time: number,
  ): void {
    const p = this.pal;
    const mistColor = p.fog;

    // Deep broad horizon mist band
    const fg = ctx.createLinearGradient(0, gy - 110, 0, gy + 35);
    fg.addColorStop(0, rgb(mistColor, 0));
    fg.addColorStop(0.35, rgb(mistColor, 0.42));
    fg.addColorStop(0.7, rgb(mistColor, 0.32));
    fg.addColorStop(1, rgb(mistColor, 0));
    ctx.fillStyle = fg;
    ctx.fillRect(0, gy - 110, w, 145);

    // Rolling undulating mist ribbon with organic sine ripples
    ctx.save();
    ctx.fillStyle = rgb(mistColor, 0.24 + (1 - p.night) * 0.08);
    ctx.beginPath();
    ctx.moveTo(0, gy + 20);
    const step = 28;
    for (let x = 0; x <= w + step; x += step) {
      const u = x * 0.0045 + scroll * 0.001;
      const my =
        gy - 55 +
        Math.sin(u * 3 + time * 0.4) * 16 +
        Math.cos(u * 7 - time * 0.6) * 9 +
        Math.sin(u * 13 + time * 0.9) * 4;
      ctx.lineTo(x, my);
    }
    ctx.lineTo(w + step, gy + 30);
    ctx.lineTo(0, gy + 30);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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

  /** rotating volumetric god rays from the celestial anchor with canopy swaying shafts */
  renderRays(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    const p = this.pal;
    const isNight = p.night > 0.35;
    const dayStrength = Math.max(0, 1 - p.night * 0.95);
    const nightStrength = p.night * 0.65;
    const totalStrength = dayStrength + nightStrength;
    if (totalStrength < 0.04) return;

    const ax = p.sunX * w;
    const ay = p.sunY * h * 0.9;
    const rayLength = Math.hypot(w, h) * 1.35;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // Palette-informed ray tint: day uses warm amber p.ray, night uses ethereal cyan/ice-blue
    const rayColor: RGB = isNight
      ? mix([145, 210, 255], [195, 235, 255], 0.4)
      : p.ray;
    const baseAlpha = isNight ? 0.038 * nightStrength : 0.052 * dayStrength;

    // Cluster of 8 volumetric shafts with varying widths, angles, and gentle canopy sway
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const baseAngle = 1.82 + i * 0.14;
      const sway = Math.sin(time * 0.07 + i * 1.5) * 0.045 + Math.sin(time * 0.19 + i * 2.8) * 0.02;
      const angle = baseAngle + sway;
      const width = (0.025 + hash(i, 81) * 0.04) * (1 + Math.sin(time * 0.13 + i) * 0.15);
      const intensity = 0.6 + 0.4 * Math.sin(time * 0.22 + i * 2.1) + 0.15 * Math.sin(time * 0.5 + i * 3.4);

      // Gradient along the ray: faint near sky origin, swelling in canopy, feathering out near ground
      const startDist = 30;
      const p1x = ax + Math.cos(angle) * startDist;
      const p1y = ay + Math.sin(angle) * startDist;
      const p2x = ax + Math.cos(angle) * rayLength;
      const p2y = ay + Math.sin(angle) * rayLength;

      const grad = ctx.createLinearGradient(p1x, p1y, p2x, p2y);
      const a = baseAlpha * intensity;
      grad.addColorStop(0, rgb(rayColor, a * 0.2));
      grad.addColorStop(0.18, rgb(rayColor, a * 1.2));
      grad.addColorStop(0.55, rgb(rayColor, a * 0.8));
      grad.addColorStop(0.88, rgb(rayColor, a * 0.3));
      grad.addColorStop(1, rgb(rayColor, 0));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(angle - width) * rayLength, ay + Math.sin(angle - width) * rayLength);
      ctx.lineTo(ax + Math.cos(angle + width) * rayLength, ay + Math.sin(angle + width) * rayLength);
      ctx.closePath();
      ctx.fill();
    }

    // Floating sun/moon dust motes that drift along light beams
    this.renderRayDustMotes(ctx, ax, ay, rayColor, totalStrength, time);

    ctx.restore();
  }

  private renderRayDustMotes(
    ctx: CanvasRenderingContext2D,
    ax: number,
    ay: number,
    color: RGB,
    strength: number,
    time: number,
  ): void {
    const n = 28;
    for (let i = 0; i < n; i++) {
      const angle = 1.82 + hash(i, 801) * 1.1;
      const dist = 120 + hash(i, 802) * 650;
      const drift = Math.sin(time * 0.4 + i * 1.7) * 18;
      const mx = ax + Math.cos(angle) * dist + drift;
      const my = ay + Math.sin(angle) * dist + (time * 14 + i * 45) % 300;
      const twinkle = 0.3 + 0.7 * Math.sin(time * 2.2 + i * 3.1);
      const sz = 1.2 + hash(i, 803) * 1.8;
      ctx.fillStyle = rgb(color, 0.18 * strength * twinkle);
      ctx.beginPath();
      ctx.arc(mx, my, sz, 0, TAU);
      ctx.fill();
    }
  }

  /* ---------------- ground & decor ---------------- */

  renderGroundFill(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    gy: number,
    scroll = 0,
    time = 0,
  ): void {
    const p = this.pal;
    const depth = h - gy;

    // 1. Stratified organic earth gradient: top loam -> deep subsoil -> bedrock
    const soilGrad = ctx.createLinearGradient(0, gy, 0, h);
    soilGrad.addColorStop(0, rgb(p.ground));
    soilGrad.addColorStop(0.18, rgb(mix(p.ground, [24, 18, 14], 0.45)));
    soilGrad.addColorStop(0.65, rgb(mix(p.ground, [8, 10, 14], 0.75)));
    soilGrad.addColorStop(1, rgb([4, 6, 10]));
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, gy, w, depth);

    // 2. Reflective glassy water puddle patches along the forest trail
    this.renderPuddles(ctx, w, gy, scroll, time);

    // 3. Dynamic surface rim glow (peaks under sun/moon horizontal position)
    const sunXpx = p.sunX * w;
    const sheen = ctx.createLinearGradient(0, gy - 1, 0, gy + 32);
    sheen.addColorStop(0, rgb(p.rim, 0.32));
    sheen.addColorStop(0.35, rgb(p.rim, 0.09));
    sheen.addColorStop(1, rgb(p.rim, 0));
    ctx.fillStyle = sheen;
    ctx.fillRect(0, gy - 1, w, 33);

    // Celestial directional rim light highlight directly beneath sun/moon
    const celRim = ctx.createRadialGradient(sunXpx, gy, 2, sunXpx, gy, w * 0.45);
    celRim.addColorStop(0, rgb(p.rim, 0.35));
    celRim.addColorStop(0.5, rgb(p.rim, 0.1));
    celRim.addColorStop(1, rgb(p.rim, 0));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = celRim;
    ctx.fillRect(0, gy - 1, w, 24);
    ctx.restore();

    // Sharp top turf contact line
    ctx.fillStyle = rgb(p.rim, 0.42);
    ctx.fillRect(0, gy - 0.5, w, 1.2);
  }

  /** Glassy water puddles reflecting the sky and silhouetted forest canopy */
  private renderPuddles(
    ctx: CanvasRenderingContext2D,
    w: number,
    gy: number,
    scroll: number,
    time: number,
  ): void {
    const p = this.pal;
    const puddleStep = 580;
    const p0 = Math.floor(scroll / puddleStep) - 1;
    const pn = Math.ceil(w / puddleStep) + 2;

    for (let k = 0; k < pn; k++) {
      const idx = p0 + k;
      const hval = hash(idx, 901);
      if (hval < 0.32) continue; // some segments have no puddles

      const px = idx * puddleStep - scroll + hash(idx, 902) * 220;
      const pw = 48 + hash(idx, 903) * 75;
      const ph = 5.5 + hash(idx, 904) * 4.5;
      const py = gy + 1.2 + hash(idx, 905) * 3;

      if (px + pw < -50 || px - pw > w + 50) continue;

      // Dark wet mud depression basin
      ctx.fillStyle = "rgba(4, 5, 8, 0.65)";
      ctx.beginPath();
      ctx.ellipse(px, py, pw * 0.54, ph * 1.3, 0, 0, TAU);
      ctx.fill();

      // Mirror reflection gradient of the sky colors
      const waterGrad = ctx.createLinearGradient(px, py - ph, px, py + ph);
      waterGrad.addColorStop(0, rgb(mix(p.skyLow, [255, 255, 255], 0.2), 0.55));
      waterGrad.addColorStop(0.5, rgb(p.skyTop, 0.45));
      waterGrad.addColorStop(1, rgb(p.ground, 0.8));

      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.ellipse(px, py, pw * 0.48, ph, 0, 0, TAU);
      ctx.fill();

      // Subtle water ripple ring
      const ripplePhase = (time * 1.8 + hash(idx, 906) * 10) % 1;
      const rippleR = pw * 0.45 * ripplePhase;
      const rippleAlpha = (1 - ripplePhase) * 0.28;
      ctx.strokeStyle = rgb(p.rim, rippleAlpha);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(px, py, rippleR, ph * ripplePhase, 0, 0, TAU);
      ctx.stroke();

      // Specular glint on puddle edge
      ctx.fillStyle = rgb(p.rim, 0.5);
      ctx.beginPath();
      ctx.arc(px - pw * 0.32, py - ph * 0.35, 1.2, 0, TAU);
      ctx.fill();
    }
  }

  /** grass, tufts, stones, glow-shrooms — drawn with real-time runner contact deflection & trailing elastic wake */
  renderFlora(
    ctx: CanvasRenderingContext2D,
    w: number,
    gy: number,
    scroll: number,
    time: number,
    playerX = 0,
    playerPy = 0,
    playerGrounded = true,
    playerSliding = false,
    speed = 360,
    playerVy = 0
  ): void {
    const blade = mix(this.pal.ground, [255, 255, 255], 0.09);
    const tuft = mix(this.pal.ground, [255, 255, 255], 0.15);

    const isNearGround = playerGrounded || playerPy < 26;
    const forwardSpeedScale = clamp(speed / 360, 0.65, 2.0);
    const contactMin = playerSliding ? -45 : -32;
    const contactMax = playerSliding ? 68 : 42;

    // dense fine grass — one batched path
    ctx.fillStyle = rgb(blade);
    ctx.beginPath();
    const step = 13;
    const i0 = Math.floor(scroll / step) - 1;
    const n = Math.ceil(w / step) + 3;
    for (let k = 0; k < n; k++) {
      const i = i0 + k;
      const sx = i * step - scroll + hash(i, 91) * 8;
      let hh = 7 + hash(i, 92) * 18;
      let lean = (hash(i, 93) - 0.5) * 6 + Math.sin(time * 1.3 + i * 0.35) * 2.4;

      // Real-Time Contact Displacement & Trailing Elastic Spring Wave
      const dx = sx - playerX;
      if (isNearGround) {
        if (dx >= contactMin && dx <= contactMax) {
          // Direct footfall & body trampling: swept strongly forward in travel direction
          const normX = dx > 0 ? 1 - dx / contactMax : 1 - Math.abs(dx / contactMin);
          const pushAmt = (playerSliding ? 20 : 9.5) * forwardSpeedScale * normX;
          lean += pushAmt;
          // Vertical crushing underfoot
          const crush = 1 - normX * (playerSliding ? 0.72 : 0.54);
          hh *= Math.max(0.26, crush);
        } else if (dx < contactMin && dx >= contactMin - 110) {
          // Trailing elastic wake: blades rebound and spring back with damped harmonic oscillation
          const distBehind = contactMin - dx;
          const decay = Math.exp(-distBehind / 42);
          const wakeFreq = 16 * forwardSpeedScale;
          const wakeSpring = Math.sin(distBehind * 0.14 - time * wakeFreq) * decay;
          lean += wakeSpring * (playerSliding ? 15 : 8.5);
        }
      } else if (playerPy < 120) {
        // Airborne low pass / downwash turbulence: air displacement billows outward
        const airDist = Math.abs(dx);
        if (airDist < 90) {
          const downwashScale = (1 - playerPy / 120) * (1 - airDist / 90);
          const downwashDir = dx >= 0 ? 1 : -1;
          lean += downwashDir * downwashScale * 6.0;
        }
      }

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
      const dx = bx - playerX;

      let tuftPush = 0;
      let tuftCrush = 1.0;
      if (isNearGround) {
        if (dx >= contactMin && dx <= contactMax) {
          const normX = dx > 0 ? 1 - dx / contactMax : 1 - Math.abs(dx / contactMin);
          tuftPush = (playerSliding ? 26 : 13.5) * forwardSpeedScale * normX;
          tuftCrush = Math.max(0.32, 1 - normX * (playerSliding ? 0.68 : 0.48));
        } else if (dx < contactMin && dx >= contactMin - 120) {
          const distBehind = contactMin - dx;
          const decay = Math.exp(-distBehind / 46);
          const wakeFreq = 15 * forwardSpeedScale;
          tuftPush = Math.sin(distBehind * 0.13 - time * wakeFreq) * decay * (playerSliding ? 18 : 10.5);
        }
      } else if (playerPy < 130) {
        const airDist = Math.abs(dx);
        if (airDist < 95) {
          const downwashScale = (1 - playerPy / 130) * (1 - airDist / 95);
          tuftPush = (dx >= 0 ? 1 : -1) * downwashScale * 7.5;
        }
      }

      for (let b = 0; b < blades; b++) {
        const hh = (22 + hash(i * 7 + b, 97) * 26) * tuftCrush;
        const lean = (b - blades / 2) * 7 + Math.sin(time * 1.1 + i) * 2.6 + tuftPush;
        ctx.moveTo(bx - 2, gy + 2);
        ctx.lineTo(bx + lean, gy - hh);
        ctx.lineTo(bx + 2, gy + 2);
      }
    }
    ctx.fill();

    // Dewdrop specular sparkles on tall grass blades (glint and shimmer dynamically with grass displacement)
    ctx.fillStyle = rgb(this.pal.rim, 0.65);
    for (let k = 0; k < tn; k++) {
      const i = t0 + k;
      if (hash(i, 94) < 0.3) continue;
      const bx = i * tStep - scroll + hash(i, 95) * 50;
      const blades = 3 + ((hash(i, 96) * 3) | 0);
      const dx = bx - playerX;

      let tuftPush = 0;
      let tuftCrush = 1.0;
      if (isNearGround) {
        if (dx >= contactMin && dx <= contactMax) {
          const normX = dx > 0 ? 1 - dx / contactMax : 1 - Math.abs(dx / contactMin);
          tuftPush = (playerSliding ? 26 : 13.5) * forwardSpeedScale * normX;
          tuftCrush = Math.max(0.32, 1 - normX * (playerSliding ? 0.68 : 0.48));
        } else if (dx < contactMin && dx >= contactMin - 120) {
          const distBehind = contactMin - dx;
          const decay = Math.exp(-distBehind / 46);
          const wakeFreq = 15 * forwardSpeedScale;
          tuftPush = Math.sin(distBehind * 0.13 - time * wakeFreq) * decay * (playerSliding ? 18 : 10.5);
        }
      } else if (playerPy < 130) {
        const airDist = Math.abs(dx);
        if (airDist < 95) {
          const downwashScale = (1 - playerPy / 130) * (1 - airDist / 95);
          tuftPush = (dx >= 0 ? 1 : -1) * downwashScale * 7.5;
        }
      }

      for (let b = 0; b < blades; b++) {
        if (hash(i * 11 + b, 991) > 0.55) {
          const hh = (22 + hash(i * 7 + b, 97) * 26) * tuftCrush;
          const lean = (b - blades / 2) * 7 + Math.sin(time * 1.1 + i) * 2.6 + tuftPush;
          const dewSparkle = Math.abs(tuftPush) > 2 ? 1.6 : 1.2;
          ctx.beginPath();
          ctx.arc(bx + lean, gy - hh, dewSparkle, 0, TAU);
          ctx.fill();
        }
      }
    }

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

        // Soft bioluminescent glow aura around mushroom cap
        if (this.pal.night > 0.05) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const mshGlow = ctx.createRadialGradient(sx, gy - mh, 1, sx, gy - mh, 16);
          mshGlow.addColorStop(0, rgb(this.pal.accent, 0.35 * this.pal.night));
          mshGlow.addColorStop(1, rgb(this.pal.accent, 0));
          ctx.fillStyle = mshGlow;
          ctx.beginPath();
          ctx.arc(sx, gy - mh, 16, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  /* ---------------- obstacles with 3D depth & shading ---------------- */

  renderObstacle(
    ctx: CanvasRenderingContext2D, ob: Obstacle, gy: number, time: number,
  ): void {
    const p = this.pal;
    const x = ob.x;

    // Contact drop shadow (double layered soft ambient occlusion)
    if (ob.kind !== "vine") {
      // Soft outer shadow
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      ctx.beginPath();
      ctx.ellipse(x, gy + 4, ob.w * 0.68, 8, 0, 0, TAU);
      ctx.fill();
      // Tight inner dark contact occluder
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.ellipse(x, gy + 2, ob.w * 0.48, 3.8, 0, 0, TAU);
      ctx.fill();
    }

    switch (ob.kind) {
      case "rock":
      case "boulder": {
        const v = ob.verts ?? [-ob.w / 2, 0, 0, -ob.h, ob.w / 2, 0];
        
        // 3D rock volumetric gradient shading
        const rockGrad = ctx.createLinearGradient(x - ob.w * 0.35, gy - ob.h, x + ob.w * 0.4, gy);
        const litRock = mix(p.ground, p.rim, 0.28);
        const midRock = mix(p.ground, [45, 52, 58], 0.35);
        const shadowRock = mix(p.ground, [5, 6, 8], 0.6);
        rockGrad.addColorStop(0, rgb(litRock));
        rockGrad.addColorStop(0.35, rgb(midRock));
        rockGrad.addColorStop(1, rgb(shadowRock));

        ctx.fillStyle = rockGrad;
        ctx.beginPath();
        ctx.moveTo(x + v[0], gy + v[1]);
        for (let i = 2; i < v.length; i += 2) ctx.lineTo(x + v[i], gy + v[i + 1]);
        ctx.closePath();
        ctx.fill();

        // Top faceted highlight rim
        ctx.strokeStyle = rgb(p.rim, 0.32);
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x + v[0], gy + v[1]);
        for (let i = 2; i < v.length; i += 2) {
          if (v[i + 1] < -ob.h * 0.25) {
            ctx.lineTo(x + v[i], gy + v[i + 1]);
          }
        }
        ctx.stroke();

        // Weathered cracks with specular light and dark shadow edges
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - ob.w * 0.15, gy - ob.h * 0.76);
        ctx.lineTo(x + ob.w * 0.04, gy - ob.h * 0.38);
        ctx.lineTo(x - ob.w * 0.03, gy - ob.h * 0.12);
        ctx.stroke();

        ctx.strokeStyle = rgb(p.rim, 0.22);
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(x - ob.w * 0.15 + 1, gy - ob.h * 0.76);
        ctx.lineTo(x + ob.w * 0.04 + 1, gy - ob.h * 0.38);
        ctx.stroke();

        // Forest lichen / moss stipples on upper facets
        const mossColor = rgb(mix(p.ground, [85, 130, 75], 0.4), 0.7);
        ctx.fillStyle = mossColor;
        for (let m = 0; m < 5; m++) {
          const mx = x + (hash(ob.seed + m, 301) - 0.5) * ob.w * 0.55;
          const my = gy - ob.h * (0.65 + hash(ob.seed + m, 302) * 0.25);
          ctx.beginPath();
          ctx.ellipse(mx, my, 2.5 + hash(ob.seed + m, 303) * 3, 1.8, 0, 0, TAU);
          ctx.fill();
        }
        break;
      }

      case "log": {
        const hw = ob.w / 2;
        const hh = ob.h / 2;
        
        // 3D cylindrical bark gradient
        const logGrad = ctx.createLinearGradient(x, gy - ob.h, x, gy);
        const topBark = mix(p.ground, p.rim, 0.25);
        const midBark = mix(p.ground, [65, 42, 28], 0.3);
        const underBark = mix(p.ground, [4, 4, 6], 0.7);
        logGrad.addColorStop(0, rgb(topBark));
        logGrad.addColorStop(0.3, rgb(midBark));
        logGrad.addColorStop(1, rgb(underBark));

        ctx.fillStyle = logGrad;
        ctx.beginPath();
        ctx.roundRect(x - hw, gy - ob.h, ob.w, ob.h, hh);
        ctx.fill();

        // Bark striation fissures
        ctx.strokeStyle = "rgba(0,0,0,0.45)";
        ctx.lineWidth = 1.2;
        for (let s = 0; s < 4; s++) {
          const lx = x - hw * 0.75 + hash(ob.seed + s, 310) * ob.w * 0.65;
          const ly = gy - ob.h + 3 + hash(ob.seed + s, 311) * (ob.h - 8);
          ctx.beginPath();
          ctx.moveTo(lx, ly);
          ctx.lineTo(lx + 14 + hash(ob.seed + s, 312) * 16, ly + (hash(ob.seed + s, 313) - 0.5) * 2);
          ctx.stroke();
        }

        // Top specular ridge highlight
        ctx.strokeStyle = rgb(p.rim, 0.32);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - hw + 8, gy - ob.h + 1.2);
        ctx.lineTo(x + hw - 12, gy - ob.h + 1.2);
        ctx.stroke();

        // End grain cross-section concentric rings
        const endX = x + hw - 3.5;
        const endY = gy - hh;
        ctx.fillStyle = rgb(mix(p.ground, p.rim, 0.18));
        ctx.beginPath();
        ctx.ellipse(endX, endY, 4.2, hh * 0.88, 0, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = rgb(p.rim, 0.38);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(endX, endY, 4.2, hh * 0.88, 0, 0, TAU);
        ctx.stroke();

        // Inner growth ring
        ctx.strokeStyle = rgb(p.rim, 0.24);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.ellipse(endX, endY, 2.2, hh * 0.48, 0, 0, TAU);
        ctx.stroke();

        // Branch stubs with 3D cone look
        for (let s = 0; s < 2; s++) {
          const sx = x - hw * 0.5 + hash(ob.seed + s, 111) * ob.w * 0.8;
          const sl = 8 + hash(ob.seed + s, 112) * 10;
          ctx.fillStyle = rgb(midBark);
          ctx.beginPath();
          ctx.moveTo(sx - 3.6, gy - ob.h + 2);
          ctx.lineTo(sx, gy - ob.h - sl);
          ctx.lineTo(sx + 3.6, gy - ob.h + 2);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = rgb(p.rim, 0.28);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx - 3.6, gy - ob.h + 2);
          ctx.lineTo(sx, gy - ob.h - sl);
          ctx.stroke();
        }
        break;
      }

      case "bramble": {
        // Deep background thorns
        ctx.strokeStyle = rgb(mix(p.ground, [0, 0, 0], 0.5));
        ctx.lineWidth = 3.6;
        for (let s = 0; s < 3; s++) {
          const sx = x - ob.w / 2 + hash(ob.seed + s + 10, 114) * ob.w;
          ctx.beginPath();
          ctx.moveTo(sx, gy);
          ctx.quadraticCurveTo(
            sx + (hash(ob.seed + s + 10, 115) - 0.5) * 35,
            gy - ob.h * 1.15,
            sx + (hash(ob.seed + s + 10, 116) - 0.5) * 50,
            gy - ob.h * (0.95 + hash(ob.seed + s + 10, 117) * 0.4),
          );
          ctx.stroke();
        }

        // Foreground jagged thorn brush
        const brambleGrad = ctx.createLinearGradient(x, gy - ob.h, x, gy);
        brambleGrad.addColorStop(0, rgb(mix(p.ground, p.rim, 0.3)));
        brambleGrad.addColorStop(1, rgb(p.ground));
        ctx.fillStyle = brambleGrad;

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

        // Foreground arcing briar branches with sharp thorns
        ctx.strokeStyle = rgb(mix(p.ground, [50, 25, 20], 0.3));
        ctx.lineWidth = 2.6;
        for (let s = 0; s < 4; s++) {
          const sx = x - ob.w / 2 + hash(ob.seed + s, 114) * ob.w;
          const endX = sx + (hash(ob.seed + s, 116) - 0.5) * 46;
          const endY = gy - ob.h * (0.9 + hash(ob.seed + s, 117) * 0.4);
          ctx.beginPath();
          ctx.moveTo(sx, gy);
          ctx.quadraticCurveTo(
            sx + (hash(ob.seed + s, 115) - 0.5) * 30,
            gy - ob.h * 1.1,
            endX,
            endY,
          );
          ctx.stroke();

          // Sharp thorn tip specular spark
          ctx.fillStyle = rgb(p.rim, 0.4);
          ctx.beginPath();
          ctx.arc(endX, endY, 1.4, 0, TAU);
          ctx.fill();
        }
        break;
      }

      case "stump": {
        const hw = ob.w / 2;
        
        // 3D cylindrical trunk shading with root flaring
        const stumpGrad = ctx.createLinearGradient(x - hw, gy - ob.h, x + hw, gy);
        stumpGrad.addColorStop(0, rgb(mix(p.ground, p.rim, 0.22)));
        stumpGrad.addColorStop(0.5, rgb(mix(p.ground, [60, 45, 30], 0.25)));
        stumpGrad.addColorStop(1, rgb(mix(p.ground, [8, 8, 12], 0.55)));

        ctx.fillStyle = stumpGrad;
        ctx.beginPath();
        ctx.moveTo(x - hw * 1.18, gy);
        ctx.quadraticCurveTo(x - hw * 0.95, gy - ob.h * 0.3, x - hw * 0.86, gy - ob.h);
        ctx.quadraticCurveTo(x, gy - ob.h - 5, x + hw * 0.86, gy - ob.h);
        ctx.quadraticCurveTo(x + hw * 0.95, gy - ob.h * 0.3, x + hw * 1.18, gy);
        ctx.closePath();
        ctx.fill();

        // Top cut face with concentric tree rings
        ctx.fillStyle = rgb(mix(p.ground, p.rim, 0.2));
        ctx.beginPath();
        ctx.ellipse(x, gy - ob.h + 1, hw * 0.8, 3.8, 0, 0, TAU);
        ctx.fill();

        ctx.strokeStyle = rgb(p.rim, 0.35);
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(x, gy - ob.h + 1, hw * 0.8, 3.8, 0, 0, TAU);
        ctx.stroke();

        // Inner tree growth ring
        ctx.strokeStyle = rgb(p.rim, 0.2);
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(x, gy - ob.h + 1, hw * 0.45, 2.2, 0, 0, TAU);
        ctx.stroke();

        // Vertical bark ridges
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 1.2;
        for (let r = 0; r < 3; r++) {
          const rx = x - hw * 0.45 + r * hw * 0.45;
          ctx.beginPath();
          ctx.moveTo(rx, gy - ob.h + 4);
          ctx.lineTo(rx + (hash(ob.seed + r, 320) - 0.5) * 4, gy - 2);
          ctx.stroke();
        }
        break;
      }

      case "vine": {
        // Hanging thorn vine with realistic twist & sway
        const top = gy - 320 - hash(ob.seed, 118) * 140;
        const botY = gy - ob.h;
        const sway = Math.sin(time * 0.9 + ob.seed) * 7;
        
        // Darker shadow vine spine
        ctx.strokeStyle = rgb(mix(p.ground, [0, 0, 0], 0.6));
        ctx.lineCap = "round";
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + sway * 1.6, (top + botY) / 2, x + sway, botY + 8);
        ctx.quadraticCurveTo(x + sway - 2, botY + 4, x + sway - 4, botY);
        ctx.stroke();

        // Lit vine core
        ctx.strokeStyle = rgb(mix(p.ground, p.rim, 0.18));
        ctx.lineWidth = 5.2;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x + sway * 1.6, (top + botY) / 2, x + sway, botY + 8);
        ctx.stroke();

        // Specular highlight fiber
        ctx.strokeStyle = rgb(p.rim, 0.25);
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x + 1, top);
        ctx.quadraticCurveTo(x + sway * 1.6 + 1, (top + botY) / 2, x + sway + 1, botY + 8);
        ctx.stroke();

        // Realistic veined foliage hanging along the vine
        for (let l = 0; l < 6; l++) {
          const fr = (l + 1) / 7;
          const ly = top + (botY - top) * fr;
          const lx = x + sway * fr * 1.4 + (hash(ob.seed + l, 119) - 0.5) * 14;
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(hash(ob.seed + l, 120) * TAU + Math.sin(time * 1.4 + l) * 0.15);
          
          ctx.fillStyle = rgb(mix(p.ground, [35, 75, 45], 0.35));
          ctx.beginPath();
          ctx.ellipse(0, 0, 8 + hash(ob.seed + l, 121) * 5, 3.8, 0, 0, TAU);
          ctx.fill();

          ctx.strokeStyle = rgb(p.rim, 0.24);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-6, 0);
          ctx.lineTo(6, 0);
          ctx.stroke();

          ctx.restore();
        }

        // Dangerous sharp thorn cluster at bottom (clearance zone)
        ctx.strokeStyle = rgb(mix(p.ground, p.rim, 0.4));
        ctx.lineWidth = 3.2;
        for (let tth = 0; tth < 4; tth++) {
          const dir = (hash(ob.seed + tth, 122) - 0.5) * 2;
          const tipX = x + sway + dir * 10;
          const tipY = botY + 2 + hash(ob.seed + tth, 123) * 9;
          ctx.beginPath();
          ctx.moveTo(x + sway, botY + 10);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          // Specular tip glint
          ctx.fillStyle = rgb(p.rim, 0.65);
          ctx.beginPath();
          ctx.arc(tipX, tipY, 1.2, 0, TAU);
          ctx.fill();
        }
        break;
      }
    }
  }

  /* ---------------- pickups ---------------- */

  renderFly(ctx: CanvasRenderingContext2D, f: Fly, time: number, gy = 0): void {
    const y = f.baseY + Math.sin(time * 2.1 + f.phase) * 9;
    f.y = y;
    const pulse = 0.75 + Math.sin(time * 3.2 + f.phase) * 0.25;
    const glow = this.glowSprites[this.glowIdx];
    const s = 34 * pulse * (0.8 + this.pal.night * 0.4);

    // 1. Soft downward light cast on ground when near forest floor
    if (gy > 0 && Math.abs(y - gy) < 85) {
      const distToGround = Math.max(10, Math.abs(y - gy));
      const castAlpha = (1 - distToGround / 85) * 0.28 * pulse;
      const castW = 28 + (1 - distToGround / 85) * 22;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const groundGlow = ctx.createRadialGradient(f.x, gy, 1, f.x, gy, castW);
      groundGlow.addColorStop(0, rgb(this.pal.accent, castAlpha));
      groundGlow.addColorStop(1, rgb(this.pal.accent, 0));
      ctx.fillStyle = groundGlow;
      ctx.beginPath();
      ctx.ellipse(f.x, gy, castW, 6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 2. Additive outer celestial halo
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow, f.x - s / 2, y - s / 2, s, s);

    // 3. Secondary tight inner corona
    const innerS = s * 0.45;
    ctx.drawImage(this.softDot, f.x - innerS / 2, y - innerS / 2, innerS, innerS);

    // 4. Brilliant hot plasma core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(f.x, y, 1.4, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  renderBloom(ctx: CanvasRenderingContext2D, b: { x: number; y: number; phase: number }, time: number, gy = 0): void {
    const p = this.pal;
    const pulse = 0.85 + Math.sin(time * 2.4 + b.phase) * 0.15;
    const by = b.y + Math.sin(time * 1.6 + b.phase) * 10;

    // 1. Ground illumination circle underneath the bloom
    if (gy > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const groundBeam = ctx.createRadialGradient(b.x, gy, 4, b.x, gy, 70);
      groundBeam.addColorStop(0, rgb(p.accent, 0.45 * pulse));
      groundBeam.addColorStop(0.5, rgb(p.accent, 0.18 * pulse));
      groundBeam.addColorStop(1, rgb(p.accent, 0));
      ctx.fillStyle = groundBeam;
      ctx.beginPath();
      ctx.ellipse(b.x, gy, 70, 14, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 2. Vertical sacred spirit pillar beam
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const beamGrad = ctx.createLinearGradient(b.x, by - 120, b.x, by + 40);
    beamGrad.addColorStop(0, rgb(p.accent, 0));
    beamGrad.addColorStop(0.5, rgb(p.accent, 0.22 * pulse));
    beamGrad.addColorStop(1, rgb(p.accent, 0));
    ctx.fillStyle = beamGrad;
    ctx.fillRect(b.x - 14, by - 120, 28, 160);

    // 3. Expanding ethereal spirit pulse rings
    const ringCycle = (time * 0.8 + b.phase) % 1;
    const ringR = 25 + ringCycle * 55;
    const ringA = (1 - ringCycle) * 0.35;
    ctx.strokeStyle = rgb(p.accent, ringA);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, by, ringR, 0, TAU);
    ctx.stroke();

    // 4. Outer radiant corona
    const glow = this.glowSprites[(this.glowIdx + 2) % NPAL];
    const s = 110 * pulse;
    ctx.drawImage(glow, b.x - s / 2, by - s / 2, s, s);

    // 5. Rotating sacred spirit petals
    ctx.save();
    ctx.translate(b.x, by);
    ctx.rotate(time * 0.65);
    ctx.fillStyle = rgb(p.rim, 0.92);
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i / 6) * TAU);
      ctx.beginPath();
      ctx.ellipse(0, -10 * pulse, 5.2 * pulse, 9.8 * pulse, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Brilliant starburst core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 4.2 * pulse, 0, TAU);
    ctx.fill();
    ctx.restore();

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
      ctx.globalAlpha = (0.12 + tw * 0.24) * (0.6 + this.pal.night * 0.7);
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
