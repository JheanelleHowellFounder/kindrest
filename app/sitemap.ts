import type { MetadataRoute } from 'next'

const SITE = 'https://www.kindrest.co'

/** The public pages worth indexing. Nothing behind a login, nothing personal. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${SITE}/`,              lastModified: now, changeFrequency: 'weekly',  priority: 1 },
    { url: `${SITE}/organizations`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${SITE}/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ]
}
