-- Add missing columns to registrations table

-- Add full_name column if it doesn't exist (or use existing 'name' column)
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add department column
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS department TEXT;

-- Add year_of_study column
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS year_of_study TEXT;

-- Add selected_events as text array (in addition to existing events JSONB)
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS selected_events TEXT[] DEFAULT '{}';

-- Add total_fee column (if total_amount exists, we'll use this)
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS total_fee INTEGER DEFAULT 0;

-- Add verified_by as text (for email) instead of UUID
ALTER TABLE public.registrations DROP COLUMN IF EXISTS verified_by;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Update any existing data: copy name to full_name, year to year_of_study, total_amount to total_fee
UPDATE public.registrations SET 
  full_name = COALESCE(full_name, name),
  year_of_study = COALESCE(year_of_study, year),
  total_fee = COALESCE(total_fee, total_amount)
WHERE full_name IS NULL OR year_of_study IS NULL OR total_fee IS NULL;
