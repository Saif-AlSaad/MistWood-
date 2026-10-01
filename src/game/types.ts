/* Shared types + math helpers for the Mistwood engine */

export type RGB = [number, number, number];

export interface Palette {
  skyTop: RGB;
  skyLow: RGB;
  fog: RGB;
  sun: RGB;
  sunX: number;
  sunY: number;
  accent: RGB;
  ray: RGB;
  treeFar: RGB;
  treeMid: RGB;
  ground: RGB;
  rim: RGB;
  mote: RGB;
  night: number;
}

export interface Stats {
  dist: number;
  flies: number;
  best: number;
  newBest: boolean;
  nearMisses: number;
}

export interface HUDData {
  dist: number;
  flies: number;
  speed: number;
  ghostT: number;
  biomeName: string;
  biomeNext: string;
  biomeProgress: number;
  nearMissCount: number;
}

export type GameState =
  | "loading"
  | "menu"
  | "playing"
  | "dying"
  | "paused"
  | "over";

export type ObstacleKind =
  | "rock"
  | "boulder"
  | "log"
  | "bramble"
  | "stump"
  | "vine";

export interface Obstacle {
  kind: ObstacleKind;
  /** world-space x (scroll subtracted at render) */
  x: number;
  w: number;
  h: number;
  seed: number;
  /** precomputed polygon points for rocks (rel to base center) */
  verts?: number[];
  nearMissed?: boolean;
}

export interface Fly {
  x: number;
  y: number;
  baseY: number;
  phase: number;
  got: boolean;
}

export interface Bloom {
  x: number;
  y: number;
  phase: number;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number): number =>
  v < a ? a : v > b ? b : v;

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const rgb = (c: RGB, a = 1): string =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

export const hex = (s: string): RGB => [
  parseInt(s.slice(1, 3), 16),
  parseInt(s.slice(3, 5), 16),
  parseInt(s.slice(5, 7), 16),
];

export const rand = (a = 1, b?: number): number =>
  b === undefined ? Math.random() * a : a + Math.random() * (b - a);

export const pick = <T,>(arr: readonly T[]): T =>
  arr[(Math.random() * arr.length) | 0];

/** deterministic hash → [0,1) */
export const hash = (i: number, s = 0): number => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const smooth = (t: number): number => t * t * (3 - 2 * t);
