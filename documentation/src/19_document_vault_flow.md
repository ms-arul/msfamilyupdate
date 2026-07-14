<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 19</div>
    <h1>Secure Document Ingestion Sequence</h1>
    <div class="chapter-subtitle">File Compression, Supabase Storage, and Metadata Extraction</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Outlines the document ingestion process, detailing the storage path and search indexing.
    </div>
</div>

## 1. Document Vault Flow
Shows the steps to upload and index document receipts.

```mermaid
%% id: flow-vault
%% caption: Secure Document Vault Processing Flow
flowchart TD
    Upload[1. User uploads document image] --> Storage[2. Upload to Supabase storage]
    Storage --> DBInsert[3. Create record in my_proofs table]
    DBInsert --> TriggerGemini{4. Network active & API key available?}
    
    TriggerGemini -->|Yes| GeminiOCR[5. Send file payload to Gemini]
    TriggerGemini -->|No| FallbackLocal[6. Run native ML Kit OCR]
    
    GeminiOCR --> ExtractMetadata[7. Extract text, amount, and doc number]
    ExtractMetadata --> GenerateSummary[8. Generate brief summary]
    
    FallbackLocal --> ExtractMetadataLocal[9. Extract plaintext metadata]
    
    GenerateSummary --> DBUpdate[10. Save metadata & summary to my_proofs record]
    ExtractMetadataLocal --> DBUpdate
    
    DBUpdate --> SearchIndex[11. Index document for search]
    SearchIndex --> Complete([12. Document displayed in Vault])
```
