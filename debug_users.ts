import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkUsers() {
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, telegram_id, created_at')
    .order('created_at', { ascending: false});

  console.log('All users:', JSON.stringify(users, null, 2));
  if (usersError) console.log('Users error:', usersError);

  // Get tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, status, created_by, assigned_to')
    .limit(10);

  console.log('\nTasks:', JSON.stringify(tasks, null, 2));
  if (tasksError) console.log('Tasks error:', tasksError);
}

checkUsers();
