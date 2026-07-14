<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 10</div>
    <h1>Secure Document Vault SOP</h1>
    <div class="chapter-subtitle">Ingestion Rules, Storage Policies, and OCR Validations</div>
</div>

## SOP-DOC-01: Ingestion &amp; Gemini OCR Processing

### 1. Purpose
SOP for uploading documents to the vault, verifying Gemini OCR extractions, and archiving files.

### 2. Step-by-Step Ingestion Pipeline

```mermaid
%% id: diag-doc-flow
%% caption: Document Vault Ingestion Lifecycle Flow
flowchart TD
    Upload[1. Client uploads document] --> Compress[2. Client compresses image locally]
    Compress --> SaveStorage[3. Upload to proofs bucket in Storage]
    SaveStorage --> TriggerOCR[4. Send file URL to Gemini 2.5 Flash]
    TriggerOCR --> ValidateResponse{5. JSON response valid?}
    
    ValidateResponse -->|Yes| AutoPopulate[6. Auto-populate document fields]
    ValidateResponse -->|No| QueueVerify[7. Route to manual review queue]
    
    AutoPopulate --> SaveDb[8. Write record to my_proofs Postgres table]
    QueueVerify --> ManualInput[9. User manually enters details]
    ManualInput --> SaveDb
```

### 3. Recovery Steps: Storage Allocation Failures
If storage uploads fail due to folder allocation limits:
1. Verify user's group tier is within resource boundaries.
2. Run storage cleanup sweeps to archive historical proofs older than 24 months.
