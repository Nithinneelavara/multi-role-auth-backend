//models\connection.ts
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/mydb');
    console.log(' MongoDB connected');
  } catch (error) {
    console.error(' MongoDB connection error:', error);
    process.exit(1);
  }
};

