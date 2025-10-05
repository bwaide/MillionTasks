#!/usr/bin/env tsx

/**
 * MillionTasks Simple Startup Test
 * Tests basic components before full integration
 */

import { config, hasValidCredentials } from './config/index.js';
import { createClient } from '@supabase/supabase-js';

async function main() {
  console.log('🚀 Testing MillionTasks components...');
  
  // Test configuration
  console.log('📋 Testing configuration...');
  const credentials = hasValidCredentials();
  console.log('  Supabase:', credentials.supabase ? '✅' : '❌');
  console.log('  Telegram:', credentials.telegram ? '✅' : '❌');
  console.log('  AI Service:', credentials.ai ? '✅' : '❌');

  if (!credentials.supabase) {
    console.error('❌ Supabase credentials missing');
    return;
  }

  // Test database connection
  console.log('🗄️  Testing database connection...');
  try {
    const supabase = createClient(
      config.database.supabase.url,
      config.database.supabase.serviceKey,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return;
  }

  // Test AI service
  if (credentials.ai) {
    console.log('🤖 Testing AI service...');
    try {
      const { OpenAIProvider } = await import('./infrastructure/ai/OpenAIProvider.js');
      const aiProvider = new OpenAIProvider({
        apiKey: config.ai.openai!.apiKey,
        model: config.ai.openai!.model
      });
      
      const isHealthy = await aiProvider.isHealthy();
      console.log('  AI Service:', isHealthy ? '✅' : '❌');
    } catch (error) {
      console.log('  AI Service: ❌ (Import error - files may not exist yet)');
    }
  }

  // Test Telegram bot (basic)
  if (credentials.telegram) {
    console.log('📱 Testing Telegram bot token...');
    try {
      const response = await fetch(`https://api.telegram.org/bot${config.messengers.telegram.token}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        console.log(`✅ Telegram bot: @${data.result.username}`);
      } else {
        console.log('❌ Telegram bot token invalid');
      }
    } catch (error) {
      console.log('❌ Telegram API test failed:', error);
    }
  }

  console.log('\n🎯 Component test completed!');
  console.log('Next: Fix missing files and run full startup');
}

main().catch(console.error);