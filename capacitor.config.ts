import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jol889.wordvibe',
  appName: 'Wordvibe',
  webDir: 'dist',
  server: {
    url: 'https://wordvibe.pages.dev',
    cleartext: false,
    androidScheme: 'https',
  },
  plugins: {
    AdMob: {
      androidAppId: 'ca-app-pub-7584471711915098~8594351362',
    },
  },
};

export default config;
