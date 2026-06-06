-- Add file_type and file_size columns to my_proofs table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

ALTER TABLE my_proofs
ADD COLUMN IF NOT EXISTS file_type VARCHAR DEFAULT NULL,
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT NULL;

-- Add comments for clarity
COMMENT ON COLUMN my_proofs.file_type IS 'Mime type of the uploaded file (e.g., application/pdf, image/jpeg)';
COMMENT ON COLUMN my_proofs.file_size IS 'Size of the uploaded file in bytes';
