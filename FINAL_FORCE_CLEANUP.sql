-- FORCE CLEANUP: Purge Duplicates and Fix Security Constraints
-- INSTRUCTIONS: Copy this ENTIRE block and run it in the Supabase SQL Editor.

-- 1. Wipe out any and all duplicate Phone numbers, keeping only the 1st one found
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) as row_num
    FROM public.users
)
DELETE FROM public.users 
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 2. Wipe out any and all duplicate Emails, keeping only the 1st one found
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as row_num
    FROM public.users
)
DELETE FROM public.users 
WHERE id IN (SELECT id FROM duplicates WHERE row_num > 1);

-- 3. REMOVE the old Roll Number constraint (as requested)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key CASCADE;
DROP INDEX IF EXISTS idx_users_reg_no;

-- 4. APPLY the new Unique Constraints
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);

-- 5. Ensure Transaction ID is unique
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_transaction_id_key;
ALTER TABLE public.users ADD CONSTRAINT users_transaction_id_key UNIQUE (transaction_id);

-- 6. Verify current state
SELECT count(*), 'Total Users Remaining' as status FROM public.users;
