-- Database Migration: Shift Uniqueness from Roll No to Email/Phone
-- Run this in your Supabase SQL Editor

-- 1. Remove unique constraint on reg_no (Roll Number)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_reg_no_key;

-- 2. Make Email and Phone unique to prevent duplicate registrations
-- We use email as the primary anchor for student accounts now
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE public.users ADD CONSTRAINT users_phone_key UNIQUE (phone);

-- 3. Ensure Transaction ID is unique for payment security
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_transaction_id_key;
ALTER TABLE public.users ADD CONSTRAINT users_transaction_id_key UNIQUE (transaction_id);

-- 4. Enable Storage bucket for screenshots if not already exists
-- Note: You may need to create the 'screenshots' bucket manually in the Storage tab
-- and set its policy to public for 'SELECT' and authenticated for 'INSERT'
