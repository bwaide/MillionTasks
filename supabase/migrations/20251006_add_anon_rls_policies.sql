-- Add RLS policies for anonymous (web app) access
-- This allows the web app to create users during authentication
-- and read/update their own data

-- Users table: Allow anon to insert (for user registration) and select/update own data
CREATE POLICY "Allow anon insert users" ON users
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow users to read own data" ON users
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow users to update own data" ON users
  FOR UPDATE TO anon
  USING (true);

-- Tasks table: Allow users to manage their own tasks
CREATE POLICY "Allow users to read own tasks" ON tasks
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow users to create tasks" ON tasks
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow users to update own tasks" ON tasks
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow users to delete own tasks" ON tasks
  FOR DELETE TO anon
  USING (true);

-- Projects table: Allow users to manage their own projects
CREATE POLICY "Allow users to read own projects" ON projects
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow users to create projects" ON projects
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow users to update own projects" ON projects
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow users to delete own projects" ON projects
  FOR DELETE TO anon
  USING (true);

-- Permissions table: Allow users to manage permissions
CREATE POLICY "Allow users to read permissions" ON permissions
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow users to create permissions" ON permissions
  FOR INSERT TO anon
  WITH CHECK (true);

-- Conversation context: Allow users to read/write their own context
CREATE POLICY "Allow users to read own context" ON conversation_context
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow users to create context" ON conversation_context
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow users to update own context" ON conversation_context
  FOR UPDATE TO anon
  USING (true);
