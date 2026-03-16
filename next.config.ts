import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dyynvwenjqkiyybvgyda.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return {
      // Run before any page/static — so / and /blog etc. serve public HTML before app router
      beforeFiles: [
        { source: '/favicon.ico', destination: '/api/icon?v=5' },
        { source: '/', destination: '/index.html' },
        { source: '/terms', destination: '/terms.html' },
        { source: '/privacy', destination: '/privacy.html' },
        { source: '/blog', destination: '/blog.html' },
      ],
      afterFiles: [
        { source: '/crm/legal/terms', destination: '/terms.html' },
        { source: '/crm/legal/privacy', destination: '/privacy.html' },
        { source: '/crm/legal/cookies', destination: '/privacy.html' },
      ],
    };
  },
};

export default nextConfig;
