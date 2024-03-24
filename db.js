import mongoose from 'mongoose';
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 15;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI; 

    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); 
  }
};

export default connectDB;
