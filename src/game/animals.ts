/* MistWood Animal Definitions, Physics Profiles, and Progression System */

export type AnimalId = "fox" | "moon_fox" | "deer" | "panda" | "lion";

export type AnimalRarity = "common" | "rare" | "epic" | "legendary" | "celestial";

export interface AnimalPhysicsProfile {
  /** Mass in kg (influences momentum, squash depth, landing camera shake) */
  mass: number;
  /** Acceleration multiplier (1.0 is baseline) */
  acceleration: number;
  /** Max running speed multiplier (1.0 is baseline 340-820 px/s) */
  maxSpeedMultiplier: number;
  /** Deceleration / braking responsiveness */
  deceleration: number;
  /** Jump vertical impulse px/s */
  jumpForce: number;
  /** Double-jump vertical impulse px/s */
  doubleJumpForce: number;
  /** Gravity multiplier applied to standard gravity (2100 px/s^2) */
  gravityMultiplier: number;
  /** Turning / banking responsiveness (degrees/s or lerp rate) */
  turnResponsiveness: number;
  /** Mid-air horizontal & pitch control factor */
  airControl: number;
  /** Ground friction / slide distance factor */
  groundFriction: number;
  /** Ground stride length in px per full quadruped cycle */
  strideLength: number;
  /** Standing visual/hitbox height in px */
  bodyHeight: number;
  /** Hitbox horizontal half-width in px */
  hitboxHalfWidth: number;
  /** Hitbox vertical height in px */
  hitboxHeight: number;
  /** Hitbox slide height in px */
  slideHeight: number;
  /** Visual squash compression factor on landing (0.1 to 0.4) */
  landingSquash: number;
  /** Recovery spring speed from squash */
  landingRecovery: number;
  /** Screen shake intensity produced when landing (0 = none, 3 = heavy) */
  landingShake: number;
}

export interface AnimalStats {
  speed: number;    // 1 - 10
  agility: number;  // 1 - 10
  jump: number;     // 1 - 10
  power: number;    // 1 - 10 (or weight)
}

export interface AnimalVisualColors {
  body: string;
  underbelly: string;
  accent: string;
  eyes: string;
  trail: string;
  secondary?: string;
  mane?: string;
  antlers?: string;
  glow?: string;
}

export interface AnimalDefinition {
  id: AnimalId;
  name: string;
  title: string;
  order: number;
  cost: number;
  rarity: AnimalRarity;
  description: string;
  perk: string;
  stats: AnimalStats;
  physics: AnimalPhysicsProfile;
  colors: AnimalVisualColors;
  cameraOffset: {
    y: number;
    distance: number;
    scale: number;
  };
}

