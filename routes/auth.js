import express from 'express';
import User from '../models/User.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Register a new user (admin only can create new users)
router.post('/register', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password,
      role: role || 'user'
    });
    
    await user.save();
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Set user in session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
  // Clone the session user object
  const user = {...req.session.user};
  
  // Ensure consistent property naming (maintain both for backward compatibility)
  if (user.id && !user._id) {
    user._id = user.id;
  } else if (user._id && !user.id) {
    user.id = user._id;
  }
  
  res.json({ user });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Admin registration endpoint with invite token validation
router.post('/admin-register', async (req, res) => {
  try {
    const { username, email, password, role, inviteToken } = req.body;
    
    // Validate the invite token against the one in .env
    if (inviteToken !== process.env.ADMIN_INVITE_TOKEN) {
      return res.status(403).json({ message: 'Invalid invitation token' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Only allow admin or editor roles
    const validRole = ['admin', 'editor'].includes(role) ? role : 'editor';
    
    // Create new admin/editor user
    const newUser = new User({
      username,
      email,
      password,
      role: validRole
    });
    
    await newUser.save();
    
    // Create session for the new user
    req.session.user = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    };
    
    // Return user data
    res.status(201).json({
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

export default router;
