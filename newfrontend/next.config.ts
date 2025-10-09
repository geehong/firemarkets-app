import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'firemarkets.net',
    'www.firemarkets.net',
    '.firemarkets.net',
    'localhost',
    '127.0.0.1'
  ],
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
