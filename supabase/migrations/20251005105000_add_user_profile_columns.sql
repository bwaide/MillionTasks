-- Add user profile columns to support Telegram user data
-- This migration adds the missing columns that the application expects

-- Add user profile columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT 'User',
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Update the timezone column to be more descriptive if needed
COMMENT ON COLUMN users.first_name IS 'User first name from messaging platform';
COMMENT ON COLUMN users.last_name IS 'User last name from messaging platform';
COMMENT ON COLUMN users.username IS 'Username from messaging platform';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.timezone IS 'User timezone preference';
COMMENT ON COLUMN users.preferences IS 'User preferences as JSON object';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';