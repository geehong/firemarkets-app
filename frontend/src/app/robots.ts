import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin/',
                '/profile/',
                '/calendar/',
                '/widgets/',
                '/tables/',
                '/chart/',
                '/alerts/',
                '/avatars/',
                '/badge/',
                '/buttons/',
                '/images/',
                '/modals/',
                '/design-concepts/',
                '/blank/',
                '/forms/',
            ],
        },
        sitemap: 'https://firemarkets.net/sitemap.xml',
    }
}
