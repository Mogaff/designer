import { db } from './server/db.js';
import * as schema from './shared/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating database tables...');

  // Create users table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" SERIAL PRIMARY KEY,
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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_credits" (
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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "design_configs" (
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
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_creations" (
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
    await db.execute(sql`
      INSERT INTO "users" ("username", "password", "firebase_uid", "email", "display_name")
      VALUES ('test_user', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'test-user-123', 'test@example.com', 'Test User')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('Created default user');

    // Create default design config
    await db.execute(sql`
      INSERT INTO "design_configs" ("user_id", "name", "num_variations", "credits_per_design", "active")
      VALUES (1, 'Default Config', 3, 1, true)
      ON CONFLICT DO NOTHING
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