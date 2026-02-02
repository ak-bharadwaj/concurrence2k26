-- TECHSPRINT 2K26 - UNIFIED DATABASE SETUP SCRIPT
-- Run this script in the Supabase SQL Editor.

-- 0. Cleanup (Optional: uncomment if you want a total reset)
-- DROP TABLE IF EXISTS public.support_tickets CASCADE;
-- DROP TABLE IF EXISTS public.action_logs CASCADE;
-- DROP TABLE IF EXISTS public.group_links CASCADE;
-- DROP TABLE IF EXISTS public.email_accounts CASCADE;
-- DROP TABLE IF EXISTS public.admins CASCADE;
-- DROP TABLE IF EXISTS public.qr_codes CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
-- DROP TABLE IF EXISTS public.teams CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create TEAMS Table
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text UNIQUE NOT NULL,
    unique_code text UNIQUE NOT NULL,
    leader_id uuid, -- Will link to users
    payment_mode text DEFAULT 'INDIVIDUAL', -- INDIVIDUAL, BULK
    max_members integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create QR_CODES Table
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_image_url text NOT NULL,
    upi_id text NOT NULL,
    upi_name text DEFAULT 'TechSprint Event',
    category text DEFAULT 'MAIN', -- MAIN, BACKUP
    amount integer DEFAULT 800,
    daily_limit integer DEFAULT 50,
    today_usage integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create USERS Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    reg_no text UNIQUE NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    college text NOT NULL,
    branch text NOT NULL,
    year text NOT NULL,
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    role text DEFAULT 'MEMBER', -- LEADER, MEMBER
    status text DEFAULT 'UNPAID', -- UNPAID, PENDING, APPROVED, REJECTED
    transaction_id text UNIQUE,
    screenshot_url text,
    assigned_qr_id uuid REFERENCES public.qr_codes(id),
    verified_by uuid, -- Will link to admins
    checked_in boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create ADMINS Table
CREATE TABLE IF NOT EXISTS public.admins (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'SUB', -- MAIN, SUB
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create EMAIL_ACCOUNTS Table
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_address text UNIQUE NOT NULL,
    app_password text NOT NULL,
    sender_name text DEFAULT 'TechSprint Admin',
    smtp_host text DEFAULT 'smtp.gmail.com',
    smtp_port integer DEFAULT 465,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create GROUP_LINKS Table
CREATE TABLE IF NOT EXISTS public.group_links (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    college text NOT NULL,
    whatsapp_link text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create ACTION_LOGS Table
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    admin_id uuid REFERENCES public.admins(id) ON DELETE SET NULL,
    action text NOT NULL,
    timestamp timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create SUPPORT_TICKETS Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    issue_type text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'OPEN', -- OPEN, RESOLVED
    admin_response text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create JOIN_REQUESTS Table
CREATE TABLE IF NOT EXISTS public.join_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    status text DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

-- 9. Circular Dependency Handlers
-- Link teams leader_id to users
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS fk_team_leader;
ALTER TABLE public.teams ADD CONSTRAINT fk_team_leader FOREIGN KEY (leader_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Link users verified_by to admins
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_verified_by;
ALTER TABLE public.users ADD CONSTRAINT fk_verified_by FOREIGN KEY (verified_by) REFERENCES public.admins(id) ON DELETE SET NULL;

-- 10. RPC Functions
-- Function to safely increment QR usage
CREATE OR REPLACE FUNCTION increment_qr_usage(qr_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.qr_codes
  SET today_usage = today_usage + 1
  WHERE id = qr_id;
END;
$$ LANGUAGE plpgsql;

-- 11. Security (Disabling RLS for internal tools/hackathon speed)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 12. Seed Essential Data
-- Add default Main Admin (Username: admin, Password: password123)
-- WARNING: Change this in the dashboard later!
INSERT INTO public.admins (username, password_hash, role)
VALUES ('admin', 'password123', 'MAIN')
ON CONFLICT (username) DO NOTHING;

-- Add a default QR Code for testing (Placeholder URL)
INSERT INTO public.qr_codes (qr_image_url, upi_id, upi_name, amount)
VALUES ('https://placehold.co/400x400/png?text=DEFAULT+QR', 'event@upi', 'TechSprint Test', 800)
ON CONFLICT DO NOTHING;

-- Add default Group Links
INSERT INTO public.group_links (college, whatsapp_link)
VALUES 
('RGM', 'https://chat.whatsapp.com/RGM_GROUP'),
('OTHERS', 'https://chat.whatsapp.com/OTHERS_GROUP')
ON CONFLICT DO NOTHING;

-- 13. Scalability Indexes
CREATE INDEX IF NOT EXISTS idx_users_reg_no ON public.users(reg_no);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_teams_unique_code ON public.teams(unique_code);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_id ON public.join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);

-- 14. Enable Realtime
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests REPLICA IDENTITY FULL;

-- Note: Ensure "Realtime" is enabled for these tables in the Supabase Dashboard UI 
-- (Database -> Replication -> supabase_realtime publication).
