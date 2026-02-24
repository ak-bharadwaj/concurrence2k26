-- ============================================================================
-- HACKATHON 2K26 - MASTER SCHEMA SETUP (FINAL - VERIFIED AGAINST ALL SQL FILES)
-- ============================================================================
-- Run this ONCE on a fresh Supabase project SQL Editor.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- DROP EXISTING TABLES (safe re-run)
-- ============================================================================
DROP TABLE IF EXISTS public.action_logs CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.join_requests CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.qr_codes CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.email_accounts CASCADE;
DROP TABLE IF EXISTS public.group_links CASCADE;

-- ============================================================================
-- 1. ADMINS TABLE
-- Columns: from auth.ts (username, password_hash, role, active) + add_admin.sql
-- ============================================================================
CREATE TABLE public.admins (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role          text NOT NULL DEFAULT 'SUB',   -- 'MAIN' or 'SUB'
    active        boolean NOT NULL DEFAULT true,
    created_at    timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. TEAMS TABLE
-- Columns: COMPLETE_DATABASE_SETUP.sql + fix_sync_and_qr.sql (team_number) + database_setup.sql
-- ============================================================================
CREATE TABLE public.teams (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         text NOT NULL,
    unique_code  text UNIQUE NOT NULL,
    leader_id    uuid,                           -- FK added after users
    payment_mode text NOT NULL DEFAULT 'INDIVIDUAL',
    max_members  integer NOT NULL DEFAULT 4,
    status       text NOT NULL DEFAULT 'PENDING',
    team_number  text UNIQUE,                    -- from fix_sync_and_qr.sql
    created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 3. QR CODES TABLE
-- Columns: COMPLETE_DATABASE_SETUP.sql + daily_limit added in master
-- ============================================================================
CREATE TABLE public.qr_codes (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    qr_image_url text NOT NULL,
    upi_id       text NOT NULL,
    upi_name     text DEFAULT 'TechSprint Event',
    category     text DEFAULT 'MAIN',
    amount       integer NOT NULL DEFAULT 800,
    today_usage  integer NOT NULL DEFAULT 0,
    daily_limit  integer NOT NULL DEFAULT 100,
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 4. USERS TABLE
-- Columns: COMPLETE_DATABASE_SETUP.sql + database_setup.sql (verified_by, is_present)
--          + add_tshirt_column.sql (tshirt_size) + add_attendance.sql (attended_at)
-- ============================================================================
CREATE TABLE public.users (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name           text NOT NULL,
    reg_no         text NOT NULL,
    email          text NOT NULL,
    phone          text NOT NULL,
    college        text NOT NULL,
    branch         text NOT NULL DEFAULT 'N/A',
    year           text NOT NULL DEFAULT 'I',
    tshirt_size    text DEFAULT 'M',
    role           text NOT NULL DEFAULT 'MEMBER',
    status         text NOT NULL DEFAULT 'UNPAID',
    team_id        uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    transaction_id text,
    screenshot_url text,
    assigned_qr_id uuid REFERENCES public.qr_codes(id),
    verified_by    uuid,                          -- admin id who verified
    attendance     boolean DEFAULT false,
    is_present     boolean DEFAULT false,
    attended_at    timestamp with time zone,
    created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add leader_id FK to teams (now that users exists)
ALTER TABLE public.teams
    ADD CONSTRAINT fk_teams_leader
    FOREIGN KEY (leader_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. EMAIL ACCOUNTS TABLE
-- Columns: email.ts uses email_address, app_password, smtp_host, smtp_port, sender_name, active
-- ============================================================================
CREATE TABLE public.email_accounts (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_address text NOT NULL,
    app_password  text NOT NULL,
    smtp_host     text NOT NULL DEFAULT 'smtp.gmail.com',
    smtp_port     integer NOT NULL DEFAULT 465,
    sender_name   text DEFAULT 'TechSprint Event',
    active        boolean NOT NULL DEFAULT true,
    created_at    timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 6. GROUP LINKS TABLE
-- Columns: database_setup.sql uses college_name + whatsapp_link
-- ============================================================================
CREATE TABLE public.group_links (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    college_name  text UNIQUE NOT NULL,
    whatsapp_link text NOT NULL,
    created_at    timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 7. ACTION LOGS TABLE
-- Columns: supabase-actions.ts inserts admin_id, user_id, action
-- ============================================================================
CREATE TABLE public.action_logs (
    id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id   uuid REFERENCES public.admins(id) ON DELETE SET NULL,
    user_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action     text NOT NULL,
    details    jsonb,
    timestamp  timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 8. SUPPORT TICKETS TABLE
-- Columns: supabase-actions.ts inserts user_id, issue_type, description, status
-- ============================================================================
CREATE TABLE public.support_tickets (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    issue_type  text,
    description text NOT NULL,
    status      text NOT NULL DEFAULT 'OPEN',
    created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 9. JOIN REQUESTS TABLE
-- Columns: anonymous_join_requests.sql adds candidate_data (jsonb), user_id nullable
-- ============================================================================
CREATE TABLE public.join_requests (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id        uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id        uuid REFERENCES public.users(id) ON DELETE CASCADE,  -- nullable
    candidate_data jsonb,
    status         text NOT NULL DEFAULT 'PENDING',
    created_at     timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 10. ATTENDANCE TABLE (separate log table - from fix_sync_and_qr.sql)
-- ============================================================================
CREATE TABLE public.attendance (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid REFERENCES public.users(id) ON DELETE CASCADE,
    team_id         uuid REFERENCES public.teams(id) ON DELETE SET NULL,
    attendance_date date NOT NULL DEFAULT CURRENT_DATE,
    attendance_time text NOT NULL DEFAULT '00:00',
    status          text DEFAULT 'PRESENT',
    created_at      timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, attendance_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email        ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_reg_no       ON public.users(reg_no);
CREATE INDEX IF NOT EXISTS idx_users_status       ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_team_id      ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_phone        ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_is_present   ON public.users(is_present);
CREATE INDEX IF NOT EXISTS idx_teams_unique_code  ON public.teams(unique_code);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id    ON public.teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON public.join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_join_candidate_email ON public.join_requests((candidate_data->>'email'));
CREATE INDEX IF NOT EXISTS idx_action_logs_admin  ON public.action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user    ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm    ON public.users USING gin (name gin_trgm_ops);

-- ============================================================================
-- PERMISSIONS (disable RLS, grant full access)
-- ============================================================================
ALTER TABLE public.admins          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_links     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance      DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- REALTIME
-- ============================================================================
ALTER TABLE public.users           REPLICA IDENTITY FULL;
ALTER TABLE public.teams           REPLICA IDENTITY FULL;
ALTER TABLE public.qr_codes        REPLICA IDENTITY FULL;
ALTER TABLE public.admins          REPLICA IDENTITY FULL;
ALTER TABLE public.join_requests   REPLICA IDENTITY FULL;
ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.action_logs     REPLICA IDENTITY FULL;
ALTER TABLE public.attendance      REPLICA IDENTITY FULL;

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- ============================================================================
-- STORAGE (for screenshot uploads)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR ALL USING (bucket_id = 'screenshots')
WITH CHECK (bucket_id = 'screenshots');

GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

-- ============================================================================
-- TEAM NUMBER TRIGGER (auto-generates A100, A110, etc.)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS team_number_seq START 1 INCREMENT 1;

CREATE OR REPLACE FUNCTION public.generate_team_number()
RETURNS text AS $$
DECLARE seq_val integer;
BEGIN
    seq_val := nextval('team_number_seq');
    RETURN 'A' || LPAD((seq_val * 10)::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

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
FOR EACH ROW EXECUTE FUNCTION public.assign_team_number();

-- ============================================================================
-- SEED ADMIN USERS
-- ============================================================================
INSERT INTO public.admins (username, password_hash, role, active)
VALUES
    ('dheeraj', 'DheerajGowd@541',       'MAIN', true),
    ('aman',    'Aman@1907Syed',          'MAIN', true),
    ('javya',   'Javya@2705Yalluri',      'SUB',  true),
    ('rafi',    'Rafikarishma@12',        'SUB',  true)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    active = true;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' ORDER BY table_name;

SELECT username, role, active FROM public.admins;
