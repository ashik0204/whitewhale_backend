import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import blogRoutes from './routes/blog.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory path for current module (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple possible paths for .env file
let envLoaded = false;
const possiblePaths = [
  path.join(__dirname, '..', '.env'),        // project root
  path.join(__dirname, '.env'),              // server folder
  '.env'                                     // current working directory
];

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn("Warning: No .env file found, using hardcoded defaults");
}

// Define hardcoded fallback values for critical variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ashikstenny:QHg3Ye8OpQ0ZH0F0@cluster0.anvyfjd.mongodb.net/';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_default_secret';
const PORT = process.env.PORT || 3001; // Use 3001 as default since 3000 seems to be in use

const app = express();

// Add production environment setup
const CLIENT_BUILD_PATH = path.join(__dirname, '..', 'dist');
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: isDevelopment 
    ? ['http://localhost:3001', 'http://localhost:5173'] 
    : process.env.CLIENT_URL || ['https://your-netlify-app.netlify.app', '*'],
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

// Create the public directory and uploads directory
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log(`Created public directory at: ${publicDir}`);
}

const uploadsDir = path.join(publicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
}

// Serve static files - IMPORTANT: Order matters! More specific paths first
app.use('/uploads', express.static(path.join(publicDir, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year in seconds
    console.log(`Serving image: ${filePath}`);
  }
}));

// Then serve the general public directory
app.use(express.static(publicDir));

// Connect to MongoDB with proper error handling
console.log(`Connecting to MongoDB: ${MONGODB_URI.substring(0, MONGODB_URI.indexOf('@') + 1)}***`);
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit with failure if MongoDB connection fails
  });

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Serve static files from the build directory in production
if (!isDevelopment) {
  // Serve static files from React app build
  app.use(express.static(CLIENT_BUILD_PATH));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ message: 'API endpoint not found' });
    } else {
      res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
    }
  });
} else {
  // Development API check route
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// Debug route to check directory structure
app.get('/api/debug/dirs', (req, res) => {
  const dirs = {
    __dirname,
    publicDir,
    uploadsDir,
    publicExists: fs.existsSync(publicDir),
    uploadsExists: fs.existsSync(uploadsDir),
    files: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
  };
  res.json(dirs);
});

// Try multiple ports if the default is in use
function startServer(port) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use. Trying port ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error("Server error:", e);
      process.exit(1);
    }
  });
}

startServer(PORT);