-- Fix Join Requests Permissions
-- Run this in Supabase SQL Editor

-- 1. Ensure join_requests table has all necessary columns
ALTER TABLE public.join_requests 
ADD COLUMN IF NOT EXISTS candidate_data JSONB;

-- 2. Ensure user_id is nullable
ALTER TABLE public.join_requests 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Add index for performance
CREATE INDEX IF NOT EXISTS idx_join_requests_candidate_email 
ON public.join_requests ((candidate_data->>'email'));

-- 4. CRITICAL: Grant permissions to anon and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.join_requests TO anon, authenticated;

-- 5. Disable RLS for join_requests (already done in full_schema_setup.sql, but ensuring)
ALTER TABLE public.join_requests DISABLE ROW LEVEL SECURITY;

-- 6. Enable realtime for join_requests
ALTER PUBLICATION supabase_realtime ADD TABLE join_requests;

-- 7. Set replica identity for realtime
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;
