-- SQL Fix: Allow Duplicate Team Names
-- Run this in your Supabase SQL Editor to remove the unique constraint on squad names

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_name_key;
