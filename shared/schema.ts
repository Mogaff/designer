import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firebase_uid: text("firebase_uid").unique(),
  replit_id: text("replit_id").unique(), // Added for Replit Auth
  email: text("email"),
  display_name: text("display_name"),
  photo_url: text("photo_url"),
  first_name: text("first_name"),
  last_name: text("last_name"),
  bio: text("bio"),
  created_at: timestamp("created_at").defaultNow(),
  credits_balance: integer("credits_balance").default(10).notNull(),
  is_premium: boolean("is_premium").default(false).notNull(),
});

export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  transaction_type: text("transaction_type").notNull(), // "add", "subtract", "initial"
  description: text("description"),
  created_at: timestamp("created_at").defaultNow(),
});

export const designConfigs = pgTable("design_configs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  num_variations: integer("num_variations").default(3).notNull(),
  credits_per_design: integer("credits_per_design").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const brandKits = pgTable("brand_kits", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  primary_color: text("primary_color"),
  secondary_color: text("secondary_color"),
  accent_color: text("accent_color"),
  logo_url: text("logo_url"),
  heading_font: text("heading_font"),
  body_font: text("body_font"),
  brand_voice: text("brand_voice"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  is_active: boolean("is_active").default(true).notNull(),
});

export const userCreations = pgTable("user_creations", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  headline: text("headline"),
  content: text("content"),
  stylePrompt: text("style_prompt"),
  template: text("template"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
  favorite: boolean("favorite").default(false).notNull(),
  heading_font: text("heading_font"),
  body_font: text("body_font"),
});

export const competitorAds = pgTable("competitor_ads", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull(), // "Meta" or "Google"
  brand: text("brand").notNull(),
  headline: text("headline"),
  body: text("body"),
  image_url: text("image_url"),
  thumbnail_url: text("thumbnail_url"),
  cta: text("cta"),
  start_date: date("start_date"),
  platform_details: text("platform_details"),
  style_description: text("style_description"),
  ad_id: text("ad_id"),
  page_id: text("page_id"),
  snapshot_url: text("snapshot_url"),
  created_at: timestamp("created_at").defaultNow(),
  fetched_by_user_id: integer("fetched_by_user_id").references(() => users.id),
  industry: text("industry"),
  tags: text("tags").array(),
  is_active: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata"),
});

export const adSearchQueries = pgTable("ad_search_queries", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  query_type: text("query_type").notNull(), // 'brand', 'keyword', 'industry' 
  query_text: text("query_text").notNull(),
  platforms: text("platforms").array(), // ['meta', 'google']
  created_at: timestamp("created_at").defaultNow(),
  results_count: integer("results_count").default(0),
  status: text("status").default("completed"), // 'completed', 'failed', 'in_progress'
  error_message: text("error_message"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firebase_uid: true,
  replit_id: true,
  email: true,
  display_name: true,
  photo_url: true,
  first_name: true,
  last_name: true,
  bio: true,
});

export const insertUserCreditsSchema = createInsertSchema(userCredits).pick({
  user_id: true,
  amount: true,
  transaction_type: true,
  description: true,
});

export const insertDesignConfigSchema = createInsertSchema(designConfigs).pick({
  user_id: true,
  name: true,
  num_variations: true,
  credits_per_design: true,
  active: true,
});

export const insertUserCreationSchema = createInsertSchema(userCreations).pick({
  user_id: true,
  name: true,
  imageUrl: true,
  headline: true,
  content: true,
  stylePrompt: true,
  template: true,
  metadata: true,
  favorite: true,
  heading_font: true,
  body_font: true,
});

export const insertBrandKitSchema = createInsertSchema(brandKits).pick({
  user_id: true,
  name: true,
  primary_color: true,
  secondary_color: true,
  accent_color: true,
  logo_url: true,
  heading_font: true,
  body_font: true,
  brand_voice: true,
  is_active: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
export type UserCredits = typeof userCredits.$inferSelect;

export type InsertDesignConfig = z.infer<typeof insertDesignConfigSchema>;
export type DesignConfig = typeof designConfigs.$inferSelect;

export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKits.$inferSelect;

export type InsertUserCreation = z.infer<typeof insertUserCreationSchema>;
export type UserCreation = typeof userCreations.$inferSelect;

export const insertCompetitorAdSchema = createInsertSchema(competitorAds).pick({
  platform: true,
  brand: true,
  headline: true,
  body: true,
  image_url: true,
  thumbnail_url: true,
  cta: true,
  start_date: true,
  platform_details: true,
  style_description: true,
  ad_id: true,
  page_id: true,
  snapshot_url: true,
  fetched_by_user_id: true,
  industry: true,
  tags: true,
  is_active: true,
  metadata: true,
});
export type InsertCompetitorAd = z.infer<typeof insertCompetitorAdSchema>;
export type CompetitorAd = typeof competitorAds.$inferSelect;

export const insertAdSearchQuerySchema = createInsertSchema(adSearchQueries).pick({
  user_id: true,
  query_type: true,
  query_text: true,
  platforms: true,
  results_count: true,
  status: true,
  error_message: true,
});
export type InsertAdSearchQuery = z.infer<typeof insertAdSearchQuerySchema>;
export type AdSearchQuery = typeof adSearchQueries.$inferSelect;
