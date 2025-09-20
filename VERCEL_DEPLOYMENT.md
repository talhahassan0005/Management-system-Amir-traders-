# Vercel Deployment Guide for Amir Traders

## 🗄️ Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" and create an account
3. Choose the FREE tier (M0 Sandbox)

### Step 2: Create a Cluster
1. Choose "Build a Database"
2. Select "FREE" tier (M0 Sandbox)
3. Choose a cloud provider (AWS recommended)
4. Select a region closest to you
5. Give your cluster a name (e.g., "management-system")
6. Click "Create Cluster"

### Step 3: Set Up Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Set privileges to "Read and write to any database"
6. Click "Add User"

### Step 4: Set Up Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

## 🚀 Vercel Deployment

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy to Vercel
```bash
vercel
```

### Step 4: Set Environment Variables in Vercel Dashboard
1. Go to your project in Vercel dashboard
2. Go to Settings > Environment Variables
3. Add these variables:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/management-system?retryWrites=true&w=majority
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-app-name.vercel.app
```

### Step 5: Redeploy
After adding environment variables, redeploy:
```bash
vercel --prod
```

## 🔧 Alternative: Deploy via GitHub

### Step 1: Connect GitHub Repository
1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository: `Management-system-Amir-traders-`

### Step 2: Configure Build Settings
- Framework Preset: Next.js
- Root Directory: `management-system`
- Build Command: `npm run build`
- Output Directory: `.next`

### Step 3: Add Environment Variables
Add the same environment variables as above in the Vercel dashboard.

## 📝 Environment Variables Required

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/management-system?retryWrites=true&w=majority
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://your-app-name.vercel.app
```

## 🎯 Post-Deployment Steps

### 1. Test Database Connection
Visit: `https://your-app.vercel.app/api/db-status`

### 2. Seed Database (Optional)
You can create a seed API endpoint to populate initial data.

### 3. Verify All Features
- Dashboard
- Purchase Management
- Sales Management
- User Management
- Reports

## 🔍 Troubleshooting

### Common Issues:
1. **Database Connection Failed**: Check MONGODB_URI format
2. **Build Errors**: Ensure all dependencies are in package.json
3. **API Routes Not Working**: Check Vercel function logs

### Vercel Function Logs:
```bash
vercel logs
```

## 📊 Monitoring

- Vercel Dashboard: Monitor deployments and performance
- MongoDB Atlas: Monitor database usage and performance
- Vercel Analytics: Track user interactions

## 💰 Cost Estimation

### Free Tier Limits:
- **Vercel**: 100GB bandwidth, 100 serverless functions
- **MongoDB Atlas**: 512MB storage, shared clusters

### Paid Plans:
- **Vercel Pro**: $20/month
- **MongoDB Atlas**: $9/month for M2 cluster

## 🎉 Success!
Your Amir Traders system will be live at: `https://your-app-name.vercel.app`
