export interface SmsMessage {
  id?: string;
  sender: string; // address
  body: string;
  timestamp?: number; // date
  date?: string;
}

export type ParsedTransactionType = 'debit' | 'credit';

export interface ParsedTransaction {
  amount: number;
  bankName: string;
  accountNumber: string | null;
  transactionType: ParsedTransactionType;
  merchantName: string | null;
  category: string;
  date: string; // ISO string or date representation
  rawBody?: string;
  source: 'sms';
  smsConfidence: number;
  smsReference: string;
}

export interface BankPattern {
  name: string;
  regex: RegExp;
  amountGroup: number;
  type: ParsedTransactionType;
  accountGroup?: number;
  merchantGroup?: number;
}

export interface SmsParseResult {
  parsed: ParsedTransaction | null;
  error?: string;
}
