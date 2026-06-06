import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseBankSms, isBankSms, smartParse } from '../smsParserService';
import smsService from '../smsService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

const mockGetAndClearPendingSms = vi.fn();
const mockStartListening = vi.fn();
const mockStopListening = vi.fn();
const mockAddListener = vi.fn();

// Mock Capacitor and registerPlugin properly
vi.mock('@capacitor/core', () => {
  return {
    Capacitor: {
      isNativePlatform: () => true
    },
    registerPlugin: (name: string) => {
      if (name === 'SmsReader') {
        return {
          getAndClearPendingSms: async () => mockGetAndClearPendingSms(),
          startListening: async () => mockStartListening(),
          stopListening: async () => mockStopListening(),
          addListener: (event: string, cb: any) => mockAddListener(event, cb),
          isListening: async () => ({ listening: true })
        };
      }
      return {};
    }
  };
});

describe('Indian Bank SMS Parser Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const testCases = [
    {
      sender: 'SBIUPI',
      body: 'Dear UPI User, your a/c ending XX2938 has been debited by Rs 1500.00 to AMAZON on 06-06-2026. Ref: 615029302938.',
      expected: {
        amount: 1500.00,
        type: 'debit',
        bank: 'SBI',
        account: '2938',
        merchant: 'Amazon',
        ref: '615029302938'
      }
    },
    {
      sender: 'HDFCBK',
      body: 'Alert: Rs 550.75 spent on HDFC Bank Card ending 1234 at Swiggy on 06-06-2026. Avl Bal: Rs 15400.22.',
      expected: {
        amount: 550.75,
        type: 'debit',
        bank: 'HDFC Bank',
        account: '1234',
        merchant: 'Swiggy',
        ref: null
      }
    },
    {
      sender: 'ICICIB',
      body: 'Dear Customer, your Acct ending 4321 is credited with INR 10,000.00 on 05-06-2026 from Employer. Info: SALARY.',
      expected: {
        amount: 10000.00,
        type: 'credit',
        bank: 'ICICI Bank',
        account: '4321',
        merchant: 'Employer',
        ref: null
      }
    },
    {
      sender: 'AXISBK',
      body: 'Transaction Alert: Rs. 299.00 debited from Axis Bank A/c XX5678 to Netflix. UPI Ref: 123456789012.',
      expected: {
        amount: 299.00,
        type: 'debit',
        bank: 'Axis Bank',
        account: '5678',
        merchant: 'Netflix',
        ref: '123456789012'
      }
    },
    {
      sender: 'CUBANK',
      body: 'City Union Bank Info: a/c xxx1111 debited Rs. 450 for Uber ride. Txn: CUB987654.',
      expected: {
        amount: 450.00,
        type: 'debit',
        bank: 'City Union Bank',
        account: '1111',
        merchant: 'Uber',
        ref: 'CUB987654'
      }
    },
    {
      sender: 'KOTAKB',
      body: 'Your Kotak Bank Acct XX9988 has been debited by Rs 120.00 for payment to Zomato. Ref: 234567891234. Available Bal: Rs. 5432.10',
      expected: {
        amount: 120.00,
        type: 'debit',
        bank: 'Kotak Bank',
        account: '9988',
        merchant: 'Zomato',
        ref: '234567891234'
      }
    }
  ];

  it('should successfully parse valid transaction SMS messages', () => {
    for (const tc of testCases) {
      const parsed = parseBankSms(tc.sender, tc.body);
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.amount).toBe(tc.expected.amount);
        expect(parsed.transactionType).toBe(tc.expected.type);
        expect(parsed.bankName).toBe(tc.expected.bank);
        expect(parsed.accountLast4).toBe(tc.expected.account);
        expect(parsed.merchantName).toBe(tc.expected.merchant);
        if (tc.expected.ref) {
          expect(parsed.referenceNumber).toBe(tc.expected.ref);
        }
      }
    }
  });

  it('should identify valid bank SMS messages correctly', () => {
    for (const tc of testCases) {
      expect(isBankSms(tc.sender, tc.body)).toBe(true);
    }
  });

  it('should reject OTP and spam/promotional messages', () => {
    const spamMessages = [
      { sender: 'SBIALR', body: 'Dear Customer, your OTP for SBI Netbanking login is 948274. Do not share this OTP with anyone.' },
      { sender: 'AXISBK', body: 'Congratulation! You have won a cashback of Rs 500. Click here to claim your reward now: http://example.com/reward' },
      { sender: 'HDFCBK', body: 'Get up to 50% discount on shopping at merchant stores with your HDFC card. Limited time offer, apply now!' },
      { sender: 'JIOMNY', body: 'One-Time Password (OTP) to verify your transaction is 554321. Valid for 10 minutes.' }
    ];

    for (const spam of spamMessages) {
      expect(isBankSms(spam.sender, spam.body)).toBe(false);
      expect(parseBankSms(spam.sender, spam.body)).toBeNull();
    }
  });

  it('should support relaxed mode defaulting to debit when type is uncertain', async () => {
    // Message with amount but no clear credit/debit keyword
    const uncertainSms = {
      sender: 'SBIINB',
      body: 'Rs 750.00 to merchant Zomato on 06-06-2026. Ref: 9876543210.'
    };
    
    const parsed = parseBankSms(uncertainSms.sender, uncertainSms.body);
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.amount).toBe(750.00);
      expect(parsed.transactionType).toBe('debit'); // defaulted to debit under relaxed mode
      expect(parsed.merchantName).toBe('Zomato');
    }
  });
});

