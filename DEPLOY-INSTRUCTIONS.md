# Deployment Instructions for White Whaling Server

## Important Directory Structure Update

This server now uses a new directory structure for uploads:

- Uploads are stored in `/server/public/uploads/` (inside this server directory)
- This change ensures images work correctly when deploying to Render
- No additional configuration is needed; the server will create this directory automatically

## Environment Variables for Render Deployment

Make sure to set the following environment variables in your Render dashboard for the server:

1. **MONGODB_URI**
   - Your MongoDB connection string
   - Example: `mongodb+srv://username:password@cluster.mongodb.net/database`

2. **SESSION_SECRET**
   - A strong random string for session security
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **JWT_SECRET**
   - A strong random string for JWT token security (different from SESSION_SECRET)
   - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

4. **ADMIN_INVITE_TOKEN**
   - The token required for admin registration
   - Current value: `hi_hello` (consider changing to something more secure)

5. **CLIENT_URL**
   - Your Netlify frontend URL
   - Example: `https://adorable-fenglisu-331647.netlify.app`

6. **NODE_ENV**
   - Set to `production` for deployment

## Steps to Deploy

1. Push your code to GitHub

2. In Render Dashboard:
   - Create a new Web Service
   - Connect your GitHub repository
   - Set the server directory as the root directory
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Add all Environment Variables listed above

3. After deployment, verify your server is running by visiting:
   - `https://your-render-app-name.onrender.com/`
   - You should see "API is running..."

4. Test authentication:
   - Try logging in from your Netlify frontend
   - Check the server logs in Render dashboard for debugging information

## Troubleshooting

If you encounter login or session issues:

1. Check Render logs for authentication errors
2. Verify all environment variables are set correctly
3. Make sure CORS is configured properly for your Netlify domain
4. Confirm JWT_SECRET and SESSION_SECRET are set to secure values

For any issues with the JWT token authentication:

1. Check browser console logs to see if the token is being stored
2. Verify the Authorization header is being sent with requests
3. Check server logs to see if token verification is succeeding
