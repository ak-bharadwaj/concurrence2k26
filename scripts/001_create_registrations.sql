-- Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id TEXT UNIQUE NOT NULL,
  
  -- Participant details
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  college TEXT NOT NULL,
  year TEXT NOT NULL,
  
  -- Team details (optional)
  team_name TEXT,
  team_members JSONB DEFAULT '[]'::jsonb,
  
  -- Event details
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount INTEGER NOT NULL,
  
  -- Payment details
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'verified', 'rejected')),
  transaction_id TEXT,
  payment_screenshot_url TEXT,
  
  -- Admin notes
  admin_notes TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_registrations_email ON public.registrations(email);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON public.registrations(created_at DESC);

-- Enable RLS
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for public registration)
CREATE POLICY "Anyone can register" ON public.registrations
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only authenticated users (admins) can view all registrations
CREATE POLICY "Admins can view all registrations" ON public.registrations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users (admins) can update registrations
CREATE POLICY "Admins can update registrations" ON public.registrations
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy: Users can view their own registration by email (for success page)
CREATE POLICY "Users can view own registration" ON public.registrations
  FOR SELECT
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_registrations_updated_at ON public.registrations;
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
