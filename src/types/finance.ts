export type TransactionType = 'income' | 'expense' | 'savings' | 'loan';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: TransactionType;
  date: string;
  month?: number;
  year?: number;
  notes: string;
  memberId: string;
  memberName: string;
  proofUrl: string | null;
  created_at: string;
  // SMS source fields
  source?: 'manual' | 'sms' | string;
  bankName?: string | null;
  merchantName?: string | null;
  smsConfidence?: number | null;
  smsReference?: string | null;
}

export interface TransactionCategory {
  name: string;
  value: number;
  color: string;
}

export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  burnRate: number;
}

export interface SavingsGoal {
  name: string;
  target: number;
  current?: number;
}

export interface SavingsAsset {
  id: string;
  user_id: string;
  asset_type: 'Gold' | 'Silver' | 'Other' | string;
  category: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  notes: string;
  image_uri: string | null;
  created_at?: string;
}
