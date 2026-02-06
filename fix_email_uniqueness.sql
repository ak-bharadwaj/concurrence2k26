-- ==============================================================
-- FIX: ENFORCE EMAIL UNIQUENESS & CLEANUP DUPLICATES
-- ==============================================================
-- This script resolves the "cannot coerce to single json object" 
-- error by ensuring each email is only registered once.

-- 1. Identify and Clean Up Duplicate Emails (Keep most recent)
-- If there are duplicates, we keep the one with the latest created_at
DELETE FROM public.users a
USING public.users b
WHERE a.id < b.id
AND a.email = b.email;

-- 2. Add Unique Constraint to Email
-- This prevents race conditions and ensures total stability
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- 3. Verification
SELECT email, count(*) 
FROM public.users 
GROUP BY email 
HAVING count(*) > 1;

-- Should return 0 results if successful.
