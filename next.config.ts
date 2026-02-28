import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      // Clean URLs → static HTML files in /public
      { source: '/terms',               destination: '/terms.html'   },
      { source: '/privacy',             destination: '/privacy.html' },
      { source: '/blog',                destination: '/blog.html'    },
      // /crm/legal/* links used throughout the app
      { source: '/crm/legal/terms',     destination: '/terms.html'   },
      { source: '/crm/legal/privacy',   destination: '/privacy.html' },
      { source: '/crm/legal/cookies',   destination: '/privacy.html' },
    ];
  },
};

export default nextConfig;
