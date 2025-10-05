#!/usr/bin/env tsx

/**
 * Database Seeding Script
 * Creates initial test data for development
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';

async function seedDatabase() {
  console.log('🌱 Seeding database with test data...');

  const supabase = createClient(
    config.database.supabase.url,
    config.database.supabase.serviceKey,
    {
      auth: { persistSession: false }
    }
  );

  try {
    // Create test user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        timezone: 'Europe/Berlin',
        preferences: {
          language: 'en',
          defaultReminderMinutes: 15,
          dailySummaryEnabled: true,
          dailySummaryTime: '09:00'
        }
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating test user:', userError);
      return;
    }

    console.log('👤 Created test user:', user.id);

    // Create user channel for Telegram
    const { error: channelError } = await supabase
      .from('user_channels')
      .insert({
        user_id: user.id,
        channel_type: 'telegram',
        channel_identifier: config.server.nodeEnv === 'development' ? 'test-user-123' : process.env.TEST_USER_TELEGRAM_ID || 'test',
        is_primary: true,
        channel_metadata: {
          first_name: 'Test',
          username: 'testuser'
        }
      });

    if (channelError) {
      console.error('❌ Error creating user channel:', channelError);
      return;
    }

    console.log('📱 Created Telegram channel');

    // Create test projects
    const projects = [
      {
        name: 'Personal',
        description: 'Personal tasks and reminders',
        owner_id: user.id,
        settings: {
          defaultPriority: 3,
          allowGuestTasks: false
        }
      },
      {
        name: 'Work',
        description: 'Work-related tasks and projects',
        owner_id: user.id,
        settings: {
          defaultPriority: 4,
          allowGuestTasks: true
        }
      }
    ];

    const { data: createdProjects, error: projectsError } = await supabase
      .from('projects')
      .insert(projects)
      .select();

    if (projectsError) {
      console.error('❌ Error creating projects:', projectsError);
      return;
    }

    console.log('📁 Created projects:', createdProjects.map(p => p.name).join(', '));

    // Create conversation context
    const { error: contextError } = await supabase
      .from('conversation_context')
      .insert({
        user_id: user.id,
        current_project_id: createdProjects[0].id,
        context_data: {
          lastMessages: [],
          preferences: {
            preferredTimeFormat: '24h',
            timezone: 'Europe/Berlin'
          }
        },
        conversation_state: 'idle'
      });

    if (contextError) {
      console.error('❌ Error creating conversation context:', contextError);
      return;
    }

    console.log('💬 Created conversation context');

    // Create sample tasks
    const tasks = [
      {
        project_id: createdProjects[0].id, // Personal
        title: 'Buy groceries',
        description: 'Milk, bread, eggs, and coffee',
        status: 'open',
        priority: 3,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        tags: ['shopping', 'urgent'],
        created_by: user.id,
        assigned_to: user.id
      },
      {
        project_id: createdProjects[0].id, // Personal
        title: 'Call dentist',
        description: 'Schedule annual checkup',
        status: 'open',
        priority: 2,
        tags: ['health'],
        created_by: user.id,
        assigned_to: user.id
      },
      {
        project_id: createdProjects[1].id, // Work
        title: 'Review pull request',
        description: 'Review the new authentication feature PR',
        status: 'in_progress',
        priority: 4,
        due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        tags: ['code-review', 'urgent'],
        created_by: user.id,
        assigned_to: user.id
      },
      {
        project_id: createdProjects[1].id, // Work
        title: 'Write documentation',
        description: 'Document the new API endpoints',
        status: 'done',
        priority: 3,
        completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        tags: ['documentation'],
        created_by: user.id,
        assigned_to: user.id
      }
    ];

    const { data: createdTasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks)
      .select();

    if (tasksError) {
      console.error('❌ Error creating tasks:', tasksError);
      return;
    }

    console.log('✅ Created tasks:', createdTasks.map(t => t.title).join(', '));

    // Create a sample notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        task_id: createdTasks[2].id, // Review pull request
        type: 'reminder',
        channel_type: 'telegram',
        scheduled_for: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
        message_text: '⏰ Reminder: Review pull request is due soon!',
        metadata: {
          taskTitle: createdTasks[2].title,
          projectName: 'Work'
        }
      });

    if (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      return;
    }

    console.log('🔔 Created sample notification');

    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('Test data created:');
    console.log(`   👤 User ID: ${user.id}`);
    console.log(`   📱 Telegram ID: test-user-123`);
    console.log(`   📁 Projects: ${createdProjects.length}`);
    console.log(`   ✅ Tasks: ${createdTasks.length}`);
    console.log('');
    console.log('You can now test the bot with this user data.');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();