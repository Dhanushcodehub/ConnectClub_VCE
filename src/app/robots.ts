import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/*', '/member/*', '/u/*', '/api/*'],
    },
    sitemap: 'https://connectclub-vce.vercel.app/sitemap.xml',
  }
}
