<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 12</div>
    <h1>Database Physical Schema</h1>
    <div class="chapter-subtitle">PostgreSQL Table Structures, Data Types, Constraints, and Columns</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Technical details for all tables, fields, nullability, constraints, and column descriptions.
    </div>
</div>

## 1. Table: `profiles`
Stores user profile information.

<!-- table: Profiles Database Schema -->
| Field | Type | Nullable | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **No** | `PRIMARY KEY` | Links to Supabase `auth.users(id)`. |
| `name` | `TEXT` | Yes | - | Display name of the user. |
| `username` | `TEXT` | Yes | `UNIQUE` | Unique user handle. |
| `avatar` | `TEXT` | Yes | - | URL of the profile avatar image. |
| `bio` | `TEXT` | Yes | `DEFAULT ''` | Short bio or custom description. |
| `role` | `TEXT` | **No** | `CHECK (role IN ('admin', 'member'))` | Administrative level within group scope. |
| `family_id` | `UUID` | Yes | `REFERENCES family_groups(id)` | Currently active family group ID. |
| `updated_at` | `TIMESTAMPTZ`| Yes | `DEFAULT now()` | Last update timestamp. |

---

## 2. Table: `family_groups`
Defines family household containers.

<!-- table: Family Groups Database Schema -->
| Field | Type | Nullable | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **No** | `PRIMARY KEY` | Unique ID of the family group. |
| `family_code` | `TEXT` | **No** | `UNIQUE` | Human-readable ID (e.g. MSF-A7D8E2). |
| `name` | `TEXT` | **No** | - | Display name of the family unit. |
| `description` | `TEXT` | Yes | `DEFAULT ''` | Summary description of the household. |
| `avatar_url` | `TEXT` | Yes | - | URL to family group avatar image. |
| `created_by` | `UUID` | Yes | `REFERENCES profiles(id)` | Creator profile link. |
| `invite_token`| `TEXT` | **No** | `UNIQUE` | Secure UUID string for joins. |
| `created_at` | `TIMESTAMPTZ`| **No** | `DEFAULT now()` | Date of group initialization. |

---

## 3. Table: `transactions`
Contains financial entries (incomes, expenses, and savings allocations).

<!-- table: Transactions Database Schema -->
| Field | Type | Nullable | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `UUID` | **No** | `PRIMARY KEY` | Transaction ID. |
| `amount` | `NUMERIC` | **No** | `CHECK (amount > 0)` | Monetary value. |
| `category` | `TEXT` | **No** | - | Grouping tag (e.g. Food, Bills). |
| `type` | `TEXT` | **No** | `CHECK (type IN ('income', 'expense', 'savings', 'loan'))` | Ledger type. |
| `date` | `DATE` | **No** | - | Transaction date. |
| `notes` | `TEXT` | Yes | - | Free-text notes or transaction memo. |
| `member_id` | `UUID` | **No** | `REFERENCES profiles(id)` | Owner profile ID. |
| `proof_url` | `TEXT` | Yes | - | Link to receipt file in Storage. |
| `source` | `TEXT` | **No** | `DEFAULT 'manual'` | Source of entry (manual or SMS). |
| `bank_name` | `TEXT` | Yes | - | Detected financial institution. |
| `merchant_name`| `TEXT` | Yes | - | Merchant matching string. |
| `sms_confidence`| `NUMERIC`| Yes | - | Probability score of SMS parse engine. |
| `sms_reference`| `TEXT` | Yes | `UNIQUE` | Deduplication tracking key. |
| `created_at` | `TIMESTAMPTZ`| **No** | `DEFAULT now()` | Server insert timestamp. |
