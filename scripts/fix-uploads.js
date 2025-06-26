/**
 * This script repairs the uploads directory structure.
 * It checks for uploads both in the old and new locations,
 * and ensures all files exist where they should.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path for current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const serverRoot = path.join(__dirname, '..');
const projectRoot = path.join(serverRoot, '..');

// Define old and new upload paths
const oldUploadsDir = path.join(projectRoot, 'public', 'uploads');
const newUploadsDir = path.join(serverRoot, 'public', 'uploads');

console.log('Starting upload directory repair tool...');

// Make sure the new directory exists
if (!fs.existsSync(path.join(serverRoot, 'public'))) {
  console.log('Creating server/public directory...');
  fs.mkdirSync(path.join(serverRoot, 'public'), { recursive: true });
}

if (!fs.existsSync(newUploadsDir)) {
  console.log('Creating server/public/uploads directory...');
  fs.mkdirSync(newUploadsDir, { recursive: true });
}

// Function to check for uploads and copy missing ones
const repairUploads = () => {
  console.log('Checking for missing uploads...');
  
  // Check if old uploads dir exists
  if (!fs.existsSync(oldUploadsDir)) {
    console.log('Old uploads directory does not exist at:', oldUploadsDir);
    return;
  }
  
  try {
    // List all files in old directory
    const files = fs.readdirSync(oldUploadsDir);
    console.log(`Found ${files.length} files in old uploads directory`);
    
    let copied = 0;
    
    // Copy each file that doesn't exist in new location
    for (const file of files) {
      const sourcePath = path.join(oldUploadsDir, file);
      const destPath = path.join(newUploadsDir, file);
      
      // Only copy regular files, not directories
      const stats = fs.statSync(sourcePath);
      if (!stats.isFile()) continue;
      
      if (!fs.existsSync(destPath)) {
        console.log(`Copying ${file}...`);
        fs.copyFileSync(sourcePath, destPath);
        copied++;
      }
    }
    
    console.log(`Repair complete! Copied ${copied} files.`);
    console.log(`New uploads directory now contains ${fs.readdirSync(newUploadsDir).length} files.`);
    
  } catch (err) {
    console.error('Error repairing uploads:', err);
  }
};

// Run the repair
repairUploads();

// List all files in the new uploads directory after repair
console.log('\nCurrent files in server/public/uploads:');
if (fs.existsSync(newUploadsDir)) {
  const files = fs.readdirSync(newUploadsDir);
  files.forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });
} else {
  console.log('Directory does not exist!');
}
