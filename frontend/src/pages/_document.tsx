import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        {/* 개발 모드 스크립트 숨기기 */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Next.js 개발 모드 스크립트 숨기기 */
            script[src*="webpack"] { display: none !important; }
            script[src*="app-pages-internals"] { display: none !important; }
            script[src*="app/not-found"] { display: none !important; }
            script[src*="polyfills"] { display: none !important; }
            script[src*="main-app"] { display: none !important; }
            script[src*="app/assets"] { display: none !important; }
            
            /* 개발 모드 인디케이터 숨기기 */
            #__next-build-watcher { display: none !important; }
            [data-nextjs-dialog] { display: none !important; }
            [data-nextjs-dialog-overlay] { display: none !important; }
            
            /* 개발 모드 스크립트 태그 숨기기 */
            script[type="text/javascript"]:not([src]) { display: none !important; }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
