-- ============================================================================
-- TECHSPRINT 2K26 - COMPLETE DATABASE SETUP
-- ============================================================================
-- This is the ONLY SQL script you need to run to set up the entire database.
-- Run this ONCE in Supabase SQL Editor when starting the project.
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 1: CREATE TABLES
-- ============================================================================

-- 1. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    unique_code text UNIQUE NOT NULL,
    leader_id uuid,
    payment_mode text DEFAULT 'INDIVIDUAL',
    max_members integer DEFAULT 5,
    status text DEFAULT 'PENDING',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. QR Codes Table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_image_url text NOT NULL,
    upi_id text NOT NULL,
    upi_name text DEFAULT 'TechSprint Event',
    category text DEFAULT 'MAIN',
    amount integer DEFAULT 800,
    today_usage integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    reg_no text UNIQUE NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    college text NOT NULL,
    branch text NOT NULL,
    year text NOT NULL,
    tshirt_size text DEFAULT 'M',
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    role text DEFAULT 'MEMBER',
    status text DEFAULT 'UNPAID',
    transaction_id text,
    screenshot_url text,
    assigned_qr_id uuid REFERENCES public.qr_codes(id),
    attendance boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Email Accounts Table
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    smtp_host text NOT NULL,
    smtp_port integer NOT NULL,
    smtp_user text NOT NULL,
    smtp_pass text NOT NULL,
    from_email text NOT NULL,
    from_name text DEFAULT 'TechSprint',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. WhatsApp Group Links Table
CREATE TABLE IF NOT EXISTS public.group_links (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_name text UNIQUE NOT NULL,
    whatsapp_link text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Action Logs Table
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id uuid REFERENCES public.admins(id),
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id),
    subject text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'OPEN',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Join Requests Table (CRITICAL for team coordination)
CREATE TABLE IF NOT EXISTS public.join_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    candidate_data jsonb,
    status text DEFAULT 'PENDING',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

-- ============================================================================
-- SECTION 2: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_teams_unique_code ON public.teams(unique_code);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON public.teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON public.join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_join_requests_candidate_email ON public.join_requests((candidate_data->>'email'));

-- ============================================================================
-- SECTION 3: PERMISSIONS (CRITICAL - Allows frontend to access tables)
-- ============================================================================

-- Disable Row Level Security (RLS) for all tables
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests DISABLE ROW LEVEL SECURITY;

-- Grant ALL permissions to anon, authenticated, and service_role
GRANT ALL ON public.teams TO anon, authenticated, service_role;
GRANT ALL ON public.qr_codes TO anon, authenticated, service_role;
GRANT ALL ON public.users TO anon, authenticated, service_role;
GRANT ALL ON public.admins TO anon, authenticated, service_role;
GRANT ALL ON public.email_accounts TO anon, authenticated, service_role;
GRANT ALL ON public.group_links TO anon, authenticated, service_role;
GRANT ALL ON public.action_logs TO anon, authenticated, service_role;
GRANT ALL ON public.support_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.join_requests TO anon, authenticated, service_role;

-- ============================================================================
-- SECTION 4: REALTIME SUBSCRIPTIONS (For live updates in frontend)
-- ============================================================================

-- Realtime is already enabled for all tables in Supabase
-- (Publication is set to FOR ALL TABLES by default)
-- No action needed here

-- Set replica identity for realtime (required for UPDATE/DELETE events)
ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.qr_codes REPLICA IDENTITY FULL;
ALTER TABLE public.action_logs REPLICA IDENTITY FULL;

-- ============================================================================
-- SECTION 5: VERIFICATION
-- ============================================================================

-- Check that all tables were created
SELECT 
    'Tables Created' as status,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'users', 'qr_codes', 'admins', 'email_accounts', 'group_links', 'action_logs', 'support_tickets', 'join_requests');

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Add admin user (see add_admin.sql if needed)
-- 2. Upload QR codes via admin dashboard
-- 3. Configure SMTP settings via admin dashboard
-- ============================================================================
