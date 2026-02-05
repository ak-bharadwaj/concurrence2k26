-- CLEANUP TEST DATA
-- Run this in Supabase SQL Editor to remove all test registrations
-- WARNING: This will delete ALL users and teams!

-- 1. Delete all join requests
DELETE FROM public.join_requests;

-- 2. Delete all users
DELETE FROM public.users;

-- 3. Delete all teams
DELETE FROM public.teams;

-- 4. Reset QR code usage counters
UPDATE public.qr_codes SET use_count = 0;

-- Verification
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Teams', COUNT(*) FROM public.teams
UNION ALL
SELECT 'Join Requests', COUNT(*) FROM public.join_requests;
