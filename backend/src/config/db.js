import dns from 'dns';
import mongoose from 'mongoose';
import { env } from './env.js';

dns.setServers(['8.8.8.8', '8.8.4.4']);

function getMongoFallbackMessage(error) {
  const isSrvUri = env.mongoUri.startsWith('mongodb+srv://');
  const looksLikeSrvDnsFailure = /querySrv|ENOTFOUND|ECONNREFUSED|ETIMEOUT|ESERVFAIL/i.test(error.message);

  if (!isSrvUri || !looksLikeSrvDnsFailure) {
    return '';
  }

  return [
    'MongoDB Atlas SRV DNS lookup failed for your mongodb+srv:// URI.',
    'AskPDF already forced Node.js DNS to Google resolvers (8.8.8.8, 8.8.4.4), but this network still could not resolve the SRV record.',
    'In MongoDB Atlas, open Connect > Drivers and copy the non-SRV standard connection string option.',
    'Use this format in .env as MONGODB_URI=mongodb://host1:27017,host2:27017,host3:27017/dbname?ssl=true&replicaSet=...',
    'AskPDF supports both mongodb+srv:// and standard mongodb:// connection strings.'
  ].join('\n');
}

export async function connectMongo() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.mongoUri);
    console.log('\u2705 MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error(`\u274c MongoDB connection failed: ${error.message}`);

    const fallbackMessage = getMongoFallbackMessage(error);
    if (fallbackMessage) {
      console.error(fallbackMessage);
    }

    throw error;
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect();
}
