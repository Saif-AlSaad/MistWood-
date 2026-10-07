/* MistWood Haptic Feedback Subsystem — Tactile pulses for mobile & touch gameplay */

let hapticsEnabled = true;

export const setHapticsEnabled = (enabled: boolean): void => {
  hapticsEnabled = enabled;
};

export const getHapticsEnabled = (): boolean => {
  return hapticsEnabled;
};

/**
 * Safely trigger vibration patterns with fallbacks for unsupported devices
 */
function vibrate(pattern: number | number[]): void {
  if (!hapticsEnabled) return;
  if (typeof window === "undefined" || !("navigator" in window) || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {}
}

export const haptics = {
  /** Crisp 8ms tap for UI touches and small buttons */
  ui(): void {
    vibrate(8);
  },

  /** 10ms light tick for jump liftoff */
  jump(): void {
    vibrate(10);
  },

  /** Dynamic double jump acrobatic burst */
  doubleJump(): void {
    vibrate([10, 28, 14]);
  },

  /** 16ms steady friction pulse for slide initiation */
  slide(): void {
    vibrate(16);
  },

  /** Impact feedback based on landing velocity */
  land(hard = false): void {
    if (hard) {
      vibrate([18, 20, 24]);
    } else {
      vibrate(12);
    }
  },

  /** Micro-spark for collecting fireflies */
  collect(): void {
    vibrate(8);
  },

  /** Sacred double-bloom pulse for spirit veil absorption */
  bloom(): void {
    vibrate([18, 30, 36]);
  },

  /** High-voltage electric adrenaline thrill for near misses */
  nearMiss(): void {
    vibrate([14, 20, 22]);
  },

  /** Low crash shudder upon obstacle collision */
  death(): void {
    vibrate([35, 45, 60]);
  },
};
