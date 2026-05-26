-- Migration: Create savings_assets table and policies

CREATE TABLE IF NOT EXISTS savings_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL, -- 'Gold', 'Silver', 'Other'
    category TEXT NOT NULL, -- e.g., '24K', '22K', 'KDM', 'Coins', 'Bars', 'Land', 'Crypto'
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    purchase_date DATE NOT NULL,
    notes TEXT,
    image_uri TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE savings_assets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own savings assets"
    ON savings_assets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings assets"
    ON savings_assets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings assets"
    ON savings_assets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings assets"
    ON savings_assets FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster querying
CREATE INDEX idx_savings_assets_user_id ON savings_assets(user_id);
CREATE INDEX idx_savings_assets_asset_type ON savings_assets(asset_type);
