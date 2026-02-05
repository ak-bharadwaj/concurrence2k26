-- Database Migration: Add T-Shirt Size Column
-- Run this in your Supabase SQL Editor

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tshirt_size text;

-- Optional: Initializing values if needed (e.g., setting M as default for existing records)
-- UPDATE public.users SET tshirt_size = 'M' WHERE tshirt_size IS NULL;
