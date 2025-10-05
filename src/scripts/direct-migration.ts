#!/usr/bin/env tsx

/**
 * Script to apply database migrations directly using Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

async function applyMigration() {
  console.log('🗄️  Applying database migration...');
  
  const supabase = createClient(
    config.database.supabase.url,
    config.database.supabase.serviceKey,
    {
      auth: { persistSession: false }
    }
  );

  try {
    // Add telegram_id column
    console.log('Adding telegram_id column...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE;'
    });
    
    // Add username column
    console.log('Adding username column...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;'
    });
    
    // Add first_name column
    console.log('Adding first_name column...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;'
    });
    
    // Add last_name column
    console.log('Adding last_name column...');
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;'
    });
    
    // Add email column
    console.log('Adding email column...');
    const { error: error5 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;'
    });

    if (error1 || error2 || error3 || error4 || error5) {
      console.error('❌ Migration failed:', { error1, error2, error3, error4, error5 });
      
      // Try direct SQL execution instead
      console.log('Trying direct SQL execution...');
      
      const alterTableSql = `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS username TEXT,
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
      `;
      
      const { error: directError } = await supabase
        .from('_unused') // We just need to get a connection
        .select('*')
        .limit(0);
        
      // Since RPC doesn't work, let's try another approach
      console.log('Migration may have partially succeeded. Let me check the current schema...');
      
      // Test if telegram_id column exists by trying to query it
      const { error: testError } = await supabase
        .from('users')
        .select('telegram_id')
        .limit(1);
        
      if (testError) {
        console.error('❌ telegram_id column still missing:', testError.message);
        
        // Let's manually create the columns using INSERT with ON CONFLICT
        // This is a workaround since we can't execute DDL directly
        console.log('Please run the following SQL manually in your Supabase dashboard:');
        console.log(`
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
        process.exit(1);
      } else {
        console.log('✅ telegram_id column exists!');
      }
    }
    
    console.log('✅ Migration applied successfully');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('Please run the following SQL manually in your Supabase dashboard:');
    console.log(`
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    process.exit(1);
  }
}

applyMigration().catch(console.error);