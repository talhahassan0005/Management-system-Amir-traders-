#!/usr/bin/env node
/**
 * One-off script to create an admin user in the MongoDB used by this project.
 * Usage (PowerShell):
 *   $env:MONGODB_URI="<your-uri>"; node scripts/create-admin.js --email admin@example.com --password secret123
 * If MONGODB_URI is present in environment, the script will use it.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const argv = require('minimist')(process.argv.slice(2));
// Default creds overridden per request (TEMPORARY – remove in production!)
const email = argv.email || argv.e || 'amirtraders@gmail.com';
const password = argv.password || argv.p || 'amirtraders1234@*';
const name = argv.name || 'Amir Traders Admin';
const role = argv.role || 'admin';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in the environment. Set it and retry.');
  process.exit(1);
}

async function main() {
  try {
    console.log('Connecting to MongoDB...');
  // Use provided dbName if set; otherwise use default from URI
  await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const hashed = await bcrypt.hash(String(password), 10);

    const usersColl = mongoose.connection.collection('users');
    const existing = await usersColl.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      console.log('User already exists. Updating password and role.');
      await usersColl.updateOne(
        { _id: existing._id },
        { $set: { password: hashed, role, name, updatedAt: new Date(), isActive: true } }
      );
      console.log('Updated existing user:', email);
    } else {
      const doc = {
        name,
        email: String(email).toLowerCase().trim(),
        password: hashed,
        role,
        avatar: '',
        phone: '',
        address: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await usersColl.insertOne(doc);
      console.log('Created admin user:', email);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(2);
  }
}

main();
