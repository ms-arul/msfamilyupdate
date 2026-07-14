<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 07</div>
    <h1>User Provisioning SOP</h1>
    <div class="chapter-subtitle">Account Lifecycles, Onboarding, and Security Provisioning Procedures</div>
</div>

## SOP-USR-01: Member Invitation & Onboarding

### 1. Purpose
Defines the workflow for onboarding new family members.

### 2. Prerequisites
1. Requester must hold `role = 'admin'` for the target `family_groups` container.
2. Invitee must have a registered email address.

### 3. Step-by-Step Procedure

```mermaid
%% id: diag-reg-flow
%% caption: Member Invitation & Onboarding Process
flowchart TD
    Start([1. Admin triggers invite]) --> GenerateToken[2. Generate unique token in family_invitations]
    GenerateToken --> SendEmail[3. Send invitation token via Edge Function]
    SendEmail --> InviteeAccept[4. Invitee inputs token in app]
    InviteeAccept --> ValidateToken{5. Token valid and active?}
    
    ValidateToken -->|No| Reject[6. Return invalid token error]
    ValidateToken -->|Yes| JoinFamily[7. Associate profile with family_id]
    
    JoinFamily --> InitLocal[8. Initialize local Room SQLite cache]
    InitLocal --> Complete([9. Invitee onboarded])
```

### 4. Exception Handling
* **Expired Token:** If the token has expired, the administrator must regenerate the invite, which invalidates the old record.
