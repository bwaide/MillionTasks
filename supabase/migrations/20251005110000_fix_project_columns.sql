-- Fix projects table to match repository expectations
-- Add is_active column and make is_archived complementary

-- Add is_active column (opposite of is_archived)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Update existing records to set is_active as opposite of is_archived
UPDATE projects 
SET is_active = NOT is_archived 
WHERE is_active IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- Add comment
COMMENT ON COLUMN projects.is_active IS 'Whether the project is active (opposite of is_archived)';