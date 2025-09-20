import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest) {
  const baseUrl = process.env.SITE_URL || 'https://your-domain.vercel.app';
  
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /private/

# Allow specific API endpoints for SEO
Allow: /api/sitemap`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
