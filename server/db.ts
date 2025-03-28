import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { log } from './vite';
import * as schema from '../shared/schema';

// Initialize postgres client
const client = postgres(process.env.DATABASE_URL || '');

// Initialize drizzle with our client and schema
export const db = drizzle(client, { schema });

// Function to test the database connection
export async function testDatabaseConnection() {
  try {
    log('Testing database connection...', 'database');
    // Simple query to verify connection
    await client`SELECT NOW()`;
    log('Database connection successful', 'database');
    return true;
  } catch (error) {
    log(`Database connection failed: ${error}`, 'database');
    return false;
  }
}