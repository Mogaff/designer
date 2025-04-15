import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firebase_uid: text("firebase_uid").unique(),
  email: text("email"),
  display_name: text("display_name"),
  photo_url: text("photo_url"),
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

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  firebase_uid: true,
  email: true,
  display_name: true,
  photo_url: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
export type UserCredits = typeof userCredits.$inferSelect;

export type InsertDesignConfig = z.infer<typeof insertDesignConfigSchema>;
export type DesignConfig = typeof designConfigs.$inferSelect;

export type InsertUserCreation = z.infer<typeof insertUserCreationSchema>;
export type UserCreation = typeof userCreations.$inferSelect;
