import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running database migration...');

  try {
    // Add replit_id column to users table
    console.log('Adding replit_id column to users table...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS replit_id TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT
    `);

    // Create sessions table for Replit Auth
    console.log('Creating sessions table for Replit Auth...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);

    // Add index on expire column
    console.log('Adding index on expire column in sessions table...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire)
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });