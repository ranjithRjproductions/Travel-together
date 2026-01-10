import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://<YOUR_DOMAIN>',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: 'https://<YOUR_DOMAIN>/login',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://<YOUR_DOMAIN>/signup',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
     {
      url: 'https://<YOUR_DOMAIN>/blogs',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
     {
      url: 'https://<YOUR_DOMAIN>/about',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
     {
      url: 'https://<YOUR_DOMAIN>/contact',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}
