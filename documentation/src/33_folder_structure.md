<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 33</div>
    <h1>Codebase Directory Tree</h1>
    <div class="chapter-subtitle">Codebase Structure, Module Locations, and Build Configs</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Maps the folder tree, codebase files, and configuration directories.
    </div>
</div>

```text
MS_Family_Workspace/
│
├── android/                        # Android Studio Native project files
│   └── app/src/main/java/com/msfamily/app/
│       ├── BackgroundLocationWorker.kt   # Geolocation sync worker
│       ├── BiometricAuthPlugin.java      # Native biometric app lock
│       ├── SmsBackgroundReceiver.java    # Intercepts incoming SMS
│       ├── SmsParserEngine.kt            # Regular expression parser
│       ├── SmsSyncWorker.kt              # Local-to-cloud SMS sync worker
│       ├── TransactionCachePlugin.kt     # SQLite database interface
│       └── TransactionDatabase.kt        # Room database initializer
│
├── supabase/                       # Supabase configuration & migrations
│   ├── functions/                  # Deno Edge Functions
│   │   ├── send-notification/
│   │   └── daily-rates-push/
│   └── migrations/                 # DB migrations and triggers
│
├── src/                            # React Frontend Source files
│   ├── components/                 # Reusable UI elements
│   │   ├── ui/                     # shadcn UI components
│   │   └── Layout.tsx              # Main navigation shell
│   ├── context/                    # React Context providers
│   │   ├── AuthContext.tsx         # User session manager
│   │   ├── FinanceContext.tsx      # Ledger state manager
│   │   ├── FamilyContext.tsx       # Group settings broker
│   │   └── CallContext.tsx         # WebRTC voice coordinator
│   ├── pages/                      # Page components
│   │   ├── Dashboard.tsx           # Primary home dashboard
│   │   ├── Transactions.tsx        # Ledger list interface
│   │   ├── MyProofs.tsx            # Secure document vault
│   │   ├── Loans.tsx               # Loan & EMI tracking interface
│   │   └── LiveTracking.tsx        # Geolocation sharing map
│   └── utils/                      # Helper libraries & services
│
├── package.json                    # Dependencies configuration
├── tailwind.config.js              # CSS design configuration
└── vite.config.ts                  # Vite build parameters
```
