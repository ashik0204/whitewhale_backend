// Import the database connection
import { connectToDatabase } from './config/database.js';

// ...existing code...

// Connect to MongoDB before starting the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Start the Express server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// ...existing code...