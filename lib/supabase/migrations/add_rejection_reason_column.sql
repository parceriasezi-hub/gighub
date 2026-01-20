-- Migration to add provider_rejection_reason column
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS provider_rejection_reason TEXT;

-- Optional: Add a comment
COMMENT ON COLUMN profiles.provider_rejection_reason IS 'Reason for rejection or changes requested for provider application';
