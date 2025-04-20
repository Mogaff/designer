import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating database schema...');

  try {
    // Create users table
    console.log('Creating users table...');
    await db.execute(sql`
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
      )
    `);

    // Create user_credits table
    console.log('Creating user_credits table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_credits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create design_configs table
    console.log('Creating design_configs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS design_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        num_variations INTEGER DEFAULT 3 NOT NULL,
        credits_per_design INTEGER DEFAULT 1 NOT NULL,
        active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create brand_kits table
    console.log('Creating brand_kits table...');
    await db.execute(sql`
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
      )
    `);

    // Create user_creations table
    console.log('Creating user_creations table...');
    await db.execute(sql`
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
      )
    `);

    // Create system user (id = 0)
    console.log('Creating system user...');
    await db.execute(sql`
      INSERT INTO users (id, username, password, firebase_uid, email, display_name)
      VALUES (0, 'system', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'system-user', 'system@example.com', 'System')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Create test user (id = 1)
    console.log('Creating test user...');
    await db.execute(sql`
      INSERT INTO users (id, username, password, firebase_uid, email, display_name)
      VALUES (1, 'test_user', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'test-user-123', 'test@example.com', 'Test User')
      ON CONFLICT (id) DO NOTHING
    `);

    // Create a default design config for system user
    console.log('Creating default design config...');
    await db.execute(sql`
      INSERT INTO design_configs (user_id, name, num_variations, credits_per_design, active)
      VALUES (0, 'System Default', 3, 1, true)
      ON CONFLICT DO NOTHING
    `);

    console.log('Database schema created successfully!');
  } catch (error) {
    console.error('Error creating database schema:', error);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);