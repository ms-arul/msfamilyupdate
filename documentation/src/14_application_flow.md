<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 14</div>
    <h1>Application Lifecycle Flow</h1>
    <div class="chapter-subtitle">Application Lifecycle, State Transitions, and Background Execution</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Details the application lifecycle, from startup checks through to background execution.
    </div>
</div>

## 1. Application Runtime States
Shows the initialization steps, biometric checks, and active synchronization processes.

```mermaid
%% id: diag-lifecycle
%% caption: Application Runtime State Transitions
flowchart TD
    Start([1. Application Startup]) --> CheckPlatform{2. Device Platform?}
    
    CheckPlatform -->|Capacitor Native| InitAndroid[3. Initialize Native Plugins]
    CheckPlatform -->|Standard Web| InitWeb[4. Web Initialization]
    
    InitAndroid --> RequestPermissions[5. Request GPS, SMS, Notif Permissions]
    RequestPermissions --> LoadTheme[6. Read Theme & Settings]
    InitWeb --> LoadTheme
    
    LoadTheme --> AuthCheck{7. Valid Session Token?}
    
    AuthCheck -->|No Session| ShowLogin[8. Render Login/Register Form]
    AuthCheck -->|Active Session| CheckLock{9. App Lock Enabled?}
    
    CheckLock -->|Yes| TriggerBiometrics[10. Execute Biometric Auth / PIN]
    CheckLock -->|No| FetchLedger[11. Initialize Data Sync]
    
    TriggerBiometrics -->|Success| FetchLedger
    TriggerBiometrics -->|Fail| LockScreen[12. Prompt PIN Fallback / Close]
    
    FetchLedger --> LoadCache[13. Load Room DB Local Transactions]
    LoadCache --> RequestSupabase[14. Fetch Delta from Supabase API]
    RequestSupabase --> MainUI[15. Display Interactive Dashboard]
    
    MainUI --> AppRunning{16. Operating Mode?}
    
    AppRunning -->|Foreground Active| UserInput[17. Process Events / Update Charts]
    AppRunning -->|Background Transition| SyncState[18. Run syncBackgroundState]
    
    SyncState --> Terminated([19. Save Session state & Exit])
```

<div class="callout callout-info">
    <div class="callout-icon"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
    <div class="callout-content">
        <div class="callout-title">Platform Lifecycle Event</div>
        <div>In mobile applications, the `appStateChange` event triggers data synchronization automatically when the app is minimized.</div>
    </div>
</div>
