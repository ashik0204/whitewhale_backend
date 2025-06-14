# Deployment Guide for White Whaling App

This guide explains how to deploy the White Whaling application with:
- Backend on Render
- Frontend on Netlify

## Part 1: Deploying Backend to Render

1. **Create a Render account** 
   - Sign up at [render.com](https://render.com)

2. **Create a new Web Service**
   - Click "New" and select "Web Service"
   - Connect your GitHub/GitLab repository or upload your code
   - Select the server directory with your backend code

3. **Configure the Web Service**
   - Name: `white-whaling-server` (or your preference)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Plan: Select a suitable plan (Free tier works for testing)

4. **Set Environment Variables**
   Add the following environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will automatically use this)
   - `MONGODB_URI`: Your MongoDB connection string
   - `SESSION_SECRET`: A secure random string
   - `CLIENT_URL`: Your Netlify frontend URL (once you have it)
   - `ADMIN_EMAIL`: Your admin email
   - `ADMIN_PASSWORD`: A secure admin password
   - `ADMIN_USERNAME`: Your admin username
   - `ADMIN_INVITE_TOKEN`: A secure token for admin registration

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Note your service URL (e.g., `https://white-whaling-server.onrender.com`)

## Part 2: Deploying Frontend to Netlify

1. **Create a Netlify account**
   - Sign up at [netlify.com](https://netlify.com)

2. **Prepare your frontend code**
   - Update your API baseURL to point to your Render backend URL
   - For example, if you're using axios:
   
   ```js
   // src/api/config.js or similar
   const API_URL = process.env.NODE_ENV === 'production' 
     ? 'https://your-render-service.onrender.com/api'
     : 'http://localhost:3001/api';
   
   export default API_URL;
   ```

3. **Add a netlify.toml file** to your frontend root directory:
   ```toml
   [build]
     publish = "dist" # or "build" depending on your frontend build output
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

4. **Deploy to Netlify**
   - Connect your GitHub/GitLab repository or upload your frontend code
   - Configure build settings:
     - Build command: `npm run build` (or whatever your build script is)
     - Publish directory: `dist` (or `build`, depending on your frontend framework)
   
5. **Set Environment Variables** in Netlify
   - `VITE_API_URL` or `REACT_APP_API_URL`: Your Render backend URL

6. **Deploy**
   - Netlify will automatically build and deploy your application
   - Note your Netlify URL (e.g., `https://white-whaling.netlify.app`)

## Part 3: Connecting Backend and Frontend

1. **Update Render Environment Variables**
   - Go to your Render dashboard
   - Update the `CLIENT_URL` variable to match your Netlify URL

2. **Test the Connection**
   - Visit your Netlify site and verify that it can connect to your backend

## Troubleshooting

1. **CORS Issues**
   - If you have CORS errors, make sure your backend CORS settings include your Netlify domain
   - Update the `CLIENT_URL` environment variable in Render

2. **MongoDB Connection Issues**
   - Ensure your MongoDB connection string is correct
   - Check network settings if using MongoDB Atlas

3. **404 Errors on Netlify**
   - Check that your Netlify redirects are set correctly in netlify.toml

4. **Environment Variable Issues**
   - Double-check the names and values of your environment variables
   - Restart your services after changing environment variables

## Maintenance

1. **Deployment Updates**
   - Both Render and Netlify can be set to automatically deploy when you push to your repository

2. **Monitoring**
   - Use the Render and Netlify dashboards to monitor your application
   - Check logs for errors and performance issues
