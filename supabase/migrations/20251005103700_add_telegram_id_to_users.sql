-- Add telegram_id column to users table for backwards compatibility
-- This allows direct lookup without joining user_channels table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;

-- Create index for telegram_id lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

-- Add other common user fields that might be needed
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Create indexes for these fields
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);