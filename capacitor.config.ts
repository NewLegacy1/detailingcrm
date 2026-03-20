import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.detailops',
  appName: 'DetailOps',
  server: {
    url: 'https://www.detailops.ca/login',
    allowNavigation: [
      'detailops.ca',
      'www.detailops.ca',
      '*.detailops.ca',
      '*.vercel.app',
      '*.supabase.co',
      'supabase.co',
      '*.stripe.com',
      'stripe.com',
      '*.google.com',
      'accounts.google.com',
    ],
  },
  webDir: 'www',
};

export default config;
