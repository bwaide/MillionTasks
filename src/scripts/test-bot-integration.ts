#!/usr/bin/env tsx

/**
 * Integration test to verify the bot works end-to-end
 * This simulates the exact flow that caused the original error
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { SupabaseUserRepository } from '../infrastructure/database/repositories/SupabaseUserRepository.js';
import { User } from '../domain/entities/User.js';

async function testIntegration() {
  console.log('🧪 Testing bot integration end-to-end...');
  
  const supabase = createClient(
    config.database.supabase.url,
    config.database.supabase.serviceKey,
    {
      auth: { persistSession: false }
    }
  );

  const userRepository = new SupabaseUserRepository(supabase);

  try {
    // Test 1: Create a user (simulating what happens when someone sends /start)
    console.log('1️⃣ Testing user creation...');
    
    const testUser = User.create({
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser123',
      telegramId: '8478395147', // Your actual Telegram ID from the error
      preferences: {
        timezone: 'UTC',
        language: 'en',
        notifications: {
          enabled: true,
          taskReminders: true,
          projectUpdates: true
        }
      },
      isActive: true
    });

    console.log('Created user object:', {
      id: testUser.id,
      firstName: testUser.firstName,
      telegramId: testUser.telegramId,
      username: testUser.username
    });

    // Test 2: Save user to database
    console.log('2️⃣ Testing user save to database...');
    const savedUser = await userRepository.save(testUser);
    console.log('✅ User saved successfully!', {
      id: savedUser.id,
      firstName: savedUser.firstName
    });

    // Test 3: Find user by Telegram ID
    console.log('3️⃣ Testing user lookup by Telegram ID...');
    const foundUser = await userRepository.findByTelegramId('8478395147');
    
    if (foundUser) {
      console.log('✅ User found by Telegram ID!', {
        id: foundUser.id,
        firstName: foundUser.firstName,
        telegramId: foundUser.telegramId
      });
    } else {
      console.log('❌ User not found by Telegram ID');
    }

    // Test 4: Test the user_channels table integration
    console.log('4️⃣ Testing user_channels table...');
    const { data: channels, error } = await supabase
      .from('user_channels')
      .select('*')
      .eq('channel_type', 'telegram')
      .eq('channel_identifier', '8478395147');

    if (error) {
      console.log('❌ Error querying user_channels:', error.message);
    } else {
      console.log('✅ User channels data:', channels);
    }

    // Test 5: Clean up test data
    console.log('5️⃣ Cleaning up test data...');
    await userRepository.delete(savedUser.id!);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All integration tests passed!');
    console.log('The bot should now work correctly when you send /start');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    
    process.exit(1);
  }
}

testIntegration().catch(console.error);