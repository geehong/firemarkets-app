import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

export default defineConfig(() => {
  return {
    mode: 'production',
    base: '/',
    build: {
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React와 관련된 모든 모듈을 메인 번들에 포함
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('react-redux')) {
              return 'vendor';
            }
            // 다른 라이브러리들을 별도 청크로 분리
            if (id.includes('@coreui')) {
              return 'coreui';
            }
            if (id.includes('highcharts') || id.includes('echarts')) {
              return 'charts';
            }
            if (id.includes('ag-grid')) {
              return 'grid';
            }
            if (id.includes('@tanstack')) {
              return 'query';
            }
            if (id.includes('axios') || id.includes('socket.io')) {
              return 'utils';
            }
            return null;
          },
          // 파일명에 해시 포함하여 캐시 무효화 최적화
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            if (/\.(css)$/.test(assetInfo.name)) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          }
        },
      },
      chunkSizeWarningLimit: 1000,
      // 빌드 최적화
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      // 소스맵 최적화
      sourcemap: false,
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      include: [
        'react',
        'react-dom',
        '@coreui/react',
        '@coreui/icons-react',
        'highcharts',
        'ag-grid-community',
        '@tanstack/react-query',
        'highcharts/modules/stock',
        'highcharts/modules/exporting',
        'highcharts/modules/accessibility',
        'highcharts/modules/drag-panes',
        'highcharts/modules/navigator',
        'highcharts/modules/treemap',
        'highcharts/modules/data',
        'highcharts/modules/coloraxis'
      ],
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
        {
          find: 'react',
          replacement: path.resolve(__dirname, './node_modules/react'),
        },
        {
          find: 'react-dom',
          replacement: path.resolve(__dirname, './node_modules/react-dom'),
        },
        {
          find: 'react/jsx-runtime',
          replacement: path.resolve(__dirname, './node_modules/react/jsx-runtime'),
        },
        {
          find: 'react/jsx-dev-runtime',
          replacement: path.resolve(__dirname, './node_modules/react/jsx-dev-runtime'),
        },
      ],
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0', // Docker 컨테이너에서 외부 접근을 위해 필요
      // 리버스 프록시(예: firemarkets.net)를 통해 접속하는 경우, 해당 호스트를 허용해야 합니다.
      allowedHosts: ['firemarkets.net', 'localhost', 'fire_markets_frontend', '172.20.0.0/16', '172.21.0.0/16'],
      hmr: {
        overlay: false, // HMR 오버레이 비활성화 (URI malformed 에러 방지)
      },
      headers: {
        'Cache-Control': 'no-store',
      },
      proxy: {
        '/api': {
          target: 'http://backend:8000', // Docker 네트워크 내의 백엔드 서비스
          changeOrigin: true, // 호스트 헤더를 백엔드의 URL로 변경 (CORS 문제 방지)
          rewrite: (path) => path.replace(/^\/api\/v1/, '/api'), // '/api/v1'을 '/api'로 변경
          secure: false, // 개발 환경에서 HTTPS 문제가 있다면 추가 (선택 사항)
          ws: true, // 웹소켓 프록시가 필요하다면 추가 (FastAPI SocketIO 구현 시 필요)
          configure: (proxy, options) => {
            // 프록시 에러 핸들링
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
              if (err.message && err.message.includes('URI malformed')) {
                console.error('URI malformed error in proxy:', err);
              }
            });
          }
        },
      },
    },
  }
})
