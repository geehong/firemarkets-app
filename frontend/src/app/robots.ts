import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/admin',
                '/admin/*',
                '/profile',
                '/profile/*',
                '/calendar',
                '/calendar/*',
                '/widgets',
                '/widgets/*',
                '/tables',
                '/tables/*',
                '/chart',
                '/chart/*',
                '/alerts',
                '/alerts/*',
                '/avatars',
                '/avatars/*',
                '/badge',
                '/badge/*',
                '/buttons',
                '/buttons/*',
                '/modals',
                '/modals/*',
                '/design-concepts',
                '/design-concepts/*',
                '/blank',
                '/forms',
            ],
        },
        sitemap: 'https://firemarkets.net/sitemap.xml',
    }
}
