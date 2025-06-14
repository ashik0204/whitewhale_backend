import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Checks if necessary directories exist and creates them if they don't
 */
export const ensureDirectoriesExist = () => {
  // Paths relative to this file
  const rootDir = path.join(__dirname, '..', '..');
  const publicDir = path.join(rootDir, 'public');
  const uploadsDir = path.join(publicDir, 'uploads');

  const dirs = [
    { path: publicDir, name: 'Public directory' },
    { path: uploadsDir, name: 'Uploads directory' }
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir.path)) {
      try {
        fs.mkdirSync(dir.path, { recursive: true });
        console.log(`Created ${dir.name} at: ${dir.path}`);
      } catch (error) {
        console.error(`Failed to create ${dir.name}:`, error);
        throw error;
      }
    } else {
      console.log(`${dir.name} exists at: ${dir.path}`);
    }
  });

  return {
    rootDir,
    publicDir,
    uploadsDir
  };
};

/**
 * Lists all files in the uploads directory
 */
export const listUploadedFiles = () => {
  const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    return { error: 'Uploads directory does not exist', path: uploadsDir, files: [] };
  }
  
  try {
    const files = fs.readdirSync(uploadsDir);
    return {
      count: files.length,
      path: uploadsDir,
      files: files.map(file => ({
        name: file,
        path: path.join(uploadsDir, file),
        url: `/uploads/${file}`
      }))
    };
  } catch (error) {
    return { error: error.message, path: uploadsDir, files: [] };
  }
};
