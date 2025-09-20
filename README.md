# Management System

A comprehensive business management system built with Next.js 15, TypeScript, and MongoDB.

## Features

- **Customer Management**: Add, edit, and manage customer information
- **Supplier Management**: Track supplier details and relationships
- **Product Management**: Manage inventory and product catalog
- **Order Management**: Handle sales and purchase orders
- **Invoice System**: Generate and manage invoices
- **Payment Tracking**: Monitor payments and receipts
- **Production Management**: Track production processes
- **Reporting**: Comprehensive reports and analytics
- **Dashboard**: Real-time business insights

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deployment**: Vercel

## Performance Optimizations

- **Bundle Optimization**: Code splitting and tree shaking
- **Image Optimization**: Automatic WebP/AVIF conversion
- **Caching**: API response caching and browser caching
- **Database Optimization**: Connection pooling and query optimization
- **Component Optimization**: React.memo and useMemo for performance
- **Error Handling**: Comprehensive error boundaries and global error handling

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   SITE_URL=http://localhost:3000
   ```

4. Set up the database:
   ```bash
   npm run setup-db
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:check` - Check for linting errors
- `npm run type-check` - Run TypeScript type checking
- `npm run analyze` - Analyze bundle size
- `npm run setup-db` - Set up database

## Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   ├── (pages)/           # Page components
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   ├── Dashboard/         # Dashboard components
│   ├── Layout/            # Layout components
│   ├── ErrorBoundary.tsx  # Error boundary
│   └── LoadingSpinner.tsx # Loading component
├── lib/                   # Utility libraries
│   ├── mongodb.ts         # Database connection
│   └── api-utils.ts       # API utilities
└── models/                # Database models
    ├── Customer.ts
    ├── Product.ts
    └── ...
```

## API Routes

- `/api/customers` - Customer management
- `/api/suppliers` - Supplier management
- `/api/products` - Product management
- `/api/orders` - Order management
- `/api/sale-invoices` - Sales invoice management
- `/api/purchase-invoices` - Purchase invoice management
- `/api/payments` - Payment tracking
- `/api/receipts` - Receipt management
- `/api/production` - Production tracking
- `/api/reports` - Report generation

## Database Models

- **Customer**: Customer information and details
- **Supplier**: Supplier information and relationships
- **Product**: Product catalog and inventory
- **Order**: Sales and purchase orders
- **SaleInvoice**: Sales invoice records
- **PurchaseInvoice**: Purchase invoice records
- **Payment**: Payment tracking
- **Receipt**: Receipt management
- **Production**: Production process tracking
- **User**: User authentication and management

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

## Performance Features

- **Lazy Loading**: Components are loaded on demand
- **Image Optimization**: Automatic image optimization
- **Bundle Analysis**: Built-in bundle size analysis
- **Caching**: Multiple levels of caching
- **Error Boundaries**: Comprehensive error handling
- **Loading States**: Optimized loading experiences

## Security

- **Input Validation**: All inputs are validated and sanitized
- **Error Handling**: Secure error messages
- **Environment Variables**: Secure configuration management
- **Database Security**: MongoDB Atlas security features
- **Headers**: Security headers configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the documentation
- Review the error logs
- Open an issue on GitHub

## Changelog

### v1.0.0
- Initial release
- Complete management system
- Performance optimizations
- Error handling
- Deployment ready