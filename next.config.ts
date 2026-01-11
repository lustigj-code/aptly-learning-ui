import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile framer-motion for better SSR compatibility
  transpilePackages: ['framer-motion'],

  // Compiler options
  compiler: {
    // Remove console logs in production (except errors)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Disable strict mode temporarily to avoid double-render issues
  reactStrictMode: false,
};

export default nextConfig;
