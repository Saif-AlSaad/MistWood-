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

export type FoxPeltId = "ember" | "silver" | "spirit" | "autumn" | "shadow";

export type FoxRarity = "common" | "rare" | "epic" | "legendary" | "celestial";

export interface FoxPelt {
  id: FoxPeltId;
  name: string;
  title: string;
  cost: number;
  bodyColor: string;
  accentColor: string;
  eyeColor: string;
  trailColor: string;
  description: string;
  perk: string;
  rarity: FoxRarity;
}

export const FOX_PELTS: Record<FoxPeltId, FoxPelt> = {
  ember: {
    id: "ember",
    name: "Ember Fox",
    title: "The Wild Wanderer",
    cost: 0,
    bodyColor: "#1d120a",
    accentColor: "#ffd27a",
    eyeColor: "#ffe9bb",
    trailColor: "#ff9f43",
    description: "The classic forest guardian with an untamed spirit and fiery footsteps.",
    perk: "Standard stride & fiery ember sparks",
    rarity: "common",
  },
  silver: {
    id: "silver",
    name: "Silver Moon",
    title: "Child of Moonlight",
    cost: 35,
    bodyColor: "#101624",
    accentColor: "#93c5fd",
    eyeColor: "#e0f2fe",
    trailColor: "#67e8f9",
    description: "Forged under winter constellations. Its steps whisper like frost upon the moss.",
    perk: "Moonlit crystalline trail & cool shimmer",
    rarity: "rare",
  },
  spirit: {
    id: "spirit",
    name: "Spirit Wisp",
    title: "The Celestial Ghost",
    cost: 80,
    bodyColor: "#081d1c",
    accentColor: "#5eead4",
    eyeColor: "#ccfbf1",
    trailColor: "#2dd4bf",
    description: "A translucent apparition that flickers between dream and the waking woods.",
    perk: "Ethereal translucent body & celestial motes",
    rarity: "celestial",
  },
  autumn: {
    id: "autumn",
    name: "Autumn Bramble",
    title: "Keeper of the Grove",
    cost: 150,
    bodyColor: "#241306",
    accentColor: "#fbbf24",
    eyeColor: "#fef3c7",
    trailColor: "#f59e0b",
    description: "Cloaked in golden leaves and rich loam, smelling of ancient cedar trees.",
    perk: "Golden sunburst sparks & autumn aura",
    rarity: "epic",
  },
  shadow: {
    id: "shadow",
    name: "Obsidian Void",
    title: "Shadow of the Pines",
    cost: 250,
    bodyColor: "#0d0918",
    accentColor: "#c084fc",
    eyeColor: "#f3e8ff",
    trailColor: "#a855f7",
    description: "Born from the deepest hollows where starlight bends into silence.",
    perk: "Deep void violet silhouette & phantom sparks",
    rarity: "legendary",
  },
};

export interface Stats {
  dist: number;
  flies: number;
  best: number;
  newBest: boolean;
  nearMisses: number;
  maxSpeed: number;
  maxSpeedKmh: number;
  biomeName: string;
  totalFlies: number;
}

export interface HUDData {
  dist: number;
  flies: number;
  speed: number;
  speedKmh: number;
  maxSpeed: number;
  maxSpeedKmh: number;
  ghostT: number;
  biomeName: string;
  biomeNext: string;
  biomeProgress: number;
  nearMissCount: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  reducedMotion: boolean;
  particleIntensity: "high" | "low";
  speedEffects: boolean;
  haptics?: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.85,
  sfxVolume: 0.85,
  musicVolume: 0.75,
  screenShake: true,
  reducedMotion: false,
  particleIntensity: "high",
  speedEffects: true,
  haptics: true,
};

export const SETTINGS_STORAGE_KEY = "mistwood_settings";

/** Converts px/s engine speed into cinematic racing km/h */
export const speedToKmh = (pxPerSec: number): number => {
  return Math.round(pxPerSec * 0.32);
};

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
