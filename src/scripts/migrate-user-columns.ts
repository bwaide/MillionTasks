#!/usr/bin/env tsx

/**
 * Script to add missing user profile columns to the database
 * Since we can't execute DDL through Supabase RPC, this script shows what needs to be run manually
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

async function checkAndMigrate() {
  console.log('🔍 Checking current user table schema...');
  
  const supabase = createClient(
    config.database.supabase.url,
    config.database.supabase.serviceKey,
    {
      auth: { persistSession: false }
    }
  );

  try {
    // Test if the columns exist by trying to select them
    const { data, error } = await supabase
      .from('users')
      .select('first_name, last_name, username, email')
      .limit(1);

    if (error) {
      console.error('❌ Missing columns detected:', error.message);
      console.log('\n📋 Please run the following SQL commands in your Supabase SQL Editor:');
      console.log('');
      console.log('-- Add missing user profile columns');
      console.log('ALTER TABLE users');
      console.log('ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT \'User\',');
      console.log('ADD COLUMN IF NOT EXISTS last_name TEXT,');
      console.log('ADD COLUMN IF NOT EXISTS username TEXT,');
      console.log('ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;');
      console.log('');
      console.log('-- Create indexes');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
      console.log('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
      console.log('');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
      console.log('');
      console.log('After running the SQL commands, restart the application.');
      
      process.exit(1);
    } else {
      console.log('✅ All required user columns exist!');
      console.log('📊 Sample data structure:', data?.[0] || 'No data yet');
    }
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  }
}

checkAndMigrate().catch(console.error);