-- SCRIPT TO ADD NEW ADMIN USERS
-- Run this in Supabase SQL Editor

INSERT INTO public.admins (username, password_hash, role)
VALUES 
    ('aman', 'Aman@1907Syed', 'ADMIN'),
    ('javya', 'Javya@2705Yalluri', 'ADMIN'),
    ('rafi', 'Rafikarishma@12', 'ADMIN')
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- Verification
SELECT username, role, created_at FROM public.admins 
WHERE username IN ('aman', 'javya', 'rafi')
ORDER BY username;
