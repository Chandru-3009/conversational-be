import { MongoClient, Db } from 'mongodb';
import { Config } from './config';

let client: MongoClient;
let formfinchDb: Db;
// let chatagentDb: Db;

export const connectDatabase = async (): Promise<void> => {
  try {
    client = new MongoClient(Config.MONGODB_URI);
    await client.connect();
    formfinchDb = client.db(Config.DATABASE_NAME);
    // chatagentDb = client.db('chatagent');
    console.log('✅ Connected to MongoDB successfully');
    console.log('📊 Databases: formfinch');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    if (client) {
      await client.close();
      console.log('✅ Disconnected from MongoDB');
    }
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
};

export const getDatabase = (dbName: string = Config.DATABASE_NAME): Db => {
  if (dbName === Config.DATABASE_NAME) {
    if (!formfinchDb) {
      throw new Error('formfinch database not connected. Call connectDatabase() first.');
    }
    return formfinchDb;
   } //else if (dbName === 'chatagent') {
  //   if (!chatagentDb) {
  //     throw new Error('Chatagent database not connected. Call connectDatabase() first.');
  //   }
  //   return chatagentDb;
  // } 
   else {
    throw new Error(`Unknown database: ${dbName}`);
  }
};

export const getClient = (): MongoClient => {
  if (!client) {
    throw new Error('Database client not connected. Call connectDatabase() first.');
  }
  return client;
};

// Handle process termination
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
}); 