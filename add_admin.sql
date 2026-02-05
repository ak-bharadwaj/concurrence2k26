-- SCRIPT TO ADD MAIN ADMIN
-- Run this in Supabase SQL Editor

INSERT INTO public.admins (username, password_hash, role)
VALUES 
    ('dheeraj', 'DheerajGowd@541', 'MAIN') 
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = 'MAIN';

-- Verification
SELECT * FROM public.admins WHERE username = 'dheeraj';
