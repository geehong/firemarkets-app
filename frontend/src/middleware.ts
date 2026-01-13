import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'ko'],

    // Used when no locale matches
    defaultLocale: 'ko',

    // 브라우저 언어 감지를 방지하고 항상 defaultLocale 사용
    localeDetection: false,

    // 디폴트 로케일(ko)인 경우 URL에서 /ko/ 접두사를 생략하도록 설정
    localePrefix: 'as-needed'
});

export const config = {
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    matcher: ['/((?!api|uploads|_next|_vercel|.*\\..*).*)']
};
