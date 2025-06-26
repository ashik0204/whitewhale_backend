# Troubleshooting Guide for White Whale App

This guide covers common issues and their solutions for the White Whale application.

## Authentication Issues

### 403 Forbidden when accessing /api/admin/posts

**Problem:** Users who log in successfully still can't access admin routes, receiving a 403 Forbidden error.

**Cause:** The isAdmin middleware was only checking for admin roles in the session but not in the JWT token.

**Solution:** Updated the isAdmin middleware to check for admin roles in both req.user (from JWT) and req.session.user:

```javascript
// Check if user is admin
export const isAdmin = (req, res, next) => {
  // Check if user is admin in either req.user (JWT) or req.session.user (session)
  if ((req.user && req.user.role === 'admin') || 
      (req.session?.user && req.session.user.role === 'admin')) {
    return next();
  }
  res.status(403).json({ message: 'Admin access required' });
};
```

### Authentication Not Persisting

**Problem:** Users need to log in again after page refresh.

**Solution:** 
1. The app uses both JWT tokens and session cookies for authentication.
2. JWT tokens are stored in localStorage and used in Authorization headers.
3. Make sure your JWT_SECRET is correctly set in your environment variables.
4. Check that the frontend is correctly sending the token in the Authorization header.

## Cross-Domain Issues

When using different domains for frontend and backend:

1. Make sure CORS is properly configured:
   ```javascript
   app.use(cors({
     origin: process.env.CLIENT_URL || 'http://localhost:3000',
     credentials: true
   }));
   ```

2. Session cookies require special configuration:
   ```javascript
   app.use(session({
     // ...other options
     cookie: {
       secure: process.env.NODE_ENV === 'production',
       httpOnly: true,
       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
       maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
     }
   }));
   ```

3. All frontend API requests need to include credentials:
   ```javascript
   axios.defaults.withCredentials = true;
   ```

## Missing or Incorrect Environment Variables

Make sure all these environment variables are set:

1. Backend (server/.env or hosting platform):
   - NODE_ENV
   - PORT
   - MONGODB_URI
   - SESSION_SECRET
   - JWT_SECRET
   - CLIENT_URL
   - ADMIN_INVITE_TOKEN

2. Frontend (.env or hosting platform):
   - VITE_API_URL

## Admin Registration Issues

If you can't register as admin:

1. Make sure ADMIN_INVITE_TOKEN is correctly set on the server.
2. Make sure you're using the correct token in the registration form.
3. Check network requests for errors when submitting the form.

## Getting Additional Help

If you encounter other issues:
1. Check server logs for errors
2. Check network requests in your browser's developer tools
3. Test API endpoints using tools like Postman
