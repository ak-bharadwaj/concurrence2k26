-- SAFE Database Migration: Cleanup Duplicates & Apply Constraints
-- Run this in your Supabase SQL Editor

-- 1. Identify and Cleanup duplicate Phone Numbers (keeps ONLY the most recent registration for each phone)
DELETE FROM public.users a USING (
      SELECT MIN(ctid) as keep_ctid, phone
      FROM public.users
      GROUP BY phone
      HAVING COUNT(*) > 1
) b
WHERE a.phone = b.phone 
AND a.ctid > b.keep_ctid;

-- 2. Identify and Cleanup duplicate Emails (keeps ONLY the most recent registration for each email)
DELETE FROM public.users a USING (
      SELECT MIN(ctid) as keep_ctid, email
      FROM public.users
      GROUP BY email
      HAVING COUNT(*) > 1
) b
WHERE a.email = b.email 
AND a.ctid > b.keep_ctid;

-- 3. Now apply the constraints safely
-- Remove unique constraint on reg_no (Roll Number) as requested
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key;

-- Make Email and Phone unique
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);

-- Ensure Transaction ID is unique
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_transaction_id_key;
ALTER TABLE public.users ADD CONSTRAINT users_transaction_id_key UNIQUE (transaction_id);
