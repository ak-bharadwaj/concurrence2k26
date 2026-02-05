-- COMPREHENSIVE FIX FOR JOIN REQUESTS AND PERMISSIONS
-- Run this ONCE in Supabase SQL Editor

-- 1. Ensure join_requests table structure is correct
ALTER TABLE public.join_requests 
ADD COLUMN IF NOT EXISTS candidate_data JSONB;

ALTER TABLE public.join_requests 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_join_requests_candidate_email 
ON public.join_requests ((candidate_data->>'email'));

CREATE INDEX IF NOT EXISTS idx_join_requests_team_status 
ON public.join_requests (team_id, status);

-- 3. CRITICAL: Grant ALL permissions to anon and authenticated
GRANT ALL ON public.join_requests TO anon, authenticated, service_role;
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT ALL ON public.teams TO anon, authenticated, service_role;

-- 4. Disable RLS (already done in schema, but ensuring)
ALTER TABLE public.join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;

-- 5. Realtime is already enabled for all tables in Supabase
-- (Publication is set to FOR ALL TABLES by default)
-- No action needed here

-- 6. Set replica identity for realtime
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.teams REPLICA IDENTITY FULL;

-- Verification query
SELECT 
    'join_requests' as table_name, 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
    COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted
FROM public.join_requests;
