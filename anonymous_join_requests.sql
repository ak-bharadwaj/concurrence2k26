-- SQL Migration: Enable Anonymous Join Requests
-- Run this in your Supabase SQL Editor

-- 1. Add candidate_data column to store registration info without a user record
ALTER TABLE public.join_requests 
ADD COLUMN IF NOT EXISTS candidate_data JSONB;

-- 2. Ensure user_id is nullable (it should be by default)
ALTER TABLE public.join_requests 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Add index for performance on status checks
CREATE INDEX IF NOT EXISTS idx_join_requests_candidate_email 
ON public.join_requests ((candidate_data->>'email'));
