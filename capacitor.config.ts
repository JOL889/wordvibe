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
};

export default config;
