-- ============================================================================
-- DATA NORMALIZATION FIX: CONSISTENT CASING FOR LOGIN
-- ============================================================================
-- Run this in Supabase SQL Editor to fix existing users.
-- ============================================================================

-- 1. Lowercase all emails and remove spaces
UPDATE public.users 
SET email = LOWER(REPLACE(email, ' ', ''))
WHERE email != LOWER(REPLACE(email, ' ', ''));

-- 2. Lowercase all registration numbers and remove spaces
UPDATE public.users 
SET reg_no = LOWER(REPLACE(reg_no, ' ', ''))
WHERE reg_no != LOWER(REPLACE(reg_no, ' ', ''));

-- 3. Cleanup any spaces in other identifying columns
UPDATE public.users
SET phone = REPLACE(phone, ' ', ''),
    name = TRIM(name);

-- 4. Verify the changes
SELECT id, name, email, reg_no FROM public.users LIMIT 10;

-- ============================================================================
-- DONE! Data normalized for consistent login.
-- ============================================================================
