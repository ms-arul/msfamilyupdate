-- SQL Script to enable deletion permissions on the 'proofs' storage bucket in Supabase.
-- Run this in your Supabase Dashboard (SQL Editor > New Query > Run)

-- 1. Ensure RLS is enabled on storage (RLS is enabled by default in Supabase, so this line is commented out)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Drop any conflicting delete policies for the proofs bucket if they exist
DROP POLICY IF EXISTS "Allow users to delete their own proofs" ON storage.objects;
DROP POLICY IF EXISTS "Delete policy for proofs bucket" ON storage.objects;
DROP POLICY IF EXISTS "Delete own proofs" ON storage.objects;

-- 3. Create the DELETE policy allowing users to delete their own files
CREATE POLICY "Allow users to delete their own proofs" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'proofs' AND (
    -- Path: user_id/filename (for transaction receipts)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Path: my_proofs/user_id/filename (for My Proofs documents)
    (
      (storage.foldername(name))[1] = 'my_proofs' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);

-- 4. Create the SELECT policy (if missing) so family members and owners can list/read files
DROP POLICY IF EXISTS "Allow authenticated users to read proofs" ON storage.objects;
CREATE POLICY "Allow authenticated users to read proofs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'proofs');

-- 5. Create the INSERT policy (if missing) to allow uploads to the user's folders
DROP POLICY IF EXISTS "Allow authenticated users to upload proofs" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload proofs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proofs' AND (
    -- Path: user_id/filename (for transaction receipts)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Path: my_proofs/user_id/filename (for My Proofs documents)
    (
      (storage.foldername(name))[1] = 'my_proofs' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);
