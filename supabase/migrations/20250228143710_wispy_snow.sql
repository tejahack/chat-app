/*
  # Create Online Users View and Presence Function

  1. New View
    - `online_users`
      - Shows users who have been active in the last 5 minutes
      - Includes user ID, display name, and last seen timestamp
  
  2. New Function
    - `update_user_presence()`
      - Updates the user's last_seen timestamp in the profiles table
      - Returns true on success
*/

-- Add last_seen column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Create a view for online users (active in the last 5 minutes)
CREATE OR REPLACE VIEW online_users AS
SELECT 
  id,
  display_name,
  last_seen
FROM 
  profiles
WHERE 
  last_seen > (now() - interval '5 minutes')
ORDER BY 
  display_name;

-- Create a function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET last_seen = now()
  WHERE id = auth.uid();
  
  RETURN TRUE;
END;
$$;

-- Update the policy for profiles to allow users to see all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);