# Deployment Guide

This guide will help you deploy the Management System to Vercel.

## Prerequisites

1. **MongoDB Atlas Account**: Set up a MongoDB Atlas cluster
2. **Vercel Account**: Create a free account at [vercel.com](https://vercel.com)
3. **GitHub Account**: For version control and automatic deployments

## Step 1: Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority

# Next.js
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key-here

# Site Configuration
SITE_URL=https://your-domain.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

## Step 2: MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your IP address (use `0.0.0.0/0` for Vercel)
5. Get your connection string and update `MONGODB_URI`

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

### Option B: Deploy via GitHub

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

## Step 4: Environment Variables in Vercel

Add these environment variables in your Vercel project settings:

- `MONGODB_URI`: Your MongoDB connection string
- `NEXTAUTH_URL`: Your Vercel domain
- `NEXTAUTH_SECRET`: A random secret string
- `SITE_URL`: Your Vercel domain
- `NEXT_PUBLIC_SITE_URL`: Your Vercel domain

## Step 5: Domain Configuration (Optional)

1. Go to your Vercel project settings
2. Add your custom domain
3. Update DNS records as instructed
4. Update environment variables with your custom domain

## Performance Optimizations

The project includes several performance optimizations:

- **Image Optimization**: Automatic WebP/AVIF conversion
- **Bundle Optimization**: Code splitting and tree shaking
- **Caching**: API response caching
- **Database Optimization**: Connection pooling and query optimization
- **Error Handling**: Comprehensive error boundaries

## Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Error Tracking**: Global error handling and logging
- **Database Monitoring**: MongoDB Atlas monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**: Check environment variables
2. **Database Connection**: Verify MongoDB URI and network access
3. **API Errors**: Check function timeout settings
4. **Performance Issues**: Monitor bundle size and database queries

### Debug Mode

Set `NODE_ENV=development` in environment variables to enable debug mode.

## Vercel Build Notes

- The build runs `next build` followed by `next-sitemap`, which generates `public/sitemap.xml` and `public/robots.txt`. Ensure `SITE_URL` (and `NEXT_PUBLIC_SITE_URL`) is set in Vercel so the links point to your domain, not the placeholder.
- We serve `/sitemap.xml` directly from `public/`. The API route at `/api/sitemap` can still be used for dynamic cases but is not required for Vercel. No rewrite is configured for `/sitemap.xml`.
- TypeScript and ESLint checks are skipped during production builds to avoid CI noise. You can re-enable by updating `next.config.ts` if you prefer strict CI checks.
- Mongoose indexes are defined once to prevent duplicate index warnings in CI. If you alter model indexes, drop the old duplicates in your MongoDB as needed.

## Security

- All API routes are protected with proper error handling
- Environment variables are secured
- Database connections use SSL
- Security headers are configured

## Backup

- MongoDB Atlas provides automatic backups
- Code is version controlled in GitHub
- Environment variables are stored securely in Vercel

## Scaling

- Vercel automatically scales based on traffic
- MongoDB Atlas scales with your needs
- Consider upgrading plans for high traffic

## Support

For issues or questions:
1. Check the logs in Vercel dashboard
2. Review MongoDB Atlas logs
3. Check browser console for client-side errors
4. Review the error handling components
