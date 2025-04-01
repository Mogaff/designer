// Credit transaction types
export type TransactionType = 'add' | 'subtract' | 'initial';

// Credit transaction
export interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  transaction_type: TransactionType;
  description: string | null;
  created_at: string | Date | null;
}

// Credit balance information
export interface CreditInfo {
  balance: number;
  is_premium: boolean;
  history: CreditTransaction[];
}

// Response from the /api/credits endpoint
export interface CreditsResponse {
  balance: number;
  is_premium: boolean;
  history: CreditTransaction[];
}

// Badge variants including 'success'
export type ExtendedBadgeVariant = 
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success';