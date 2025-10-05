import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DatabaseConnectedHandler } from '../DatabaseConnectedHandler.js';
import { Context } from 'telegraf';
import { SupabaseUserRepository } from '../../../database/repositories/SupabaseUserRepository.js';
import { SupabaseTaskRepository } from '../../../database/repositories/SupabaseTaskRepository.js';
import { SupabaseProjectRepository } from '../../../database/repositories/SupabaseProjectRepository.js';
import { CreateTaskUseCase } from '../../../../application/use-cases/tasks/CreateTaskUseCase.js';
import { ListTasksUseCase } from '../../../../application/use-cases/tasks/ListTasksUseCase.js';
import { MessageProcessor } from '../../../../application/services/MessageProcessor.js';
import { AIService } from '../../../ai/AIService.js';
import { config } from '../../../../config/index.js';

/**
 * REAL Integration Test for /start Command
 * 
 * This test actually connects to the database and tests the full flow
 * that a real user would experience when sending /start
 */

describe('Start Command Integration Test', () => {
  let handler: DatabaseConnectedHandler;
  let supabase: any;
  let userRepository: SupabaseUserRepository;
  let taskRepository: SupabaseTaskRepository;
  let projectRepository: SupabaseProjectRepository;
  let createTaskUseCase: CreateTaskUseCase;
  let listTasksUseCase: ListTasksUseCase;
  let messageProcessor: MessageProcessor;
  let testUserId: string | null = null;
  let testProjectId: string | null = null;

  beforeEach(async () => {
    // Connect to real database
    supabase = createClient(
      config.database.supabase.url,
      config.database.supabase.serviceKey,
      {
        auth: { persistSession: false }
      }
    );

    // Initialize real repositories
    userRepository = new SupabaseUserRepository(supabase);
    taskRepository = new SupabaseTaskRepository(supabase);
    projectRepository = new SupabaseProjectRepository(supabase);

    // Initialize use cases
    createTaskUseCase = new CreateTaskUseCase(
      taskRepository,
      projectRepository,
      userRepository
    );
    listTasksUseCase = new ListTasksUseCase(taskRepository, projectRepository);

    // Mock AI service for now (we can test AI separately)
    const mockAiService = {
      isHealthy: () => Promise.resolve(true),
      processText: () => Promise.resolve({ 
        intent: 'create_task', 
        confidence: 0.9, 
        data: { title: 'Test task' } 
      })
    } as unknown as AIService;

    messageProcessor = new MessageProcessor(mockAiService);

    // Initialize handler
    handler = new DatabaseConnectedHandler(
      userRepository,
      taskRepository,
      projectRepository,
      createTaskUseCase,
      listTasksUseCase,
      messageProcessor
    );
  });

  afterEach(async () => {
    // Clean up test data
    if (testProjectId) {
      try {
        await projectRepository.delete(testProjectId);
      } catch (error) {
        console.log('Error cleaning up test project:', error);
      }
    }
    
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('Error cleaning up test user:', error);
      }
    }
  });

  it('should handle /start command end-to-end for new user', async () => {
    // Create a realistic Telegram context
    const mockReply = vi.fn().mockResolvedValue({});
    const ctx = {
      message: { text: '/start' },
      from: {
        id: 999999999, // Unique test ID
        username: 'testuser999',
        first_name: 'Integration',
        last_name: 'Test',
        is_bot: false,
        language_code: 'en'
      },
      reply: mockReply,
      chat: { id: 999999999, type: 'private' }
    } as unknown as Context;

    // Clean up any existing test data first
    try {
      const existingUser = await userRepository.findByTelegramId('999999999');
      if (existingUser) {
        const projects = await projectRepository.findByUserId(existingUser.id!);
        for (const project of projects) {
          await projectRepository.delete(project.id!);
        }
        await userRepository.delete(existingUser.id!);
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    console.log('🧪 Testing /start command for new user...');

    // Execute the /start command
    await handler.handle(ctx);

    // Verify the response was sent
    expect(mockReply).toHaveBeenCalledWith(
      expect.stringContaining('👋 Welcome to MillionTasks!')
    );

    // Verify user was created in database
    const createdUser = await userRepository.findByTelegramId('999999999');
    expect(createdUser).toBeTruthy();
    expect(createdUser!.firstName).toBe('Integration');
    expect(createdUser!.lastName).toBe('Test');
    expect(createdUser!.username).toBe('testuser999');
    expect(createdUser!.telegramId).toBe('999999999');

    testUserId = createdUser!.id!; // Store for cleanup

    // Verify user_channels entry was created
    const { data: channels, error: channelsError } = await supabase
      .from('user_channels')
      .select('*')
      .eq('channel_type', 'telegram')
      .eq('channel_identifier', '999999999');

    expect(channelsError).toBeNull();
    expect(channels).toHaveLength(1);
    expect(channels[0].user_id).toBe(createdUser!.id);

    // Verify default project was created
    const projects = await projectRepository.findByUserId(createdUser!.id!);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe('Personal');
    expect(projects[0].ownerId).toBe(createdUser!.id);
    expect(projects[0].isActive).toBe(true);

    testProjectId = projects[0].id!; // Store for cleanup

    console.log('✅ /start command test passed - user and project created successfully');
  });

  it('should handle /start command for existing user', async () => {
    // Create a user first
    const mockReply = vi.fn().mockResolvedValue({});
    const ctx = {
      message: { text: '/start' },
      from: {
        id: 888888888,
        username: 'existinguser',
        first_name: 'Existing',
        last_name: 'User'
      },
      reply: mockReply
    } as unknown as Context;

    // First call - should create user
    await handler.handle(ctx);
    
    const user = await userRepository.findByTelegramId('888888888');
    testUserId = user!.id!;
    
    const projects = await projectRepository.findByUserId(user!.id!);
    testProjectId = projects[0]?.id!;

    // Reset mock
    mockReply.mockClear();

    // Second call - should work with existing user
    await handler.handle(ctx);

    // Should still send welcome message
    expect(mockReply).toHaveBeenCalledWith(
      expect.stringContaining('👋 Welcome to MillionTasks!')
    );

    // Should not create duplicate user
    const { data: allUsers } = await supabase
      .from('user_channels')
      .select('*')
      .eq('channel_type', 'telegram')
      .eq('channel_identifier', '888888888');

    expect(allUsers).toHaveLength(1); // Only one user channel entry

    console.log('✅ Existing user test passed');
  });

  it('should verify database schema compatibility', async () => {
    console.log('🔍 Testing database schema compatibility...');

    // Test that all expected columns exist
    try {
      // Test users table columns
      const { error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, email, is_active, timezone, preferences, created_at, updated_at')
        .limit(1);

      expect(usersError).toBeNull();

      // Test projects table columns
      const { error: projectsError } = await supabase
        .from('projects')
        .select('id, name, description, owner_id, settings, is_archived, is_active, created_at, updated_at')
        .limit(1);

      expect(projectsError).toBeNull();

      // Test user_channels table columns
      const { error: channelsError } = await supabase
        .from('user_channels')
        .select('id, user_id, channel_type, channel_identifier, channel_metadata, is_primary, created_at')
        .limit(1);

      expect(channelsError).toBeNull();

      console.log('✅ Database schema compatibility verified');
    } catch (error) {
      console.error('❌ Schema compatibility test failed:', error);
      throw error;
    }
  });

  it('should handle edge cases gracefully', async () => {
    console.log('🧪 Testing edge cases...');

    // Test with minimal Telegram user data
    const mockReply = vi.fn().mockResolvedValue({});
    const ctx = {
      message: { text: '/start' },
      from: {
        id: 777777777,
        first_name: 'Minimal' // No last_name, no username
      },
      reply: mockReply
    } as unknown as Context;

    await handler.handle(ctx);

    const user = await userRepository.findByTelegramId('777777777');
    testUserId = user!.id!;

    expect(user).toBeTruthy();
    expect(user!.firstName).toBe('Minimal');
    expect(user!.lastName).toBeUndefined();
    expect(user!.username).toBeUndefined();

    // Should still create project
    const projects = await projectRepository.findByUserId(user!.id!);
    expect(projects).toHaveLength(1);
    testProjectId = projects[0].id!;

    console.log('✅ Edge cases test passed');
  });
});