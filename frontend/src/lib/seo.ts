const SITE_URL = 'https://firemarkets.net'

// ko is the default locale (middleware localePrefix: 'as-needed'), so its
// canonical URLs carry no /ko prefix - only /en gets prefixed.
function localePath(locale: string, path: string): string {
    const prefix = locale === 'en' ? '/en' : ''
    return path === '/' ? (prefix || '/') : `${prefix}${path}`
}

/**
 * Builds the self-referencing canonical URL for a page given its
 * locale-independent path (e.g. '/news/briefnews/my-slug' or '/').
 */
export function getCanonicalUrl(locale: string, path: string): string {
    return `${SITE_URL}${localePath(locale, path)}`
}

/**
 * Builds the hreflang alternate map for a page given its
 * locale-independent path (e.g. '/news/briefnews/my-slug' or '/').
 */
export function getLanguageAlternates(path: string): Record<string, string> {
    return {
        ko: `${SITE_URL}${localePath('ko', path)}`,
        en: `${SITE_URL}${localePath('en', path)}`,
        'x-default': `${SITE_URL}${localePath('ko', path)}`,
    }
}
