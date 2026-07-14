<div class="chapter-header">
    <div class="chapter-number-badge">Chapter 22</div>
    <h1>REST API Specifications</h1>
    <div class="chapter-subtitle">Request Headers, Request Bodies, Responses, and Error Schemes</div>
    <div class="chapter-summary-box">
        <strong>Summary:</strong> Complete endpoint definitions for authentication, family groups, and transaction ledgers.
    </div>
</div>

## 1. Authentication Endpoints

### POST `/auth/v1/signup`
Registers a new user profile.

* **Request Headers:**
  ```http
  Content-Type: application/json
  apikey: SUPABASE_ANON_KEY
  ```
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "SecurePassword123",
    "data": {
      "name": "ArulPrakash",
      "username": "arul_p"
    }
  }
  ```
* **Response (Status 200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "e3b0c442-98fc-11eb-a8b3-0242ac130003",
      "email": "user@example.com"
    }
  }
  ```

---

## 2. Transactions Endpoints

### GET `/rest/v1/transactions`
Retrieves transactions for the active family group.

* **Request Headers:**
  ```http
  Authorization: Bearer USER_JWT_TOKEN
  Range: 0-9
  ```
* **Query Parameters:**
  * `member_id`: Filter by owner profile ID (e.g. `eq.e3b0c442-98fc-11eb-a8b3-0242ac130003`)
* **Response (Status 200 OK):**
  ```json
  [
    {
      "id": "1d8b9f42-4b2a-4a8e-bc5d-6c12e9cf41d2",
      "amount": 2500.00,
      "category": "Utilities",
      "type": "expense",
      "date": "2026-07-05",
      "notes": "Electric Bill",
      "member_id": "e3b0c442-98fc-11eb-a8b3-0242ac130003"
    }
  ]
  ```
