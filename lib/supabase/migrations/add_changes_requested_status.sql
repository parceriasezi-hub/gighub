-- Migration to add 'changes_requested' to allowed status values
-- Run this in your Supabase SQL Editor

BEGIN;

-- Update profiles table constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_provider_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_provider_status_check 
  CHECK (provider_status IN ('pending', 'approved', 'rejected', 'suspended', 'changes_requested'));

-- Update providers table constraint
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_status_check;
ALTER TABLE providers ADD CONSTRAINT providers_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'changes_requested'));

COMMIT;
