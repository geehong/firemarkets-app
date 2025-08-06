import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(() => {
  return {
    base: './',
    build: {
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            coreui: ['@coreui/react', '@coreui/icons', '@coreui/icons-react'],
            charts: ['chart.js', '@coreui/chartjs', '@coreui/react-chartjs'],
            aggrid: ['ag-grid-react', 'ag-grid-community'],
            query: ['@tanstack/react-query'],
            router: ['react-router-dom'],
            redux: ['react-redux', 'redux'],
          },
        },
      },
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },

    optimizeDeps: {
      force: false, // 개발 서버 시작 시간 단축
      include: [
        'react',
        'react-dom',
        '@coreui/react',
        '@coreui/icons',
        '@tanstack/react-query',
        'react-router-dom',
        'react-redux',
        'redux',
        'ag-grid-react',
        'ag-grid-community',
      ],
      exclude: ['@coreui/icons'], // 아이콘은 별도 처리
    },
    // 파일 감시 제외 설정
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/.nyc_output/**',
        '**/.next/**',
        '**/out/**',
        '**/.nuxt/**',
        '**/.cache/**',
        '**/.parcel-cache/**',
        '**/.eslintcache/**',
        '**/.stylelintcache/**',
        '**/.prettiercache/**',
        '**/.babelcache/**',
        '**/.swc/**',
        '**/.turbo/**',
        '**/.vercel/**',
        '**/.netlify/**',
        '**/.output/**',
        '**/.nuxt/**',
        '**/.next/**',
        '**/.cache/**',
        '**/.parcel-cache/**',
        '**/.eslintcache/**',
        '**/.stylelintcache/**',
        '**/.prettiercache/**',
        '**/.babelcache/**',
        '**/.swc/**',
        '**/.turbo/**',
        '**/.vercel/**',
        '**/.netlify/**',
        '**/.output/**',
      ],
    },
    plugins: [
      react({
        include: "**/*.{jsx,js}",
      }),
    ],
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.[tj]sx?$/,
      exclude: [],
    },
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.jsx', '.js', '.mjs', '.ts', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0', // Docker 컨테이너에서 외부 접근을 위해 필요
      // 리버스 프록시(예: firemarkets.net)를 통해 접속하는 경우, 해당 호스트를 허용해야 합니다.
      allowedHosts: ['firemarkets.net', 'localhost', 'fire_markets_frontend', '172.20.0.0/16', '172.21.0.0/16'],
      hmr: false, // WebSocket 연결 문제로 인한 로딩 지연 방지
      // 개발 서버 성능 최적화
      fs: {
        strict: false,
        allow: ['..'], // 상위 디렉토리 접근 허용
      },
      // 파일 감시 최적화
      watch: {
        usePolling: false, // 폴링 비활성화 (성능 향상)
        interval: 1000, // 폴링 간격 (usePolling이 true일 때만)
      },
      // 프록시 설정 최적화
      proxy: {
        '/api': {
          target: 'http://backend:8000', // Docker 네트워크 내의 백엔드 서비스
          changeOrigin: true, // 호스트 헤더를 백엔드의 URL로 변경 (CORS 문제 방지)
          rewrite: (path) => path.replace(/^\/api/, ''), // '/api' 접두사 제거 후 백엔드로 전달
          secure: false, // 개발 환경에서 HTTPS 문제가 있다면 추가 (선택 사항)
          ws: true, // 웹소켓 프록시가 필요하다면 추가 (FastAPI SocketIO 구현 시 필요)
          // 프록시 타임아웃 설정
          timeout: 30000,
        },
      },
    },
  }
})
