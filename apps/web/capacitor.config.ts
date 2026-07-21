import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.verlyn.app',
  appName: 'Verlyn',
  webDir: 'out',
  server: {
    url: 'https://app.verlyn.in',
    cleartext: true
  }
};

export default config;
