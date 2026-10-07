import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mistwood.game',
  appName: 'Mistwood',
  webDir: 'dist',
  backgroundColor: '#05070b',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
    ScreenOrientation: {
      orientation: 'landscape',
    },
  },
};

export default config;
