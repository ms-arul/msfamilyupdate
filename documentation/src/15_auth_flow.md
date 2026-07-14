<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 15</div>
    <h1>Authentication &amp; Lock Sequence</h1>
    <div class="chapter-subtitle">JWT Validations, Session Checks, and Biometric Lock Integrations</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> UML sequence showing the steps for user authentication and biometric access validation.
    </div>
</div>

## 1. Authentication Security Sequence
Describes how the client app interacts with native biometrics and remote databases.

```mermaid
%% id: seq-auth
%% caption: Authentication & Biometric Lock Sequence
sequenceDiagram
    autonumber
    actor User as Family Member
    participant UI as Frontend App (React)
    participant Auth as AuthContext.tsx
    participant Bio as BiometricAuthPlugin (Native)
    participant Svc as Supabase Auth Engine
    participant DB as Postgres profiles Table

    User->>UI: Launches application
    UI->>Auth: Checks stored login session
    Auth->>Svc: Validates JWT token expiration
    Svc-->>Auth: JWT Validated (claims returned)
    
    rect rgb(240, 243, 255)
        note right of UI: Application Lock Sequence
        Auth->>UI: Check app_lock setting in localStorage
        alt Settings shows App Lock is active
            UI->>Bio: invoke verifyAppLock()
            Bio->>User: Request Fingerprint / Face ID
            User-->>Bio: Provides biometric validation
            alt Biometrics Validated
                Bio-->>UI: return { success: true }
            else Biometrics Failed
                Bio-->>UI: return { success: false, fallback: pin }
                UI->>User: Displays PIN prompt
                User-->>UI: Inputs correct PIN
            end
        end
    end

    UI->>DB: Fetch profile metadata matching JWT UID
    DB-->>UI: Returns profile details (role, name, family_id)
    UI->>User: Renders Dashboard workspace
```
