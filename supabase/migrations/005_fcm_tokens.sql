-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Enable Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon/authenticated roles
CREATE POLICY "Allow insert fcm tokens" ON fcm_tokens
    FOR INSERT WITH CHECK (true);

-- Allow users to read their own tokens
CREATE POLICY "Allow read own tokens" ON fcm_tokens
    FOR SELECT USING (true);

-- Allow upsert (update existing token for same user)
CREATE POLICY "Allow update own tokens" ON fcm_tokens
    FOR UPDATE USING (true);

-- Allow delete
CREATE POLICY "Allow delete own tokens" ON fcm_tokens
    FOR DELETE USING (true);
