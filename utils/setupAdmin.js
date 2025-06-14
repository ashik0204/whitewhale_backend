import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const createInitialAdmin = async () => {
  try {
    // Check if admin user already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('Admin user already exists');
      return;
    }
    
    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@whitewhaling.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    
    // Create the admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const adminUser = new User({
      username: adminUsername,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    });
    
    await adminUser.save();
    
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};
