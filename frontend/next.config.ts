import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  // 개발 환경에서 HMR 설정
  experimental: {
    // HMR 관련 설정
  },
  // 캐시 설정
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  // Cross-origin 요청 허용
  allowedDevOrigins: ['firemarkets.net', 'www.firemarkets.net', '.firemarkets.net'],
  // Socket.IO 프록시 설정 (Docker 환경 감지) - 임시 비활성화
  // async rewrites() {
  //   // Docker 환경에서는 컨테이너 이름 사용, 로컬에서는 localhost 사용
  //   // Docker 컨테이너에서는 localhost에 접근할 수 없으므로 컨테이너 이름 사용
  //   const isDocker = process.env.DOCKER_ENV === 'true' || process.env.NODE_ENV === 'development';
  //   const backendUrl = isDocker 
  //     ? 'http://fire_markets_backend:8000' 
  //     : 'http://localhost:8001';
  //   
  //   console.log('Backend URL for proxy:', backendUrl);
  //   
  //   return [
  //     {
  //       source: '/socket.io/:path*',
  //       destination: `${backendUrl}/socket.io/:path*`,
  //     },
  //   ];
  // },
};

export default nextConfig;
