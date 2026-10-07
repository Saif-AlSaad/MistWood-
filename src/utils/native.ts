/* MistWood Native Android Subsystem (Capacitor Integration) */

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { StatusBar } from "@capacitor/status-bar";
import { ScreenOrientation } from "@capacitor/screen-orientation";

export const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
};

/**
 * Initializes immersive native Android gaming environment:
 * - Hides status bar
 * - Locks landscape orientation
 */
export const initNativeAndroid = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.hide();
  } catch {}

  try {
    await ScreenOrientation.lock({ orientation: "landscape" });
  } catch {}
};

/**
 * Registers native Android hardware/gesture back button listener
 */
export const registerNativeBackButton = (onBack: () => void): (() => void) => {
  if (!Capacitor.isNativePlatform()) return () => {};

  let cleanup: (() => void) | null = null;

  App.addListener("backButton", () => {
    onBack();
  }).then((handle) => {
    cleanup = () => handle.remove();
  }).catch(() => {});

  return () => {
    cleanup?.();
  };
};
