import { 
  users, userCredits, designConfigs, userCreations, brandKits, socialAccounts, socialPosts,
  type User, type InsertUser, 
  type UserCredits, type InsertUserCredits,
  type DesignConfig, type InsertDesignConfig,
  type UserCreation, type InsertUserCreation, 
  type BrandKit, type InsertBrandKit,
  type SocialAccount, type InsertSocialAccount,
  type SocialPost, type InsertSocialPost
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

// Storage interface
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserCredits(userId: number, newBalance: number): Promise<User | undefined>;
  
  addCreditsTransaction(creditTx: InsertUserCredits): Promise<UserCredits>;
  getUserCreditsHistory(userId: number): Promise<UserCredits[]>;
  
  getDesignConfigs(userId: number): Promise<DesignConfig[]>;
  getDesignConfig(id: number): Promise<DesignConfig | undefined>;
  createDesignConfig(config: InsertDesignConfig): Promise<DesignConfig>;
  updateDesignConfig(id: number, updates: Partial<InsertDesignConfig>): Promise<DesignConfig | undefined>;
  
  getBrandKits(userId: number): Promise<BrandKit[]>;
  getBrandKit(id: number, userId?: number): Promise<BrandKit | undefined>;
  getActiveBrandKit(userId: number): Promise<BrandKit | undefined>;
  createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit>;
  updateBrandKit(id: number, updates: Partial<InsertBrandKit>, userId?: number): Promise<BrandKit | undefined>;
  deleteBrandKit(id: number, userId?: number): Promise<boolean>;
  
  getUserCreations(userId: number): Promise<UserCreation[]>;
  getUserCreation(id: number, userId?: number): Promise<UserCreation | undefined>;
  createUserCreation(creation: InsertUserCreation): Promise<UserCreation>;
  updateUserCreation(id: number, updates: Partial<InsertUserCreation>, userId?: number): Promise<UserCreation | undefined>;
  deleteUserCreation(id: number, userId?: number): Promise<boolean>;
  
  getSocialAccounts(userId: number): Promise<SocialAccount[]>;
  createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount>;
  getSocialPosts(userId: number): Promise<SocialPost[]>;
  createSocialPost(post: InsertSocialPost): Promise<SocialPost>;
  deleteSocialPost(id: number, userId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebase_uid, firebaseUid));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserCredits(userId: number, newBalance: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ credits_balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async addCreditsTransaction(creditTx: InsertUserCredits): Promise<UserCredits> {
    const [transaction] = await db.insert(userCredits).values(creditTx).returning();
    return transaction;
  }

  async getUserCreditsHistory(userId: number): Promise<UserCredits[]> {
    return await db.select().from(userCredits).where(eq(userCredits.user_id, userId)).orderBy(desc(userCredits.created_at));
  }

  async getDesignConfigs(userId: number): Promise<DesignConfig[]> { return []; }
  async getDesignConfig(id: number): Promise<DesignConfig | undefined> { return undefined; }
  async createDesignConfig(config: InsertDesignConfig): Promise<DesignConfig> { throw new Error("Not implemented"); }
  async updateDesignConfig(id: number, updates: Partial<InsertDesignConfig>): Promise<DesignConfig | undefined> { return undefined; }
  
  async getBrandKits(userId: number): Promise<BrandKit[]> {
    return await db.select().from(brandKits).where(eq(brandKits.user_id, userId));
  }
  
  async getBrandKit(id: number, userId?: number): Promise<BrandKit | undefined> {
    const [brandKit] = await db.select().from(brandKits).where(eq(brandKits.id, id));
    return brandKit || undefined;
  }
  
  async getActiveBrandKit(userId: number): Promise<BrandKit | undefined> {
    const [brandKit] = await db.select().from(brandKits)
      .where(and(eq(brandKits.user_id, userId), eq(brandKits.is_active, true)));
    return brandKit || undefined;
  }
  
  async createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit> {
    const [created] = await db.insert(brandKits).values(brandKit).returning();
    return created;
  }
  
  async updateBrandKit(id: number, updates: Partial<InsertBrandKit>, userId?: number): Promise<BrandKit | undefined> {
    const [updated] = await db.update(brandKits).set(updates).where(eq(brandKits.id, id)).returning();
    return updated || undefined;
  }
  
  async deleteBrandKit(id: number, userId?: number): Promise<boolean> {
    const result = await db.delete(brandKits).where(eq(brandKits.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserCreations(userId: number): Promise<UserCreation[]> {
    return await db.select().from(userCreations).where(eq(userCreations.user_id, userId)).orderBy(desc(userCreations.created_at));
  }
  
  async getUserCreation(id: number, userId?: number): Promise<UserCreation | undefined> {
    const [creation] = await db.select().from(userCreations).where(eq(userCreations.id, id));
    return creation || undefined;
  }
  
  async createUserCreation(creation: InsertUserCreation): Promise<UserCreation> {
    const [created] = await db.insert(userCreations).values(creation).returning();
    return created;
  }
  
  async updateUserCreation(id: number, updates: Partial<InsertUserCreation>, userId?: number): Promise<UserCreation | undefined> {
    const [updated] = await db.update(userCreations).set(updates).where(eq(userCreations.id, id)).returning();
    return updated || undefined;
  }
  
  async deleteUserCreation(id: number, userId?: number): Promise<boolean> {
    const result = await db.delete(userCreations).where(eq(userCreations.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getSocialAccounts(userId: number): Promise<SocialAccount[]> { return []; }
  async createSocialAccount(account: InsertSocialAccount): Promise<SocialAccount> { throw new Error("Not implemented"); }
  async getSocialPosts(userId: number): Promise<SocialPost[]> { return []; }
  async createSocialPost(post: InsertSocialPost): Promise<SocialPost> { throw new Error("Not implemented"); }
  async deleteSocialPost(id: number, userId: number): Promise<boolean> { return false; }
}

export const storage = new DatabaseStorage();