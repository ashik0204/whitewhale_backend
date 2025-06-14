// Authentication middleware

// Check if user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Add user info to request
  req.user = {
    id: req.session.user._id,
    username: req.session.user.username
  };
  
  next();
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
