-- ============================================================================
-- DIAGNOSTIC: Find Missing User Registrations
-- ============================================================================
-- Run this to find users who might have partial registrations
-- ============================================================================

-- 1. Check if there are any users with screenshots but no proper status
SELECT 
    'Users with screenshots but UNPAID status' as check_type,
    COUNT(*) as count,
    array_agg(email) as emails
FROM public.users
WHERE screenshot_url IS NOT NULL
AND transaction_id IS NOT NULL
AND status = 'UNPAID';

-- 2. Check for duplicate emails (might indicate upsert conflicts)
SELECT 
    email,
    COUNT(*) as registration_count,
    array_agg(reg_no) as reg_numbers,
    array_agg(status) as statuses
FROM public.users
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Check for users created in last 24 hours by status
SELECT 
    status,
    COUNT(*) as count
FROM public.users
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY count DESC;

-- 4. Find users with transaction_id but no screenshot (upload failed?)
SELECT 
    'Users with UTR but no screenshot' as check_type,
    COUNT(*) as count,
    array_agg(email) as emails
FROM public.users
WHERE transaction_id IS NOT NULL
AND screenshot_url IS NULL;

-- 5. Find recent registrations (last 2 hours)
SELECT 
    name,
    email,
    reg_no,
    status,
    transaction_id,
    screenshot_url,
    created_at
FROM public.users
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- ============================================================================
-- DONE! Review results to identify the pattern of missing users
-- ============================================================================
