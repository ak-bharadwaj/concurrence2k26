-- ============================================================================
-- REMOVE UNIQUE CONSTRAINTS TO ALLOW RE-REGISTRATION AND PREVENT ERRORS
-- ============================================================================
-- Run this in Supabase SQL Editor to allow users to register multiple times
-- and prevent "already registered" errors on transaction IDs.
-- ============================================================================

-- 1. Drop UNIQUE constraint on reg_no (allows duplicate registration numbers)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key;

-- 2. Drop UNIQUE constraint on transaction_id (allows re-submission/fixes)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_transaction_id_key;

-- 3. Verify the changes
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass
AND (conname LIKE '%reg_no%' OR conname LIKE '%transaction_id%');

-- ============================================================================
-- DONE! Constraints removed. 
-- The application handles uniqueness via email upsert in the code.
-- ============================================================================
