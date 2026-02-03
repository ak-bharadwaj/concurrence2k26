-- ==========================================
-- TECHSPRINT 2K26: DATABASE CONSOLIDATED SETUP
-- ==========================================

-- 1. EXTEND EXISTING TABLES
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS team_number text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.admins(id);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_present boolean DEFAULT false;

-- 2. CREATE ATTENDANCE REGISTRY
CREATE TABLE IF NOT EXISTS public.attendance (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    attendance_date date DEFAULT CURRENT_DATE,
    attendance_time time DEFAULT CURRENT_TIME,
    status text DEFAULT 'PRESENT',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, attendance_date)
);

-- 3. CREATE ACTION LOGS (For Admin Auditing)
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    admin_id uuid REFERENCES public.admins(id) ON DELETE SET NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. CREATE GROUP LINKS (For WhatsApp Redirection)
CREATE TABLE IF NOT EXISTS public.group_links (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    college text NOT NULL, -- e.g., 'RGM' or 'OTHERS'
    whatsapp_link text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. CREATE EMAIL ACCOUNTS (Optional SMTP Config via DB)
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_address text NOT NULL,
    app_password text NOT NULL,
    smtp_host text DEFAULT 'smtp.gmail.com',
    smtp_port int DEFAULT 465,
    sender_name text DEFAULT 'TechSprint Event',
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 6. ENABLE REALTIME (Run these to allow the dashboard to update without refreshing)
-- Note: These must be run in the SQL Editor
-- alter publication supabase_realtime add table public.users;
-- alter publication supabase_realtime add table public.teams;
-- alter publication supabase_realtime add table public.attendance;
-- alter publication supabase_realtime add table public.action_logs;
