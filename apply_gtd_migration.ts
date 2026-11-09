import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  console.log('Applying GTD migration via raw SQL...');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Try to select existing columns first to see current state
  const { data: before, error: beforeError } = await supabase
    .from('tasks')
    .select('*')
    .limit(1);

  console.log('Current task columns:', before ? Object.keys(before[0] || {}) : 'none');

  // Note: We can't run DDL via the REST API
  // The migration SQL needs to be run manually in Supabase SQL Editor
  // or via database connection

  console.log('\nTo apply this migration:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Run the following SQL:');
  console.log('\n--- BEGIN SQL ---');
  console.log(`
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gtd_status TEXT CHECK (gtd_status IN ('now', 'next', 'later'));

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_gtd_status ON tasks(gtd_status) WHERE gtd_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_gtd ON tasks(created_by, gtd_status) WHERE gtd_status IS NOT NULL;
  `);
  console.log('--- END SQL ---\n');

  console.log('Or run manually: npx supabase db push');
}

applyMigration();
