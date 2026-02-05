-- HIGH CONCURRENCY OPTIMIZATION SCRIPT
-- Run this in your Supabase SQL Editor to handle 1k+ concurrent users smoothly.

-- 1. Phone Number Lookup Speed (Critical for checkUserAvailability)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 2. Email Exact Match Speed (Faster than TRGM for login/registration checks)
CREATE INDEX IF NOT EXISTS idx_users_email_btree ON users(email);

-- 3. QR Code Allocation Speed (Critical for Payment Step)
-- This combined index speeds up the filtering for active QRs with specific amounts
CREATE INDEX IF NOT EXISTS idx_qr_codes_allocation ON qr_codes(active, amount, today_usage);

-- 4. Join Requests by Team (Speed up Leader Dashboard)
CREATE INDEX IF NOT EXISTS idx_join_requests_team_status ON join_requests(team_id, status);

-- 5. Team Lookup by Code (Speed up joining)
CREATE INDEX IF NOT EXISTS idx_teams_code_btree ON teams(unique_code);

-- 6. Optimize Realtime Performance
-- Ensure replica identity is set to efficient mode if not already (FULL is safe but heavier)
-- ALTER TABLE users REPLICA IDENTITY INDEX idx_users_id; -- (Optional advanced tuning)

-- Note: Please run "VACUUM ANALYZE" manually in a separate SQL query window if possible, 
-- otherwise Postgres will auto-vacuum eventually.
