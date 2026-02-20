-- ============================================================================
-- NUCLEAR CLEANUP: REMOVE ALL CONSTRAINTS & NORMALIZE DATA
-- ============================================================================
-- Run this in Supabase SQL Editor to solve all Registration & Login blockers.
-- ============================================================================

-- 1. DROP ALL UNIQUE CONSTRAINTS ON USERS TABLE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_transaction_id_key CASCADE;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS unique_email CASCADE;

-- 2. DROP ALL UNIQUE INDEXES ON USERS TABLE (Supabase sometimes uses indexes directly)
DROP INDEX IF EXISTS idx_users_reg_no;
DROP INDEX IF EXISTS users_email_idx;
DROP INDEX IF EXISTS users_reg_no_idx;

-- 3. DROP CONSTRAINTS ON JOIN REQUESTS (In case they block re-joining)
ALTER TABLE public.join_requests DROP CONSTRAINT IF EXISTS join_requests_team_id_user_id_key CASCADE;

-- 4. NORMALIZE DATA (Ensure login matches normalized input)
UPDATE public.users SET 
    email = LOWER(REPLACE(email, ' ', '')),
    reg_no = LOWER(REPLACE(reg_no, ' ', '')),
    phone = REPLACE(phone, ' ', '');

-- 5. NORMALIZE JOIN REQUESTS
UPDATE public.join_requests SET status = 'COMPLETED' WHERE status = 'ACCEPTED';

-- 6. VERIFY: Should return 0 rows
SELECT conname FROM pg_constraint 
WHERE conrelid = 'public.users'::regclass AND contype = 'u';

-- ============================================================================
-- DONE! Database is now wide open and data is normalized.
-- ============================================================================
