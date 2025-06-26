// Authentication middleware
import jwt from 'jsonwebtoken';

// Check if user is authenticated - using session or JWT token
export const isAuthenticated = (req, res, next) => {
  console.log("isAuthenticated middleware called");
  console.log("Session exists:", !!req.session);
  console.log("Session ID:", req.sessionID);
  console.log("Session user:", req.session?.user);
  console.log("Headers:", req.headers);
  
  // Try to authenticate with session first
  if (req.session && req.session.user) {
    console.log("User found in session");
    req.user = {
      id: req.session.user.id || req.session.user._id,
      _id: req.session.user.id || req.session.user._id, // Include both formats
      username: req.session.user.username,
      email: req.session.user.email,
      role: req.session.user.role
    };
    return next();
  }
  
  // If no session, try JWT token authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET || 'jwt_fallback_secret';
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      console.log("JWT token authenticated:", decoded);
      
      // Make sure we include all user fields needed by the frontend
      req.user = {
        id: decoded.id,
        _id: decoded.id, // Include both formats 
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      };
      
      return next();
    } catch (err) {
      console.log("JWT verification failed:", err.message);
      // Continue to check other auth methods
    }
  }
  
  console.log("Authentication failed - no valid session or token");
  return res.status(401).json({ message: 'Not authenticated' });
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};

// Check if user is admin or editor
export const isAdminOrEditor = (req, res, next) => {
  if (req.session.user && 
    (req.session.user.role === 'admin' || req.session.user.role === 'editor')) {
    return next();
  }
  res.status(403).json({ message: 'Admin or editor access required' });
};
