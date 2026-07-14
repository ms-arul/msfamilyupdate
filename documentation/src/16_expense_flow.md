<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 16</div>
    <h1>Expense &amp; OCR Ingestion Sequence</h1>
    <div class="chapter-subtitle">Manual entry, Storage uploads, Gemini parsing, and Local Caching</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the receipt processing pipeline, showing interactions between the client, Storage, and the Gemini API.
    </div>
</div>

## 1. Ingestion Sequence
Steps for uploading and parsing receipt images.

```mermaid
%% id: seq-expense
%% caption: Expense Ingestion and Gemini OCR Sequence
sequenceDiagram
    autonumber
    actor User as Family Member
    participant UI as AddTransaction.tsx Page
    participant Store as Supabase storage.from('proofs')
    participant Gem as Gemini API Bridge Client
    participant API as Supabase Database API
    participant Cache as TransactionCachePlugin (Room SQLite)

    User->>UI: Inputs transaction details or uploads receipt
    alt Receipt uploaded
        UI->>Store: upload(file_path, file_bytes)
        Store-->>UI: Returns { path: "proofs/receipt_502.jpg" }
        UI->>Gem: analyzeReceipt(image_bytes)
        note over Gem: Gemini executes OCR & Category mapping
        Gem-->>UI: Returns JSON (amount: 1450, category: "Groceries", merchant: "Walmart")
        UI->>UI: Pre-fills input fields with returned values
    end
    User->>UI: Clicks "Save Transaction"
    UI->>API: insert(transaction_payload)
    
    alt Network available
        API-->>UI: Returns { success: true, record: tx_row }
        UI->>Cache: cacheTransactions([tx_row])
    else Offline state
        UI->>Cache: savePendingTransaction(transaction_payload)
        note over Cache: Saved to Room SQLite. Scheduled for sync.
    end
    
    UI-->>User: Renders confirmation toast & updates dashboard charts
```
