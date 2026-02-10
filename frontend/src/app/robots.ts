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
            ],
        },
        sitemap: 'https://firemarkets.net/sitemap.xml',
    }
}
