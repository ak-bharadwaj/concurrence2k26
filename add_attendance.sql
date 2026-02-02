-- TechSprint Attendance Activation Script
-- Execute this in your Supabase SQL Editor

-- 1. Add is_present column to track venue check-ins
alter table users add column if not exists is_present boolean default false;

-- 2. Add attended_at timestamp for precise logging
alter table users add column if not exists attended_at timestamp with time zone;

-- 3. Add index for fast scanning lookups
create index if not exists idx_users_reg_no on users(reg_no);
create index if not exists idx_users_is_present on users(is_present);
