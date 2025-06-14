import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Get MongoDB URI from environment variables or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/whitewhaling';

// Set up MongoDB connection options
const options = {
  // Using new MongoDB driver connection settings
  useNewUrlParser: true, // deprecated in newer versions but included for compatibility
  useUnifiedTopology: true, // deprecated in newer versions but included for compatibility
};

// Connection function
export const connectToDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB connection established successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Export the mongoose instance
export default mongoose;
