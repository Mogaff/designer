declare namespace API {
  // API Response for creations endpoint
  interface CreationsResponse {
    creations: import('../lib/types').GeneratedFlyer[];
  }
  
  // API Response for brand-kits endpoint
  interface BrandKitsResponse {
    brandKits: import('../lib/types').BrandKit[];
  }
  
  // API Response for brand-kits/active endpoint
  interface ActiveBrandKitResponse {
    brandKit: import('../lib/types').BrandKit;
  }
  
  // API Response for credits endpoint
  interface CreditsResponse {
    balance: number;
    is_premium: boolean;
    history: {
      id: number;
      amount: number;
      transaction_type: string;
      description: string;
      created_at: string;
    }[];
  }
}