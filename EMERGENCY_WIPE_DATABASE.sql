-- ============================================================================
-- EMERGENCY DATABASE WIPE - PROVE ZERO-LEAK POLICY
-- ============================================================================
-- This will DELETE ALL DATA to prove the Zero-Leak policy works
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Delete ALL join requests
DELETE FROM public.join_requests;

-- 2. Delete ALL users
DELETE FROM public.users;

-- 3. Delete ALL teams
DELETE FROM public.teams;

-- 4. Reset QR code counters
UPDATE public.qr_codes SET use_count = 0;

-- 5. Verification - should show 0 for everything
SELECT 
    'Users' as table_name, 
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COUNT(*) FILTER (WHERE status = 'UNPAID') as unpaid_count
FROM public.users
UNION ALL
SELECT 'Teams', COUNT(*), 0, 0 FROM public.teams
UNION ALL
SELECT 'Join Requests', COUNT(*), 0, 0 FROM public.join_requests;

-- ============================================================================
-- AFTER RUNNING THIS:
-- 1. Try SOLO registration - fill form but DON'T submit payment
-- 2. Check database - should be EMPTY (0 users, 0 teams)
-- 3. Try SQUAD FORM - fill form but DON'T submit payment  
-- 4. Check database - should STILL be EMPTY (0 users, 0 teams)
-- 5. Try JOINER - fill form (no payment needed)
-- 6. Check database - should have 1 UNPAID user + 1 join request (CORRECT)
-- ============================================================================
