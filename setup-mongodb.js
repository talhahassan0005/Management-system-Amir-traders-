#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 MongoDB Setup Script for Amir Traders');
console.log('=========================================\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.log('❌ .env.local file not found!');
  console.log('📝 Creating .env.local file...\n');
  
  const envContent = `# MongoDB Configuration
# Replace with your actual MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/management-system?retryWrites=true&w=majority

# Alternative: For local MongoDB installation
# MONGODB_URI=mongodb://localhost:27017/management-system

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# JWT Secret for authentication
JWT_SECRET=your-jwt-secret-key-here`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file created successfully!\n');
} else {
  console.log('✅ .env.local file already exists\n');
}

console.log('📋 MongoDB Setup Options:');
console.log('========================\n');

console.log('Option 1: MongoDB Atlas (Cloud - Recommended)');
console.log('---------------------------------------------');
console.log('1. Go to https://www.mongodb.com/atlas');
console.log('2. Create a free account');
console.log('3. Create a new cluster (M0 Sandbox - FREE)');
console.log('4. Set up database user and network access');
console.log('5. Get your connection string');
console.log('6. Update MONGODB_URI in .env.local\n');

console.log('Option 2: Local MongoDB Installation');
console.log('-----------------------------------');
console.log('Windows:');
console.log('1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community');
console.log('2. Install MongoDB');
console.log('3. Start MongoDB service');
console.log('4. Use: MONGODB_URI=mongodb://localhost:27017/management-system\n');

console.log('macOS (using Homebrew):');
console.log('brew tap mongodb/brew');
console.log('brew install mongodb-community');
console.log('brew services start mongodb/brew/mongodb-community\n');

console.log('Linux (Ubuntu/Debian):');
console.log('sudo apt-get install mongodb');
console.log('sudo systemctl start mongodb\n');

console.log('🔧 Configuration Steps:');
console.log('======================');
console.log('1. Update .env.local with your MongoDB connection string');
console.log('2. Run: npm run dev');
console.log('3. Visit: http://localhost:3000/db-status to check connection');
console.log('4. Run: npm run seed to populate database with sample data\n');

console.log('📊 Database Status Check:');
console.log('========================');
console.log('Visit http://localhost:3000/api/db-status to check your database connection status\n');

console.log('🎯 Next Steps:');
console.log('==============');
console.log('1. Configure your MongoDB connection string in .env.local');
console.log('2. Start the development server: npm run dev');
console.log('3. Check database status at: http://localhost:3000/db-status');
console.log('4. Seed the database: npm run seed');
console.log('5. Start using the application!\n');

console.log('✨ Setup complete! Happy coding! 🚀');
