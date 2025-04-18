import { 
  users, userCredits, designConfigs, userCreations, brandKits,
  type User, type InsertUser, 
  type UserCredits, type InsertUserCredits,
  type DesignConfig, type InsertDesignConfig,
  type UserCreation, type InsertUserCreation, 
  type BrandKit, type InsertBrandKit
} from "@shared/schema";

// Storage interface with CRUD methods for users, credits, design configurations, and user creations
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: number, newBalance: number): Promise<User | undefined>;
  
  // Credits management
  addCreditsTransaction(creditTx: InsertUserCredits): Promise<UserCredits>;
  getUserCreditsHistory(userId: number): Promise<UserCredits[]>;
  
  // Design configuration
  getDesignConfigs(userId: number): Promise<DesignConfig[]>;
  getDesignConfig(id: number): Promise<DesignConfig | undefined>;
  createDesignConfig(config: InsertDesignConfig): Promise<DesignConfig>;
  updateDesignConfig(id: number, updates: Partial<InsertDesignConfig>): Promise<DesignConfig | undefined>;
  
  // Brand Kit management
  getBrandKits(userId: number): Promise<BrandKit[]>;
  getBrandKit(id: number, userId?: number): Promise<BrandKit | undefined>;
  getActiveBrandKit(userId: number): Promise<BrandKit | undefined>;
  createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit>;
  updateBrandKit(id: number, updates: Partial<InsertBrandKit>, userId?: number): Promise<BrandKit | undefined>;
  deleteBrandKit(id: number, userId?: number): Promise<boolean>;
  
  // User Creations - Erweiterte Methoden mit Benutzerfilterung
  getUserCreations(userId: number): Promise<UserCreation[]>;
  getUserCreation(id: number, userId?: number): Promise<UserCreation | undefined>;
  createUserCreation(creation: InsertUserCreation): Promise<UserCreation>;
  updateUserCreation(id: number, updates: Partial<InsertUserCreation>, userId?: number): Promise<UserCreation | undefined>;
  deleteUserCreation(id: number, userId?: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private userCreditsMap: Map<number, UserCredits>;
  private designConfigsMap: Map<number, DesignConfig>;
  private userCreationsMap: Map<number, UserCreation>;
  private brandKitsMap: Map<number, BrandKit>;
  private userIdCounter: number;
  private creditsTxIdCounter: number;
  private configIdCounter: number;
  private creationIdCounter: number;
  private brandKitIdCounter: number;

  constructor() {
    this.usersMap = new Map();
    this.userCreditsMap = new Map();
    this.designConfigsMap = new Map();
    this.userCreationsMap = new Map();
    this.userIdCounter = 1;
    this.creditsTxIdCounter = 1;
    this.configIdCounter = 1;
    this.creationIdCounter = 1;
    
    // Create default design config
    this.createDesignConfig({
      user_id: 0, // System user
      name: 'Default Config',
      num_variations: 3,
      credits_per_design: 1,
      active: true,
    });
    
    // Create a test user
    this.createUser({
      username: 'test_user',
      password: 'password',
      firebase_uid: 'test-user-123',
      email: 'test@example.com',
      display_name: 'Test User',
      photo_url: null,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.firebase_uid === firebaseUid,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    // Default values for a new user
    const user: User = { 
      ...insertUser, 
      id,
      credits_balance: 10, // Default starting credits
      is_premium: false,
      created_at: now,
      firebase_uid: insertUser.firebase_uid || null,
      email: insertUser.email || null,
      display_name: insertUser.display_name || null,
      photo_url: insertUser.photo_url || null
    };
    
    this.usersMap.set(id, user);
    
    // Add initial credits transaction
    this.addCreditsTransaction({
      user_id: id,
      amount: 10,
      transaction_type: 'initial',
      description: 'Initial credits allocation'
    });
    
    return user;
  }
  
  async updateUserCredits(userId: number, newBalance: number): Promise<User | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      credits_balance: newBalance
    };
    
    this.usersMap.set(userId, updatedUser);
    return updatedUser;
  }
  
  // Credits methods
  async addCreditsTransaction(creditTx: InsertUserCredits): Promise<UserCredits> {
    const id = this.creditsTxIdCounter++;
    const now = new Date();
    
    const transaction: UserCredits = {
      ...creditTx,
      id,
      created_at: now,
      description: creditTx.description || null
    };
    
    this.userCreditsMap.set(id, transaction);
    
    // Update user's credit balance if this is not the initial transaction
    // (initial is already handled in createUser)
    if (creditTx.transaction_type !== 'initial') {
      const user = await this.getUser(creditTx.user_id);
      if (user) {
        let newBalance = user.credits_balance;
        
        if (creditTx.transaction_type === 'add') {
          newBalance += creditTx.amount;
        } else if (creditTx.transaction_type === 'subtract') {
          newBalance -= creditTx.amount;
        }
        
        // Ensure balance doesn't go negative
        newBalance = Math.max(0, newBalance);
        
        await this.updateUserCredits(user.id, newBalance);
      }
    }
    
    return transaction;
  }
  
  async getUserCreditsHistory(userId: number): Promise<UserCredits[]> {
    const history = Array.from(this.userCreditsMap.values()).filter(
      tx => tx.user_id === userId
    );
    
    // Sort by creation date, newest first
    return history.sort((a, b) => {
      const dateA = a.created_at instanceof Date ? a.created_at : new Date();
      const dateB = b.created_at instanceof Date ? b.created_at : new Date();
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  // Design config methods
  async getDesignConfigs(userId: number): Promise<DesignConfig[]> {
    // Return both user-specific and system configs (user_id = 0)
    return Array.from(this.designConfigsMap.values()).filter(
      config => config.user_id === userId || config.user_id === 0
    );
  }
  
  async getDesignConfig(id: number): Promise<DesignConfig | undefined> {
    return this.designConfigsMap.get(id);
  }
  
  async createDesignConfig(config: InsertDesignConfig): Promise<DesignConfig> {
    const id = this.configIdCounter++;
    const now = new Date();
    
    const designConfig: DesignConfig = {
      id,
      user_id: config.user_id,
      name: config.name,
      num_variations: config.num_variations ?? 3,
      credits_per_design: config.credits_per_design ?? 1,
      active: config.active ?? true,
      created_at: now
    };
    
    this.designConfigsMap.set(id, designConfig);
    return designConfig;
  }
  
  async updateDesignConfig(
    id: number, 
    updates: Partial<InsertDesignConfig>
  ): Promise<DesignConfig | undefined> {
    const config = await this.getDesignConfig(id);
    if (!config) return undefined;
    
    const updatedConfig = {
      ...config,
      ...updates
    };
    
    this.designConfigsMap.set(id, updatedConfig);
    return updatedConfig;
  }

  // User Creations methods
  async getUserCreations(userId: number): Promise<UserCreation[]> {
    // Get all creations for a user
    const creations = Array.from(this.userCreationsMap.values()).filter(
      creation => creation.user_id === userId
    );
    
    // Sort by creation date, newest first
    return creations.sort((a, b) => {
      const dateA = a.created_at instanceof Date ? a.created_at : new Date();
      const dateB = b.created_at instanceof Date ? b.created_at : new Date();
      return dateB.getTime() - dateA.getTime();
    });
  }
  
  async getUserCreation(id: number, userId?: number): Promise<UserCreation | undefined> {
    // Get the creation by ID
    const creation = this.userCreationsMap.get(id);
    
    // If userId is provided, strictly enforce user-based privacy
    if (creation && userId !== undefined) {
      // Only return if it belongs to the specified user
      return creation.user_id === userId ? creation : undefined;
    }
    
    // Otherwise just return the creation (API layer will do permission check)
    return creation;
  }
  
  async createUserCreation(creation: InsertUserCreation): Promise<UserCreation> {
    const id = this.creationIdCounter++;
    const now = new Date();
    
    const userCreation: UserCreation = {
      id,
      user_id: creation.user_id,
      name: creation.name,
      imageUrl: creation.imageUrl,
      headline: creation.headline || null,
      content: creation.content || null,
      stylePrompt: creation.stylePrompt || null,
      template: creation.template || null,
      metadata: creation.metadata || null,
      favorite: creation.favorite ?? false,
      created_at: now,
      heading_font: creation.heading_font || null,
      body_font: creation.body_font || null
    };
    
    this.userCreationsMap.set(id, userCreation);
    return userCreation;
  }
  
  async updateUserCreation(
    id: number, 
    updates: Partial<InsertUserCreation>,
    userId?: number
  ): Promise<UserCreation | undefined> {
    // Get the creation with optional user filtering
    const creation = await this.getUserCreation(id, userId);
    
    // If no creation found or userId provided and doesn't match, return undefined
    if (!creation) return undefined;
    
    // Create updated creation (ensuring we don't change the user_id to a different user)
    const updatedCreation = {
      ...creation,
      ...updates,
      // Ensure user_id can't be changed to a different user's ID
      user_id: creation.user_id
    };
    
    this.userCreationsMap.set(id, updatedCreation);
    return updatedCreation;
  }
  
  async deleteUserCreation(id: number, userId?: number): Promise<boolean> {
    // Get the creation first, with optional user filtering
    const creation = await this.getUserCreation(id, userId);
    
    // If no creation or userId is provided and doesn't match, return false
    if (!creation) return false;
    
    // Otherwise delete the creation
    this.userCreationsMap.delete(id);
    return true;
  }
}

import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebase_uid, firebaseUid));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserCredits(userId: number, newBalance: number): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ credits_balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser || undefined;
  }

  // Credits management
  async addCreditsTransaction(creditTx: InsertUserCredits): Promise<UserCredits> {
    const [transaction] = await db
      .insert(userCredits)
      .values(creditTx)
      .returning();
    return transaction;
  }

  async getUserCreditsHistory(userId: number): Promise<UserCredits[]> {
    return db
      .select()
      .from(userCredits)
      .where(eq(userCredits.user_id, userId))
      .orderBy(desc(userCredits.created_at));
  }

  // Design configuration
  async getDesignConfigs(userId: number): Promise<DesignConfig[]> {
    // If userId is 0, we're looking for system configs
    if (userId === 0) {
      // For system configs, try to get user_id = 0 first, if none exist, get all configs
      const systemConfigs = await db
        .select()
        .from(designConfigs)
        .where(eq(designConfigs.user_id, 0));
      
      if (systemConfigs.length > 0) {
        return systemConfigs;
      }
      
      // Fallback to any config if none with user_id = 0 exist
      return db
        .select()
        .from(designConfigs)
        .limit(5);
    }
    
    // For normal users, get their configs and optionally system configs
    return db
      .select()
      .from(designConfigs)
      .where(eq(designConfigs.user_id, userId));
  }

  async getDesignConfig(id: number): Promise<DesignConfig | undefined> {
    const [config] = await db
      .select()
      .from(designConfigs)
      .where(eq(designConfigs.id, id));
    return config || undefined;
  }

  async createDesignConfig(config: InsertDesignConfig): Promise<DesignConfig> {
    const [designConfig] = await db
      .insert(designConfigs)
      .values(config)
      .returning();
    return designConfig;
  }

  async updateDesignConfig(
    id: number,
    updates: Partial<InsertDesignConfig>
  ): Promise<DesignConfig | undefined> {
    const [updatedConfig] = await db
      .update(designConfigs)
      .set(updates)
      .where(eq(designConfigs.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  // User Creations
  async getUserCreations(userId: number): Promise<UserCreation[]> {
    return db
      .select()
      .from(userCreations)
      .where(eq(userCreations.user_id, userId))
      .orderBy(desc(userCreations.created_at));
  }

  async getUserCreation(id: number, userId?: number): Promise<UserCreation | undefined> {
    let query = db.select().from(userCreations).where(eq(userCreations.id, id));
    
    if (userId !== undefined) {
      // Create a new query with the additional condition
      const results = await db
        .select()
        .from(userCreations)
        .where(and(
          eq(userCreations.id, id),
          eq(userCreations.user_id, userId)
        ));
      return results[0] || undefined;
    } else {
      const results = await query;
      return results[0] || undefined;
    }
  }

  async createUserCreation(creation: InsertUserCreation): Promise<UserCreation> {
    const [userCreation] = await db
      .insert(userCreations)
      .values(creation)
      .returning();
    return userCreation;
  }

  async updateUserCreation(
    id: number,
    updates: Partial<InsertUserCreation>,
    userId?: number
  ): Promise<UserCreation | undefined> {
    if (userId !== undefined) {
      const [updatedCreation] = await db
        .update(userCreations)
        .set(updates)
        .where(and(
          eq(userCreations.id, id),
          eq(userCreations.user_id, userId)
        ))
        .returning();
      return updatedCreation || undefined;
    } else {
      const [updatedCreation] = await db
        .update(userCreations)
        .set(updates)
        .where(eq(userCreations.id, id))
        .returning();
      return updatedCreation || undefined;
    }
  }

  async deleteUserCreation(id: number, userId?: number): Promise<boolean> {
    if (userId !== undefined) {
      const result = await db
        .delete(userCreations)
        .where(and(
          eq(userCreations.id, id),
          eq(userCreations.user_id, userId)
        ))
        .returning({ id: userCreations.id });
      return result.length > 0;
    } else {
      const result = await db
        .delete(userCreations)
        .where(eq(userCreations.id, id))
        .returning({ id: userCreations.id });
      return result.length > 0;
    }
  }
}

// Create and initialize the database storage
export const storage = new DatabaseStorage();
