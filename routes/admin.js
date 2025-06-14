import express from 'express';
import BlogPost from '../models/BlogPost.js';
import User from '../models/User.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Get all blog posts (including drafts)
router.get('/posts', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const posts = await BlogPost.find()
      .sort({ updatedAt: -1 })
      .populate('author', 'username');
      
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (admin only)
router.put('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { username, email, role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route to list uploaded files
router.get('/uploads', isAuthenticated, isAdmin, (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ 
        message: 'Uploads directory does not exist',
        path: uploadsDir
      });
    }
    
    const files = fs.readdirSync(uploadsDir);
    
    res.json({
      message: 'Files in uploads directory',
      path: uploadsDir,
      files: files,
      count: files.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error listing uploads', error: error.message });
  }
});

export default router;
