#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  console.log('🔄 Applying GTD migration...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // Read the migration file
  const migrationPath = join(process.cwd(), 'supabase/migrations/20251006_add_gtd_fields.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('📄 Migration SQL:');
  console.log(migrationSQL);
  console.log('');

  // Split the migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`[${i + 1}/${statements.length}] Executing:`);
    console.log(statement.substring(0, 100) + '...\n');

    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      // Try direct execution via REST API as fallback
      console.log('⚠️  RPC failed, trying direct execution...');

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ sql: statement })
      });

      if (!response.ok) {
        console.error(`❌ Failed to execute statement ${i + 1}:`);
        console.error(error);
        console.log('\n⚠️  Note: You may need to apply this migration manually via Supabase SQL Editor');
        console.log('📋 Copy the migration from: supabase/migrations/20251006_add_gtd_fields.sql');
        console.log('🔗 SQL Editor: https://supabase.com/dashboard/project/_/sql');
        process.exit(1);
      }
    }

    console.log(`✅ Statement ${i + 1} executed successfully\n`);
  }

  console.log('✅ Migration applied successfully!');

  // Verify the migration
  console.log('\n🔍 Verifying migration...');
  const { data, error } = await supabase
    .from('tasks')
    .select('scheduled_date, gtd_status')
    .limit(1);

  if (error) {
    console.error('❌ Verification failed:', error);
  } else {
    console.log('✅ Migration verified - GTD columns exist!');
  }
}

applyMigration().catch(console.error);
