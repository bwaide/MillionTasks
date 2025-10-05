#!/usr/bin/env tsx

/**
 * Database Migration Script
 * Runs SQL migrations against Supabase database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log('🗄️  Starting database migrations...');

  // Create Supabase client with service role key
  const supabase = createClient(
    config.database.supabase.url,
    config.database.supabase.serviceKey,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${config.database.supabase.serviceKey}` } }
    }
  );

  try {
    // Read and execute the initial schema migration
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Running initial schema migration...');
    
    // Split SQL into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Some errors are expected (e.g., extension already exists)
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Skipped: ${error.message}`);
          } else {
            console.error(`❌ Error executing statement: ${error.message}`);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Unexpected error: ${err}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Successful statements: ${successCount}`);
    if (errorCount > 0) {
      console.log(`   Errors (may be expected): ${errorCount}`);
    }

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'user_channels', 'projects', 'tasks', 'permissions']);

    if (tablesError) {
      console.error('❌ Error verifying tables:', tablesError);
    } else {
      console.log('📋 Tables created:', tables?.map(t => t.table_name).join(', ') || 'none');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationsDirectSQL() {
  console.log('🗄️  Running migrations via direct SQL execution...');
  console.log('📋 Please run the following SQL in your Supabase SQL editor:');
  console.log('   https://app.supabase.com/project/lwpnmhbuhtppvwijnhug/sql/new');
  console.log('');

  const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('--- COPY THE SQL BELOW ---');
  console.log(migrationSQL);
  console.log('--- END SQL ---');
  console.log('');
  console.log('After running the SQL, you can proceed with the application startup.');
}

// Check if we can use the RPC approach or need manual SQL
if (process.argv.includes('--manual') || process.argv.includes('--sql')) {
  runMigrationsDirectSQL();
} else {
  runMigrations().catch(error => {
    console.error('Migration failed, please run with --manual flag for SQL output');
    console.error(error);
    process.exit(1);
  });
}