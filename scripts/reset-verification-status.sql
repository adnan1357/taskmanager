-- This script resets the email_verified flag in user metadata to allow testing of the verification process
-- Run this on specific test users, not on production data!

-- 1. Update user metadata to set email_verified to false
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{email_verified}',
  'false'::jsonb,
  true
)
WHERE email = 'YOUR_TEST_EMAIL@example.com';  -- Replace with your test email!

-- 2. Delete existing verification codes for this user
DELETE FROM public.email_verification_codes 
WHERE email = 'YOUR_TEST_EMAIL@example.com';  -- Replace with your test email!

-- 3. Optional: Set email_confirmed_at to NULL for full flow testing
-- WARNING: This will disable the user's login until verified
UPDATE auth.users
SET email_confirmed_at = NULL
WHERE email = 'YOUR_TEST_EMAIL@example.com';  -- Replace with your test email!

-- 4. To run this script:
-- 1. Login to your Supabase dashboard
-- 2. Go to SQL Editor
-- 3. Replace 'YOUR_TEST_EMAIL@example.com' with your actual test email address
-- 4. Run this script
-- 5. Test the login flow 