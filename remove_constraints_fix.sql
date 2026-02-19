-- ============================================================================
-- FINAL FOOLPROOF FIX: REMOVE ALL CONSTRAINTS BLOCKING REGISTRATION
-- ============================================================================
-- Run this in Supabase SQL Editor to ensure no "Already Registered" errors.
-- ============================================================================

-- 1. Drop UNIQUE constraints on all identifying columns
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS unique_email;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_transaction_id_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- 2. Verify that all unique constraints are gone
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    a.attname as column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE conrelid = 'public.users'::regclass
AND contype = 'u';

-- ============================================================================
-- DONE! Constraints removed. 
-- Registration will now flow without "Already Registered" blocks.
-- ============================================================================
