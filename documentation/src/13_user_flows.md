<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 13</div>
    <h1>Core User Flows</h1>
    <div class="chapter-subtitle">Onboarding, Document OCR, and Location Sharing Flows</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Displays state transitions and process workflows for onboarding and document vault ingestion.
    </div>
</div>

## 1. Onboarding &amp; Profile Creation Flow
Shows the steps required for a new user to register and join a family group.

```mermaid
%% id: flow-onboard
%% caption: User Registration and Onboarding Flow
stateDiagram-v2
    [*] --> NewUser : Launches App
    NewUser --> AuthRedirect : Clicks Register
    AuthRedirect --> InputDetails : Fills Name & Username
    InputDetails --> ValidateUsername : Checks uniqueness in DB
    ValidateUsername --> CreateProfile : Validates unique username
    CreateProfile --> CheckFamilyChoice : Profile created in Postgres
    CheckFamilyChoice --> CreateFamily : Selects 'Create New Family'
    CheckFamilyChoice --> JoinFamily : Selects 'Join Existing Family'
    CreateFamily --> InitLedger : Family code generated
    JoinFamily --> SubmitRequest : Inputs code & sends request
    SubmitRequest --> PendingApproval : Request stored in family_requests
    PendingApproval --> InitLedger : Admin approves member join
    InitLedger --> Dashboard : Launches home interface
```

---

## 2. Document OCR Ingestion Flow
Shows how a receipt or invoice is uploaded and processed using Gemini.

```mermaid
%% id: flow-ocr
%% caption: Secure Document Upload and OCR Extraction Flow
stateDiagram-v2
    [*] --> VaultTab : Navigates to MyProofs
    VaultTab --> TriggerUpload : Clicks "Upload Document"
    TriggerUpload --> CaptureFile : Selects file or opens camera
    CaptureFile --> StorageBucket : Uploads raw image to 'proofs' bucket
    StorageBucket --> GetPublicUrl : Obtains secure public URL
    GetPublicUrl --> GeminiAPI : Sends image bytes + extraction prompt
    GeminiAPI --> SuccessExtract : Returns parsed JSON
    GeminiAPI --> FailExtract : Request fails / Key error
    SuccessExtract --> PopulateForm : Populates UI fields automatically
    FailExtract --> ManualForm : Requests manual form entry
    PopulateForm --> DBWrite : User approves and clicks save
    ManualForm --> DBWrite : User fills fields and clicks save
    DBWrite --> [*] : Document displayed in list
```
