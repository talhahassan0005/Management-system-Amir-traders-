# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account
1. Go to https://www.mongodb.com/atlas
2. Click "Try Free" and create an account
3. Choose the FREE tier (M0 Sandbox)

## Step 2: Create a Cluster
1. Choose "Build a Database"
2. Select "FREE" tier (M0 Sandbox)
3. Choose a cloud provider (AWS, Google Cloud, or Azure)
4. Select a region closest to you
5. Give your cluster a name (e.g., "management-system")
6. Click "Create Cluster"

## Step 3: Set Up Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and password (save these!)
5. Set privileges to "Read and write to any database"
6. Click "Add User"

## Step 4: Set Up Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for development)
4. Click "Confirm"

## Step 5: Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

## Step 6: Update Environment Variables
Replace the connection string in your `.env.local` file:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/management-system?retryWrites=true&w=majority
```

Replace:
- `<username>` with your database username
- `<password>` with your database password
- `<cluster-url>` with your cluster URL

## Step 7: Test Connection
Run the seed script to test the connection:
```bash
npm run seed
```

If successful, you'll see:
```
Connected to MongoDB
Customers seeded successfully
Products seeded successfully
Suppliers seeded successfully
Database seeded successfully!
```
