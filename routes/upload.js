import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isAuthenticated } from '../middleware/auth.js';

// Get directory path for current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configure file filter to only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // limit to 5MB
  }
});

// Add function to ensure we're returning consistent paths
const ensureProperPath = (filename) => {
  // Always return a path starting with /uploads/
  if (!filename) return '';
  
  if (filename.startsWith('/uploads/')) {
    return filename;
  }
  
  if (filename.includes('/uploads/')) {
    return '/uploads/' + filename.split('/uploads/')[1];
  }
  
  return `/uploads/${filename}`;
};

router.post('/', isAuthenticated, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'Please upload an image file' });
    }

    // Get the proper path for database storage
    const relativePath = ensureProperPath(req.file.filename);
    
    console.log('File uploaded successfully:');
    console.log('- Original name:', req.file.originalname);
    console.log('- Saved as:', req.file.filename);
    console.log('- Relative path:', relativePath);
    console.log('- Full path:', req.file.path);
    console.log('- File exists check:', fs.existsSync(req.file.path));

    // Success response with BOTH relative path and filename
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: relativePath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).send({ message: 'Error uploading image' });
  }
});

// Debug route to check if file exists
router.get('/check/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.json({
      exists: true,
      filename: req.params.filename,
      size: stats.size,
      path: filePath
    });
  } else {
    res.json({
      exists: false,
      filename: req.params.filename,
      checkedPath: filePath
    });
  }
});

// Debug route to list all uploaded files
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      count: files.length,
      files: files.map(filename => ({
        name: filename,
        path: `/uploads/${filename}`,
        fullPath: path.join(uploadsDir, filename)
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error listing files', error: error.message });
  }
});

export default router;
