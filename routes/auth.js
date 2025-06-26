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
      _id: user._id, // Include both formats for compatibility
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
  console.log("Request user (from middleware):", req.user);
  console.log("Auth header:", req.headers.authorization);
  console.log("Cookies:", req.headers.cookie);
  
  // We can get the user info from the req.user that isAuthenticated middleware set
  // This should work with both session or JWT token authentication
  if (req.user) {
    console.log("Using user from authentication middleware:", req.user);
    // Return the user from the middleware
    return res.json({ user: req.user });
  }
  
  // If for some reason req.user is not set (shouldn't happen), try session
  if (req.session && req.session.user) {
    // Clone the session user object
    const user = {...req.session.user};
    
    // Ensure consistent property naming
    if (user.id && !user._id) {
      user._id = user.id;
    } else if (user._id && !user.id) {
      user.id = user._id;
    }
    
    console.log("Using user from session:", user);
    return res.json({ user });
  }
  
  // This should never happen as isAuthenticated middleware would return 401 first
  console.log("No user found in request or session - this is unexpected");
  return res.status(401).json({ message: 'User not found in authenticated request' });
});

// Logout
router.post('/logout', (req, res) => {
  // Log logout attempt
  console.log("Logout request received");
  
  // For session-based auth, destroy the session
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Error destroying session:", err);
      } else {
        console.log("Session destroyed successfully");
      }
      
      // Clear session cookie
      res.clearCookie('connect.sid');
      
      // With JWT, the actual invalidation happens on the client side
      // by removing the token from localStorage
      res.json({ 
        message: 'Logout successful',
        info: 'Please remove JWT token from client storage'
      });
    });
  } else {
    // If no session exists, just return success
    // The client will handle removing the JWT token
    res.json({ 
      message: 'Logout successful', 
      info: 'No server session found, token-based auth logout handled on client'
    });
  }
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
