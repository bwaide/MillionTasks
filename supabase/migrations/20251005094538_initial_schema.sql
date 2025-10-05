-- MillionTasks Initial Database Schema Migration
-- Version: 001
-- Description: Create core tables for users, projects, tasks, and messaging
-- Run Date: 2024-10-05

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (messenger-agnostic)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE
);

-- User channels (multiple messengers per user)
CREATE TABLE IF NOT EXISTS user_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  channel_identifier TEXT NOT NULL,
  channel_metadata JSONB DEFAULT '{}',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_type, channel_identifier)
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Permissions for project sharing
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'complete', 'add', 'edit', 'admin')),
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Conversation context for AI
CREATE TABLE IF NOT EXISTS conversation_context (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  context_data JSONB DEFAULT '{}',
  conversation_state TEXT DEFAULT 'idle'
);

-- Message log for AI learning and debugging
CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  channel_type TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  raw_message TEXT NOT NULL,
  interpreted_intent JSONB,
  action_taken JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  response_sent TEXT,
  processing_time_ms INTEGER,
  ai_confidence DECIMAL(3,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications queue
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  message_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance (create if not exists)
CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_channels_type_identifier ON user_channels(channel_type, channel_identifier);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_permissions_project_user ON permissions(project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_message_log_user_timestamp ON message_log(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for) WHERE status = 'pending';

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop and recreate to ensure consistency)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Drop existing and recreate to ensure consistency
DROP POLICY IF EXISTS "Service role bypass" ON users;
DROP POLICY IF EXISTS "Service role bypass" ON user_channels;
DROP POLICY IF EXISTS "Service role bypass" ON projects;
DROP POLICY IF EXISTS "Service role bypass" ON tasks;
DROP POLICY IF EXISTS "Service role bypass" ON permissions;
DROP POLICY IF EXISTS "Service role bypass" ON conversation_context;
DROP POLICY IF EXISTS "Service role bypass" ON message_log;
DROP POLICY IF EXISTS "Service role bypass" ON notifications;

-- Create RLS Policies - Allow service role to bypass RLS for bot operations
CREATE POLICY "Service role bypass" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON user_channels FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON projects FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON tasks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON permissions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON conversation_context FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON message_log FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON notifications FOR ALL TO service_role USING (true);