import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import BlogPost from '../models/BlogPost.js';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const initializeDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/whitewhaling');
    console.log('✅ Connected to MongoDB');

    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || 'adminpassword', 
        10
      );
      
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@whitewhaling.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Check if we have any blog posts
    const postCount = await BlogPost.countDocuments();
    
    if (postCount === 0) {
      console.log('Creating sample blog post...');
      
      const admin = await User.findOne({ role: 'admin' });
      
      if (!admin) {
        throw new Error('Admin user not found');
      }
      
      const samplePost = new BlogPost({
        title: 'Getting Started with White Whaling',
        slug: 'getting-started-with-white-whaling',
        excerpt: 'Learn how to maximize your sales and marketing efforts with our platform.',
        content: `# Getting Started with White Whaling

This is a sample blog post to help you get started with the White Whaling platform.

## Features Overview

White Whaling provides a comprehensive set of tools to help you identify and target high-value leads:

1. **AI-powered lead qualification** - Automatically score and prioritize leads
2. **Cold outreach automation** - Create personalized sequences
3. **Analytics dashboard** - Track performance metrics

## Next Steps

To get the most out of White Whaling, we recommend:

- Setting up your team members
- Importing your existing leads
- Creating your first campaign

Feel free to reach out to our support team if you need any assistance!`,
        author: admin._id,
        featuredImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000',
        tags: ['Getting Started', 'Sales', 'Marketing'],
        readTime: '5 min read',
        status: 'published'
      });
      
      await samplePost.save();
      console.log('✅ Sample blog post created');
    } else {
      console.log(`✅ ${postCount} blog posts already exist`);
    }

    console.log('Database initialization complete!');
    mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initializeDatabase();
