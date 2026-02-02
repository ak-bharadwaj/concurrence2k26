-- TechSprint Real-time Activation Script
-- Execute this in your Supabase SQL Editor to enable immediate data sync

-- 1. Enable Realtime for the 'users' table (Handles approvals, verification, logins)
alter publication supabase_realtime add table users;

-- 2. Enable Realtime for the 'teams' table (Handles team joining, name changes)
alter publication supabase_realtime add table teams;

-- 3. Enable Realtime for 'support_tickets' (Handles admin responses to students)
alter publication supabase_realtime add table support_tickets;

-- 4. Enable Realtime for 'join_requests' (Handles team member approvals)
alter publication supabase_realtime add table join_requests;

-- 5. Enable Realtime for 'qr_codes' (Handles admin QR management)
alter publication supabase_realtime add table qr_codes;

-- 6. Enable Realtime for 'action_logs' (Handles admin activity tracking)
alter publication supabase_realtime add table action_logs;

-- Note: If some tables are already in the publication, the above commands might error.
-- You can check the current publication status in the Supabase Dashboard -> Database -> Replication.
