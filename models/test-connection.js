import { connectToDatabase } from '../config/database.js';

const testConnection = async () => {
  try {
    const connection = await connectToDatabase();
    console.log('✅ Successfully connected to MongoDB Atlas');
    console.log(`Connected to database: ${connection.db.databaseName}`);
    
    // List collections
    const collections = await connection.db.listCollections().toArray();
    console.log('\nAvailable collections:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Close connection
    await connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
};

testConnection();
