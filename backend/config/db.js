const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.includes('<username>') || mongoUri.trim() === '') {
    console.log('----------------------------------------------------');
    console.log('ℹ️  NOTE: MONGODB_URI is not configured in backend/.env');
    console.log('👉 To connect to your MongoDB Atlas cloud database:');
    console.log('   1. Create a cluster on https://cloud.mongodb.com');
    console.log('   2. Set MONGODB_URI in backend/.env');
    console.log('   Example: mongodb+srv://user:pass@cluster0.mongodb.net/codesprint?retryWrites=true&w=majority');
    console.log('🚀 Running with fallback in-memory database so all APIs remain fully functional!');
    console.log('----------------------------------------------------');
    return;
  }

  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 6000
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️  MongoDB Connection Warning: ${error.message}`);
    console.warn('👉 Operating in fallback mode so your local server continues running smoothly.');
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error('Error during MongoDB disconnect:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
