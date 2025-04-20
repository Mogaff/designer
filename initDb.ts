import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './shared/schema';

// Set WebSocket constructor
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('Connecting to database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool, schema });

  console.log('Creating database schema...');
  
  try {
    // Create tables based on schema
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        firebase_uid TEXT UNIQUE,
        email TEXT,
        display_name TEXT,
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        credits_balance INTEGER DEFAULT 10 NOT NULL,
        is_premium BOOLEAN DEFAULT FALSE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_credits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS design_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        num_variations INTEGER DEFAULT 3 NOT NULL,
        credits_per_design INTEGER DEFAULT 1 NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS brand_kits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        primary_color TEXT,
        secondary_color TEXT,
        accent_color TEXT,
        logo_url TEXT,
        heading_font TEXT,
        body_font TEXT,
        brand_voice TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_creations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        headline TEXT,
        content TEXT,
        style_prompt TEXT,
        template TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        favorite BOOLEAN DEFAULT FALSE NOT NULL,
        heading_font TEXT,
        body_font TEXT
      );
    `);

    console.log('Database schema created successfully!');
  } catch (error) {
    console.error('Error creating database schema:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);