#!/usr/bin/env tsx

/**
 * Script to apply database migrations directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
  console.log('🗄️  Applying database migration...');
  
  const supabase = createClient(
    config.database.supabase.url,
    config.database.supabase.serviceKey,
    {
      auth: { persistSession: false }
    }
  );

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251005103700_add_telegram_id_to_users.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration applied successfully');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);