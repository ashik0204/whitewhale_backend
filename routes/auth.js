import express from 'express';
import User from '../models/User.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

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
    
    console.log("Login attempt:", email);
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("Login failed - user not found:", email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Login failed - invalid password for:", email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log("Login successful for:", user.username, "Role:", user.role);
    
    // Create a JWT token
    const tokenPayload = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    // Use a default secret if JWT_SECRET is not set
    const jwtSecret = process.env.JWT_SECRET || 'jwt_fallback_secret';
    
    // Generate JWT token
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });
    
    // Set user in session as well (dual authentication approach)
    req.session.user = tokenPayload;
    
    // Explicitly save the session before sending the response
    req.session.save(err => {
      if (err) {
        console.error("Session save error:", err);
        // Continue anyway as we have JWT as backup
      }
      
      console.log("Session saved successfully for user:", user.username);
      console.log("Session ID:", req.sessionID);
      
      // Send both session cookie and JWT token for redundancy
      res.json({
        message: 'Login successful',
        token: token, // Send JWT token to client
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user with authentication check
router.get('/me', isAuthenticated, (req, res) => {
  console.log("GET /api/auth/me called - passed isAuthenticated middleware");
  console.log("Session exists:", !!req.session);
  console.log("Session ID:", req.sessionID);
  console.log("Session user:", req.session?.user);
  console.log("Cookies:", req.headers.cookie);
  
  // Clone the session user object
  const user = {...req.session.user};
  
  // Ensure consistent property naming (maintain both for backward compatibility)
  if (user.id && !user._id) {
    user._id = user.id;
  } else if (user._id && !user.id) {
    user.id = user._id;
  }
  
  console.log("Returning authenticated user:", user);
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
    console.log("Received token:", inviteToken);
    console.log("Expected token:", process.env.ADMIN_INVITE_TOKEN);
    console.log("Token match:", inviteToken === process.env.ADMIN_INVITE_TOKEN);
    
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
    
    // Create a JWT token for the new admin/editor user
    const tokenPayload = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role
    };
    
    // Use a default secret if JWT_SECRET is not set
    const jwtSecret = process.env.JWT_SECRET || 'jwt_fallback_secret';
    
    // Generate JWT token
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: '7d' });
    
    // Return user data and token
    res.status(201).json({
      token: token,
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
