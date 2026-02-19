-- ============================================================================
-- FIX: Add detailed logging to track registration failures
-- ============================================================================
-- This creates a table to log all registration attempts
-- ============================================================================

-- Create registration attempts log table
CREATE TABLE IF NOT EXISTS public.registration_attempts (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email text,
    reg_no text,
    name text,
    phone text,
    step text,
    error_message text,
    request_data jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grant permissions
GRANT ALL ON public.registration_attempts TO anon, authenticated, service_role;

-- Disable RLS
ALTER TABLE public.registration_attempts DISABLE ROW LEVEL SECURITY;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_registration_attempts_email ON public.registration_attempts(email);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_created_at ON public.registration_attempts(created_at DESC);

-- Check recent attempts
SELECT 
    email,
    step,
    error_message,
    created_at
FROM public.registration_attempts
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
