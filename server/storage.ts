import { users, flyers, subscriptions, 
  type User, type InsertUser, type Flyer, type InsertFlyer, 
  type Subscription, type InsertSubscription } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import { log } from "./vite";
import createMemoryStore from "memorystore";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User Management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateStripeCustomerId(userId: string, customerId: string): Promise<User>;
  
  // Flyer Management
  createFlyer(flyer: InsertFlyer): Promise<Flyer>;
  getUserFlyers(userId: string): Promise<Flyer[]>;
  getFlyer(id: string): Promise<Flyer | undefined>;
  
  // Subscription Management
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getUserSubscription(userId: string): Promise<Subscription | undefined>;
  updateUserStripeInfo(userId: string, info: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User>;
  
  // Session store for auth
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Use in-memory session store instead of PostgreSQL to avoid WebSocket issues
    const MemoryStore = createMemoryStore(session);
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    log("Using memory store for sessions", "storage");
  }

  async getUser(id: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: eq(users.id, id)
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: eq(users.email, email)
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  async updateUserStripeInfo(userId: string, info: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User> {
    const [updatedUser] = await db.update(users)
      .set({ 
        stripeCustomerId: info.stripeCustomerId,
        subscriptionStatus: 'active'
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  }
  
  // Flyer Management
  async createFlyer(flyer: InsertFlyer): Promise<Flyer> {
    const [newFlyer] = await db.insert(flyers).values(flyer).returning();
    return newFlyer;
  }
  
  async getUserFlyers(userId: string): Promise<Flyer[]> {
    return db.query.flyers.findMany({
      where: eq(flyers.userId, userId),
      orderBy: (flyers, { desc }) => [desc(flyers.createdAt)]
    });
  }
  
  async getFlyer(id: string): Promise<Flyer | undefined> {
    return db.query.flyers.findFirst({
      where: eq(flyers.id, id)
    });
  }
  
  // Subscription Management
  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }
  
  async getSubscription(id: string): Promise<Subscription | undefined> {
    return db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, id)
    });
  }
  
  async getUserSubscription(userId: string): Promise<Subscription | undefined> {
    return db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId)
    });
  }
}

export const storage = new DatabaseStorage();
