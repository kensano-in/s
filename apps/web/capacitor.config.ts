import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.verlyn.app',
  appName: 'Verlyn',
  webDir: 'out',
  server: {
    url: 'http://10.85.154.172:3000',
    cleartext: true
  }
};

export default config;
