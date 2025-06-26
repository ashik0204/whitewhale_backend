import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
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

// Check if session secret is secure
if (SESSION_SECRET === 'your_default_secret') {
  console.warn('WARNING: Using default session secret. Set SESSION_SECRET env variable for security!');
}

// Get the client URL from environment variable or use hardcoded values
const clientUrl = process.env.CLIENT_URL || 'https://adorable-fenglisu-331647.netlify.app';
console.log(`Using client URL for CORS: ${clientUrl}`);

// Configure allowed origins for CORS
const allowedOrigins = [
  clientUrl, 
  'https://adorable-fenglisu-331647.netlify.app', 
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173'
];

// Set up CORS with proper configuration for cross-domain cookies
app.use(cors({
  origin: function(origin, callback) {
    // Always allow all origins during development and troubleshooting
    // This is safe because we're not handling sensitive data
    return callback(null, true);
    
    // When ready to restrict:
    /*
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      console.log(`CORS allowed for origin: ${origin || 'null'}`);
      return callback(null, true);
    } else {
      console.log(`CORS blocked for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
    */
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(express.json());

// Configure session with MongoDB store and secure settings
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // Don't create session until something stored
  store: MongoStore.create({ 
    mongoUrl: MONGODB_URI,
    ttl: 14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native' // Use MongoDB's TTL index
  }),
  cookie: {
    httpOnly: true,
    secure: false, // Set to false for now to troubleshoot cookie issues
    sameSite: 'none', // Required for cross-domain, always set to 'none'
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days in milliseconds
  }
}));

// Create server-specific directories for uploads
const serverPublicDir = path.join(__dirname, 'public');
if (!fs.existsSync(serverPublicDir)) {
  fs.mkdirSync(serverPublicDir, { recursive: true });
  console.log(`Created server public directory at: ${serverPublicDir}`);
}

const uploadsDir = path.join(serverPublicDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at: ${uploadsDir}`);
}

// Check if there's an old uploads directory to migrate files from
const oldUploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (fs.existsSync(oldUploadsDir)) {
  try {
    console.log(`Found old uploads directory at: ${oldUploadsDir}, migrating files...`);
    const files = fs.readdirSync(oldUploadsDir);
    for (const file of files) {
      const sourcePath = path.join(oldUploadsDir, file);
      const destPath = path.join(uploadsDir, file);
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Migrated file: ${file}`);
      }
    }
    console.log(`Migration complete. Migrated ${files.length} files.`);
  } catch (err) {
    console.error('Error migrating files:', err);
  }
}

// Serve static files - IMPORTANT: Order matters! More specific paths first
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, filePath) => {
    // Add comprehensive CORS headers specifically for image files
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow access from any origin for images
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year in seconds
    console.log(`Serving image with CORS headers: ${filePath}`);
  }
}));

// Then serve the server public directory
app.use(express.static(serverPublicDir, {
  setHeaders: (res, filePath) => {
    // Add CORS headers to all static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  }
}));

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
    serverPublicDir,
    uploadsDir,
    serverPublicExists: fs.existsSync(serverPublicDir),
    uploadsExists: fs.existsSync(uploadsDir),
    files: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [],
    absolutePath: path.resolve(uploadsDir)
  };
  res.json(dirs);
});

// Debug route for checking uploads
app.get('/api/debug/uploads', (req, res) => {
  try {
    // Check for uploads directory
    const exists = fs.existsSync(uploadsDir);
    const files = exists ? fs.readdirSync(uploadsDir) : [];
    
    // Check a few specific files
    const testFiles = [
      'image-1749544361570-986383008.png',
      'image-1749623997248-227314902.png',
      'image-1749625168144-22339219.jpeg'
    ];
    
    const fileChecks = testFiles.map(file => {
      const filePath = path.join(uploadsDir, file);
      const fileExists = fs.existsSync(filePath);
      const stats = fileExists ? fs.statSync(filePath) : null;
      
      return {
        filename: file,
        exists: fileExists,
        size: stats ? stats.size : null,
        fullPath: filePath
      };
    });
    
    res.json({
      uploadsPath: uploadsDir,
      exists,
      fileCount: files.length,
      sampleFiles: files.slice(0, 10),
      specificFileChecks: fileChecks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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