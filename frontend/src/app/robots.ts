import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/assets',
        '/assets/*',
        '/onchain',
        '/onchain/*',
        '/tables',
        '/tables/*',
      ],
      disallow: [
        '/admin',
        '/admin/*',
        '/api',
        '/api/*',
        '/_next',
        '/_next/*',
        '/admin/signin',
        '/error-*',
      ],
    },
    sitemap: 'https://firemarkets.net/sitemap.xml',
  }
}