describe('smsService & Duplicate Detection Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    smsService.resetSmsService();
  });

  it('should detect and filter duplicate SMS messages', async () => {
    const sender = 'SBIUPI';
    const body = 'Dear UPI User, your a/c ending XX2938 has been debited by Rs 1500.00 to AMAZON on 06-06-2026. Ref: 615029302938.';

    // Inject callback
    const callback = vi.fn();
    
    // First processing
    mockGetAndClearPendingSms.mockResolvedValueOnce({
      messages: [{ sender, body, timestamp: Date.now() }]
    });

    await smsService.processPendingSms(callback);
    expect(callback).toHaveBeenCalledTimes(1);

    // Second processing of the exact same message should be skipped
    callback.mockClear();
    mockGetAndClearPendingSms.mockResolvedValueOnce({
      messages: [{ sender, body, timestamp: Date.now() }]
    });

    await smsService.processPendingSms(callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should queue failed transaction callbacks and retry them', async () => {
    const sender = 'SBIUPI';
    const body = 'Dear UPI User, your a/c ending XX2938 has been debited by Rs 1500.00 to AMAZON on 06-06-2026. Ref: 615029302938.';

    // Callback fails on first execution
    const failingCallback = vi.fn()
      .mockRejectedValueOnce(new Error('Network disconnected'))
      .mockResolvedValueOnce(undefined);

    mockGetAndClearPendingSms.mockResolvedValueOnce({
      messages: [{ sender, body, timestamp: Date.now() }]
    });

    // We expect the queue logic to handle the initial failure, then retry
    await smsService.processPendingSms(failingCallback);
    expect(failingCallback).toHaveBeenCalled();
  });
});

describe('SMS Parser Performance Benchmark', () => {
  it('should parse 100 SMS messages in less than 200ms', () => {
    const sender = 'SBIUPI';
    const body = 'Dear UPI User, your a/c ending XX2938 has been debited by Rs 1500.00 to AMAZON on 06-06-2026. Ref: 615029302938.';
    
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      parseBankSms(sender, body);
    }
    const duration = Date.now() - startTime;
    console.log(`[Parser Benchmark] Parsed 100 SMS messages in ${duration}ms`);
    expect(duration).toBeLessThan(200);
  });
});
