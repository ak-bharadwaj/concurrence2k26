-- ==========================================
-- FINAL SETUP & OPTIMIZATION SCRIPT
-- Run this SINGLE script in Supabase SQL Editor
-- ==========================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Admin User (Dheeraj)
INSERT INTO public.admins (username, password_hash, role)
VALUES 
    ('dheeraj', 'DheerajGowd@541', 'MAIN') 
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = 'MAIN';

-- 3. Core Performance Indexes (B-Tree for Exact Matches)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email_btree ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_unique_code ON teams(unique_code);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_allocation ON qr_codes(active, amount, today_usage);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- 4. Advanced Search Indexes (GIN/Trigram for Fuzzy Search)
CREATE INDEX IF NOT EXISTS idx_users_reg_no_trgm ON users USING gin (reg_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);

-- 5. Realtime Performance Tuning (Replica Identity)
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE qr_codes REPLICA IDENTITY FULL;
ALTER TABLE join_requests REPLICA IDENTITY FULL;
ALTER TABLE support_tickets REPLICA IDENTITY FULL;

-- 6. Maintenance (Vacuum)
-- Run "VACUUM ANALYZE" manually if possible, otherwise Postgres handles it.
