import { 
  users, userCredits, designConfigs,
  type User, type InsertUser, 
  type UserCredits, type InsertUserCredits,
  type DesignConfig, type InsertDesignConfig
} from "@shared/schema";

// Storage interface with CRUD methods for users, credits, and design configurations
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
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private userCreditsMap: Map<number, UserCredits>;
  private designConfigsMap: Map<number, DesignConfig>;
  private userIdCounter: number;
  private creditsTxIdCounter: number;
  private configIdCounter: number;

  constructor() {
    this.usersMap = new Map();
    this.userCreditsMap = new Map();
    this.designConfigsMap = new Map();
    this.userIdCounter = 1;
    this.creditsTxIdCounter = 1;
    this.configIdCounter = 1;
    
    // Create default design config
    this.createDesignConfig({
      user_id: 0, // System user
      name: 'Default Config',
      num_variations: 3,
      credits_per_design: 1,
      active: true,
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
}

export const storage = new MemStorage();
