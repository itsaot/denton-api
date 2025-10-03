const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // First, verify the connection string is being read correctly
    console.log('Attempting to connect with URI:', process.env.MONGO_URI);
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
       useNewUrlParser: true,
       useUnifiedTopology: true, 
       dbName: 'Denton'
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;