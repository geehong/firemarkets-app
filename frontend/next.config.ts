import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 개발 모드 설정 */
  // 개발 모드 활성화
  reactStrictMode: true,
  
  webpack(config, { dev, isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    
    // 개발 모드에서 디버깅을 위한 설정
    if (dev) {
      config.devtool = 'eval-source-map';
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: false,
            vendors: false,
          },
        },
      }
      
      // 파일 감시 최적화로 CPU 사용량 감소
      config.watchOptions = {
        poll: false, // 폴링 비활성화 (Docker 환경에서도 inotify 사용)
        aggregateTimeout: 300, // 변경 후 300ms 대기 후 재컴파일
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/.git/**',
          '**/public/**', // public 폴더는 변경 감지 제외
        ],
      };
    }
    
    return config;
  },
  
  // 개발 모드 인디케이터 설정
  devIndicators: {
    position: 'bottom-right',
  },
  
  // 개발 모드에서 콘솔 로그 유지
  compiler: {
    removeConsole: false,
  },
  
  // 개발 모드 헤더 설정
  poweredByHeader: false,
  generateEtags: false,
  
  // 개발 환경 최적화 설정
  experimental: {
    // 개발 모드에서 CSS 최적화 비활성화
    optimizeCss: false,
    // 개발 모드에서 성능 측정 활성화
    webVitalsAttribution: ['CLS', 'FID', 'FCP', 'LCP', 'TTFB'],
    // 개발 모드에서 패키지 최적화 비활성화
    optimizePackageImports: [],
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
  // 이미지 호스트 설정
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static2.finnhub.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.finnhub.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.firemarkets.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's2.coinmarketcap.com',
        pathname: '/**',
      },
    ],
  },
  // 라이브러리 경로 처리
  async rewrites() {
    // 환경 변수에서 백엔드 URL 가져오기
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8001';
    
    return [
      {
        // API 요청을 백엔드로 프록시합니다.
        // 예: /api/v1/crypto/bitcoin -> http://localhost:8001/api/v1/crypto/bitcoin
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        // TinyMCE 정적 파일 제공
        source: '/node_modules/tinymce/:path*',
        destination: '/node_modules/tinymce/:path*',
      },
    ];
  },
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