export const ANIMALS: Record<AnimalId, AnimalDefinition> = {
  fox: {
    id: "fox",
    name: "Red Fox",
    title: "The Wild Wanderer",
    order: 1,
    cost: 0,
    rarity: "common",
    description: "The classic forest guardian. Lightweight, remarkably agile, and quick to react to sudden obstacles with natural reflexes.",
    perk: "High agility, instant acceleration & light-footed recovery",
    stats: {
      speed: 8,
      agility: 9,
      jump: 7,
      power: 4,
    },
    physics: {
      mass: 14,
      acceleration: 1.15,
      maxSpeedMultiplier: 1.0,
      deceleration: 1.2,
      jumpForce: 720,
      doubleJumpForce: 620,
      gravityMultiplier: 1.0,
      turnResponsiveness: 9.5,
      airControl: 1.1,
      groundFriction: 1.0,
      strideLength: 110,
      bodyHeight: 48,
      hitboxHalfWidth: 20,
      hitboxHeight: 50,
      slideHeight: 26,
      landingSquash: 0.22,
      landingRecovery: 6.0,
      landingShake: 1.0,
    },
    colors: {
      body: "#c45418",
      underbelly: "#f6ede0",
      accent: "#ffd27a",
      eyes: "#ffe699",
      trail: "#ff9f43",
      secondary: "#231610", // dark paws & ear backs
    },
    cameraOffset: {
      y: 0.7,
      distance: 3.4,
      scale: 1.0,
    },
  },

  moon_fox: {
    id: "moon_fox",
    name: "Shiny Moon Fox",
    title: "Child of Winter Constellations",
    order: 2,
    cost: 45,
    rarity: "rare",
    description: "Forged under midnight constellations. Features darker night-themed fur with silver-blue highlights, subtle luminous markings, and celestial grace.",
    perk: "Celestial low-gravity stride & crystalline wisp aura",
    stats: {
      speed: 8,
      agility: 10,
      jump: 8,
      power: 5,
    },
    physics: {
      mass: 14,
      acceleration: 1.2,
      maxSpeedMultiplier: 1.02,
      deceleration: 1.25,
      jumpForce: 740,
      doubleJumpForce: 650,
      gravityMultiplier: 0.94, // floatier supernatural jump
      turnResponsiveness: 10.0,
      airControl: 1.2,
      groundFriction: 1.05,
      strideLength: 112,
      bodyHeight: 48,
      hitboxHalfWidth: 20,
      hitboxHeight: 50,
      slideHeight: 26,
      landingSquash: 0.18,
      landingRecovery: 6.5,
      landingShake: 0.8,
    },
    colors: {
      body: "#141c2c",
      underbelly: "#c8daf0",
      accent: "#7dd3fc",
      eyes: "#e0f2fe",
      trail: "#38bdf8",
      secondary: "#080c14",
      glow: "#38bdf8",
    },
    cameraOffset: {
      y: 0.7,
      distance: 3.4,
      scale: 1.0,
    },
  },

  deer: {
    id: "deer",
    name: "Forest Stag",
    title: "Crown of the Verdant Grove",
    order: 3,
    cost: 110,
    rarity: "epic",
    description: "A majestic stag with sculpted antlers, long slender limbs, and effortless leaping power that easily clears the tallest brambles.",
    perk: "Long galloping stride & soaring high leaps",
    stats: {
      speed: 9,
      agility: 7,
      jump: 9,
      power: 6,
    },
    physics: {
      mass: 85,
      acceleration: 1.0,
      maxSpeedMultiplier: 1.08,
      deceleration: 0.95,
      jumpForce: 785, // soaring leap
      doubleJumpForce: 640,
      gravityMultiplier: 1.02,
      turnResponsiveness: 7.2,
      airControl: 0.95,
      groundFriction: 0.95,
      strideLength: 140, // longer stride
      bodyHeight: 64,
      hitboxHalfWidth: 24,
      hitboxHeight: 62,
      slideHeight: 30,
      landingSquash: 0.28,
      landingRecovery: 5.5,
      landingShake: 1.6,
    },
    colors: {
      body: "#8c562b",
      underbelly: "#dfcfb8",
      accent: "#f59e0b",
      eyes: "#fef3c7",
      trail: "#d97706",
      secondary: "#3d2211",
      antlers: "#e7d9c6",
    },
    cameraOffset: {
      y: 1.1,
      distance: 4.5,
      scale: 0.95,
    },
  },

  panda: {
    id: "panda",
    name: "Mountain Panda",
    title: "Guardian of the Stone Hollows",
    order: 4,
    cost: 200,
    rarity: "epic",
    description: "A robust and powerful bear with iconic black-and-white markings. Heavy mass grants immense momentum and crushing low slides.",
    perk: "Unstoppable momentum, broad presence & stable footing",
    stats: {
      speed: 6,
      agility: 5,
      jump: 6,
      power: 9,
    },
    physics: {
      mass: 125,
      acceleration: 0.88,
      maxSpeedMultiplier: 0.96,
      deceleration: 0.8,
      jumpForce: 690, // heavier takeoff
      doubleJumpForce: 590,
      gravityMultiplier: 1.08, // faster fall
      turnResponsiveness: 6.0,
      airControl: 0.8,
      groundFriction: 1.25,
      strideLength: 105,
      bodyHeight: 52,
      hitboxHalfWidth: 26,
      hitboxHeight: 54,
      slideHeight: 28,
      landingSquash: 0.36, // deep squash
      landingRecovery: 4.8,
      landingShake: 2.4, // heavy landing shake
    },
    colors: {
      body: "#f4f4f5", // white coat
      underbelly: "#f4f4f5",
      accent: "#38bdf8",
      eyes: "#18181b",
      trail: "#a1a1aa",
      secondary: "#18181b", // black limbs, ears, eye patches
    },
    cameraOffset: {
      y: 0.85,
      distance: 4.0,
      scale: 1.0,
    },
  },

  lion: {
    id: "lion",
    name: "Golden Lion",
    title: "Sovereign of the Amber Ridge",
    order: 5,
    cost: 320,
    rarity: "legendary",
    description: "The apex predator of the wild. Features a dense flowing dark-gold mane, muscular predator anatomy, and devastating pounce velocity.",
    perk: "Explosive acceleration bursts & earth-shaking pounces",
    stats: {
      speed: 9,
      agility: 7,
      jump: 8,
      power: 10,
    },
    physics: {
      mass: 190,
      acceleration: 1.25, // powerful explosive burst
      maxSpeedMultiplier: 1.06,
      deceleration: 1.05,
      jumpForce: 760,
      doubleJumpForce: 630,
      gravityMultiplier: 1.05,
      turnResponsiveness: 7.8,
      airControl: 0.92,
      groundFriction: 1.15,
      strideLength: 135,
      bodyHeight: 58,
      hitboxHalfWidth: 26,
      hitboxHeight: 58,
      slideHeight: 29,
      landingSquash: 0.32,
      landingRecovery: 5.2,
      landingShake: 2.8,
    },
    colors: {
      body: "#b97a2c",
      underbelly: "#f5e6cc",
      accent: "#eab308",
      eyes: "#fef08a",
      trail: "#ca8a04",
      secondary: "#78350f",
      mane: "#451a03",
    },
    cameraOffset: {
      y: 0.95,
      distance: 4.2,
      scale: 0.95,
    },
  },
};

/** Exact progression order required by specification */
export const ANIMAL_ORDER: AnimalId[] = ["fox", "moon_fox", "deer", "panda", "lion"];

/** Backward compatibility mapping from legacy FoxPeltId to AnimalId */
export function mapLegacyPeltId(peltId: string): AnimalId {
  switch (peltId) {
    case "ember":
      return "fox";
    case "silver":
      return "moon_fox";
    case "spirit":
      return "moon_fox";
    case "autumn":
      return "deer";
    case "shadow":
      return "lion";
    case "fox":
    case "moon_fox":
    case "deer":
    case "panda":
    case "lion":
      return peltId as AnimalId;
    default:
      return "fox";
  }
}
