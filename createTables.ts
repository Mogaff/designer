import { pool } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Setting up database...');

  // First drop existing tables if they exist (in reverse order of dependencies)
  try {
    await pool.query(`DROP TABLE IF EXISTS "user_creations" CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS "design_configs" CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS "user_credits" CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    console.log('Dropped existing tables');
  } catch (error) {
    console.error('Error dropping tables:', error);
  }

  // Create users table
  await pool.query(`
    CREATE TABLE "users" (
      "id" INTEGER PRIMARY KEY,
      "username" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "firebase_uid" TEXT UNIQUE,
      "email" TEXT,
      "display_name" TEXT,
      "photo_url" TEXT,
      "created_at" TIMESTAMP DEFAULT NOW(),
      "credits_balance" INTEGER DEFAULT 10 NOT NULL,
      "is_premium" BOOLEAN DEFAULT false NOT NULL
    )
  `);
  console.log('Created users table');

  // Create user_credits table
  await pool.query(`
    CREATE TABLE "user_credits" (
      "id" SERIAL PRIMARY KEY,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "amount" INTEGER NOT NULL,
      "transaction_type" TEXT NOT NULL,
      "description" TEXT,
      "created_at" TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Created user_credits table');

  // Create design_configs table
  await pool.query(`
    CREATE TABLE "design_configs" (
      "id" SERIAL PRIMARY KEY,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "name" TEXT NOT NULL,
      "num_variations" INTEGER DEFAULT 3 NOT NULL,
      "credits_per_design" INTEGER DEFAULT 1 NOT NULL,
      "active" BOOLEAN DEFAULT true NOT NULL,
      "created_at" TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('Created design_configs table');

  // Create user_creations table
  await pool.query(`
    CREATE TABLE "user_creations" (
      "id" SERIAL PRIMARY KEY,
      "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
      "name" TEXT NOT NULL,
      "image_url" TEXT NOT NULL,
      "headline" TEXT,
      "content" TEXT,
      "style_prompt" TEXT,
      "template" TEXT,
      "metadata" JSONB,
      "created_at" TIMESTAMP DEFAULT NOW(),
      "favorite" BOOLEAN DEFAULT false NOT NULL,
      "heading_font" TEXT,
      "body_font" TEXT
    )
  `);
  console.log('Created user_creations table');

  // Create a default user
  try {
    // Create system user (id = 0)
    await pool.query(`
      INSERT INTO "users" ("id", "username", "password", "firebase_uid", "email", "display_name")
      VALUES (0, 'system', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'system-user', 'system@example.com', 'System')
    `);
    
    // Create regular test user with ID 1
    await pool.query(`
      INSERT INTO "users" ("id", "username", "password", "firebase_uid", "email", "display_name")
      VALUES (1, 'test_user', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'test-user-123', 'test@example.com', 'Test User')
    `);
    console.log('Created default user');

    // Create default design config
    // Create a system design config (user_id = 0)
    await pool.query(`
      INSERT INTO "design_configs" ("user_id", "name", "num_variations", "credits_per_design", "active")
      VALUES (0, 'System Default', 3, 1, true)
    `);
    
    // Also create a user-specific design config
    await pool.query(`
      INSERT INTO "design_configs" ("user_id", "name", "num_variations", "credits_per_design", "active")
      VALUES (1, 'Default Config', 3, 1, true)
    `);
    console.log('Created default design config');
  } catch (error) {
    console.error('Error creating default data:', error);
  }

  console.log('Database setup complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Error setting up database:', error);
  process.exit(1);
});