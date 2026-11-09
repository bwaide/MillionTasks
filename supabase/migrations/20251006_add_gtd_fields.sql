-- Add GTD (Getting Things Done) fields to tasks table
-- Implements NOW/NEXT/LATER scheduling system

-- Add scheduled_date for when task should be worked on
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;

-- Add GTD status classification
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS gtd_status TEXT CHECK (gtd_status IN ('now', 'next', 'later'));

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date)
WHERE scheduled_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_gtd_status ON tasks(gtd_status)
WHERE gtd_status IS NOT NULL;

-- Create composite index for common query pattern (user's NOW tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_user_gtd ON tasks(created_by, gtd_status)
WHERE gtd_status IS NOT NULL;

-- Add comment explaining the GTD system
COMMENT ON COLUMN tasks.gtd_status IS 'GTD classification: now (today, max 3), next (upcoming), later (backlog)';
COMMENT ON COLUMN tasks.scheduled_date IS 'Date when task should be worked on (used with gtd_status)';
