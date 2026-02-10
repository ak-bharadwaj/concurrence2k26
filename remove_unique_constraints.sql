-- ============================================================================
-- REMOVE UNIQUE CONSTRAINTS TO ALLOW RE-REGISTRATION
-- ============================================================================
-- Run this in Supabase SQL Editor to allow users to register multiple times
-- ============================================================================

-- 1. Drop UNIQUE constraint on reg_no (allows duplicate registration numbers)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key;

-- 2. Keep email as unique but use upsert logic in code
-- (Email is already used for upsert in registerUser function)

-- 3. Verify the changes
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass
AND conname LIKE '%users_%';

-- ============================================================================
-- DONE! Users can now register multiple times.
-- The application will handle duplicates via upsert on email.
-- ============================================================================
