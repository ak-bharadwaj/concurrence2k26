-- Supercharge Performance avec Indexes
-- These indexes will significantly speed up the Admin Dashboard queries

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_reg_no_trgm ON users USING gin (reg_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_teams_unique_code ON teams(unique_code);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

-- Note: trgm indexes require pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Ensure Absolute Data Consistency for Real-time
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE teams REPLICA IDENTITY FULL;
ALTER TABLE qr_codes REPLICA IDENTITY FULL;
ALTER TABLE join_requests REPLICA IDENTITY FULL;
ALTER TABLE support_tickets REPLICA IDENTITY FULL;
