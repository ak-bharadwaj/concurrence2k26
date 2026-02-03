-- MASTER SYNCHRONIZATION & QR FIX SCRIPT
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create missing 'attendance' table
CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    attendance_date date NOT NULL,
    attendance_time text NOT NULL,
    status text DEFAULT 'PRESENT',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, attendance_date)
);

-- 1b. Safety Constraints
-- Ensure users don't get deleted if a team is deleted; they should become solo (team_id = NULL)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_team_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_team_id_fkey 
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 2. Comprehensive Permissions Reset
-- Disable RLS temporarily to ensure we can apply grants cleanly (or keep disabled for hackathon speed)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- Grant broad access to anon and authenticated roles for the Admin Dashboard
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Enable Realtime for EVERYTHING
-- Drops existing publication if it exists to avoid errors, then recreates it
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Ensure Replica Identity is FULL for all tables to avoid payload issues
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.qr_codes REPLICA IDENTITY FULL;
ALTER TABLE public.admins REPLICA IDENTITY FULL;
ALTER TABLE public.email_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.group_links REPLICA IDENTITY FULL;
ALTER TABLE public.action_logs REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.attendance REPLICA IDENTITY FULL;

-- 4. Storage Policies for QR Code Uploads
-- Ensure bucket 'screenshots' exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for 'screenshots' bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR ALL USING ( bucket_id = 'screenshots' ) 
WITH CHECK ( bucket_id = 'screenshots' );

-- Ensure storage permissions are broad enough for current setup
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

-- 5. Performance Optimization: Indexes for Fast Concurrent Operations
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_reg_no ON public.users(reg_no);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scan_date ON public.attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_action_logs_timestamp ON public.action_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_teams_unique_code ON public.teams(unique_code);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_id ON public.join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON public.join_requests(user_id);

-- 6. Atomic Team Number Generation
-- Add team_number column if it doesn't exist
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_number text UNIQUE;

-- Create sequence for team numbers (starting from 0, incrementing by 10 as per existing logic)
CREATE SEQUENCE IF NOT EXISTS team_number_seq START 1 INCREMENT 1;

-- Function to generate A000 format team number
CREATE OR REPLACE FUNCTION public.generate_team_number()
RETURNS text AS $$
DECLARE
    seq_val integer;
BEGIN
    seq_val := nextval('team_number_seq');
    RETURN 'A' || LPAD((seq_val * 10)::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign team_number on insert if null
CREATE OR REPLACE FUNCTION public.assign_team_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.team_number IS NULL THEN
        NEW.team_number := public.generate_team_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_team_number ON public.teams;
CREATE TRIGGER trigger_assign_team_number
BEFORE INSERT ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.assign_team_number();

-- 7. Database-level capacity check for teams
CREATE OR REPLACE FUNCTION public.check_team_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_count integer;
    max_cap integer;
BEGIN
    SELECT max_members INTO max_cap FROM public.teams WHERE id = NEW.team_id;
    SELECT count(*) INTO current_count FROM public.users WHERE team_id = NEW.team_id AND id != NEW.id;
    
    IF current_count >= max_cap THEN
        RAISE EXCEPTION 'Squad is full';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for capacity check
DROP TRIGGER IF EXISTS trigger_check_team_capacity ON public.users;
CREATE TRIGGER trigger_check_team_capacity
BEFORE INSERT OR UPDATE OF team_id ON public.users
FOR EACH ROW WHEN (NEW.team_id IS NOT NULL)
EXECUTE FUNCTION public.check_team_capacity();
