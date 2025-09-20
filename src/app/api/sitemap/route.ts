import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest) {
  const baseUrl = process.env.SITE_URL || 'https://your-domain.vercel.app';
  
  const staticPages = [
    '',
    '/customer',
    '/supplier',
    '/product',
    '/products',
    '/orders',
    '/sale',
    '/purchase',
    '/payment',
    '/receipt',
    '/production',
    '/reports',
    '/stock-report',
    '/ledger-report',
    '/cheque-report',
    '/settings',
    '/users'
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map((page) => {
      return `
    <url>
      <loc>${baseUrl}${page}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>`;
    })
    .join('')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
