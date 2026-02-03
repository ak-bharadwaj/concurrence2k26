-- TechSprint 2K26 Security Hardening
-- Run this in the Supabase SQL Editor to enable RLS and secure sensitive tables.

-- 1. Enable RLS on sensitive tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- 2. Define Policies

-- ADMINS: Only service_role or specific authenticated functions should read
DROP POLICY IF EXISTS "Admins read access" ON public.admins;
CREATE POLICY "Admins read access" ON public.admins
FOR SELECT USING (true); -- We allow select for login, but in a real production, we'd restrict it to a secure function

-- EMAIL_ACCOUNTS: Restricted to service_role (server-side only)
DROP POLICY IF EXISTS "Email accounts read access" ON public.email_accounts;
CREATE POLICY "Email accounts read access" ON public.email_accounts
FOR SELECT TO service_role USING (true);

-- ACTION_LOGS: Only admins can read, anyone (authenticated/anon) can insert if they are logged
DROP POLICY IF EXISTS "Action logs read access" ON public.action_logs;
CREATE POLICY "Action logs read access" ON public.action_logs
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Action logs insert access" ON public.action_logs;
CREATE POLICY "Action logs insert access" ON public.action_logs
FOR INSERT WITH CHECK (true);

-- GROUP_LINKS: Public read, but only service_role/admin can edit
DROP POLICY IF EXISTS "Group links read access" ON public.group_links;
CREATE POLICY "Group links read access" ON public.group_links
FOR SELECT USING (active = true);

-- USERS & TEAMS: These remain relatively open for the frontend, but we enable RLS to be safe
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users public access" ON public.users;
CREATE POLICY "Users public access" ON public.users
FOR ALL USING (true);

DROP POLICY IF EXISTS "Teams public access" ON public.teams;
CREATE POLICY "Teams public access" ON public.teams
FOR ALL USING (true);

-- 3. Revoke general access to ensure policies are honored
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.teams TO anon, authenticated;
GRANT SELECT ON public.group_links TO anon, authenticated;
GRANT SELECT, INSERT ON public.action_logs TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
