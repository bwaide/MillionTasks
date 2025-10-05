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
 * END-TO-END Integration Test for /create Command
 *
 * This test reproduces the exact flow that happens when a user sends "/create First Task"
 * through the Telegram client. It tests the complete stack from Telegram context
 * through to database persistence.
 *
 * This will catch any bugs that unit tests miss!
 */
describe('Create Task End-to-End Integration Test', () => {
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

    // Mock AI service (we're testing the command handler, not AI)
    const mockAiService = {
      isHealthy: () => Promise.resolve(true),
      processMessage: (message: string) => Promise.resolve({
        intent: 'create_task',
        confidence: 0.9,
        extractedData: {
          title: message.replace(/^\/create\s*/i, '') || 'Untitled Task'
        },
        originalMessage: message
      }),
      extractTaskData: (message: string) => Promise.resolve({
        title: message.replace(/^\/create\s*/i, '') || 'Untitled Task',
        description: undefined,
        priority: undefined,
        tags: [],
        dueDate: undefined
      }),
      classifyIntent: () => Promise.resolve('create_task')
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
        console.log(`Cleaned up test project: ${testProjectId}`);
      } catch (error) {
        console.log('Error cleaning up test project:', error);
      }
    }

    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
        console.log(`Cleaned up test user: ${testUserId}`);
      } catch (error) {
        console.log('Error cleaning up test user:', error);
      }
    }
  });

  it('should handle /create command end-to-end from Telegram', async () => {
    console.log('🧪 Testing FULL /create command flow from Telegram...');

    // Step 1: Create a user first (simulating they already ran /start)
    const mockReply = vi.fn().mockResolvedValue({});
    const setupCtx = {
      message: { text: '/start' },
      from: {
        id: 111222333,
        username: 'createtestuser',
        first_name: 'Create',
        last_name: 'Tester',
        is_bot: false,
        language_code: 'en'
      },
      reply: mockReply,
      chat: { id: 111222333, type: 'private' }
    } as unknown as Context;

    // Clean up any existing test data first
    try {
      const existingUser = await userRepository.findByTelegramId('111222333');
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

    // Run /start to set up user
    await handler.handle(setupCtx);
    const user = await userRepository.findByTelegramId('111222333');
    expect(user).toBeTruthy();
    testUserId = user!.id!;

    const projects = await projectRepository.findByUserId(user!.id!);
    expect(projects.length).toBeGreaterThan(0);
    testProjectId = projects[0].id!;

    console.log(`✅ User setup complete: ${user!.id}`);

    // Step 2: Now send the /create command - THIS IS THE REAL TEST
    const createMockReply = vi.fn().mockResolvedValue({});
    const createCtx = {
      message: { text: '/create First Task' },
      from: {
        id: 111222333,
        username: 'createtestuser',
        first_name: 'Create',
        last_name: 'Tester',
        is_bot: false,
        language_code: 'en'
      },
      reply: createMockReply,
      chat: { id: 111222333, type: 'private' }
    } as unknown as Context;

    console.log('📨 Sending: /create First Task');

    // Execute the /create command - this should NOT throw any errors
    await handler.handle(createCtx);

    // Verify the response was successful
    expect(createMockReply).toHaveBeenCalled();
    const replyCall = createMockReply.mock.calls[0][0];
    console.log('📬 Reply:', replyCall);

    // Should NOT contain error messages
    expect(replyCall).not.toContain('❌');
    expect(replyCall).not.toContain('Failed');
    expect(replyCall).not.toContain('error');
    expect(replyCall).not.toContain('actual_hours');
    expect(replyCall).not.toContain('column');

    // Should contain success message
    expect(replyCall).toContain('✅');
    expect(replyCall).toContain('Task created');
    expect(replyCall).toContain('First Task');

    // Verify task was actually created in database
    const tasks = await taskRepository.findByCreatedById(user!.id!);
    expect(tasks.length).toBeGreaterThan(0);

    const createdTask = tasks.find(t => t.title === 'First Task');
    expect(createdTask).toBeTruthy();
    expect(createdTask!.projectId).toBe(projects[0].id);

    console.log(`✅ Task created successfully: ${createdTask!.id}`);

    // Cleanup the task
    await taskRepository.delete(createdTask!.id);
  });

  it('should handle /create with task text after command', async () => {
    console.log('🧪 Testing /create with inline task text...');

    // Setup user
    const mockReply = vi.fn().mockResolvedValue({});
    const setupCtx = {
      message: { text: '/start' },
      from: {
        id: 222333444,
        username: 'createtest2',
        first_name: 'Test',
        last_name: 'User2',
        is_bot: false,
        language_code: 'en'
      },
      reply: mockReply,
      chat: { id: 222333444, type: 'private' }
    } as unknown as Context;

    try {
      const existingUser = await userRepository.findByTelegramId('222333444');
      if (existingUser) {
        const projects = await projectRepository.findByUserId(existingUser.id!);
        for (const project of projects) {
          await projectRepository.delete(project.id!);
        }
        await userRepository.delete(existingUser.id!);
      }
    } catch (error) {
      // Ignore
    }

    await handler.handle(setupCtx);
    const user = await userRepository.findByTelegramId('222333444');
    testUserId = user!.id!;
    const projects = await projectRepository.findByUserId(user!.id!);
    testProjectId = projects[0].id!;

    // Test /create with different task text
    const createMockReply = vi.fn().mockResolvedValue({});
    const createCtx = {
      message: { text: '/create Buy groceries tomorrow' },
      from: {
        id: 222333444,
        username: 'createtest2',
        first_name: 'Test',
        last_name: 'User2',
        is_bot: false,
      },
      reply: createMockReply,
      chat: { id: 222333444, type: 'private' }
    } as unknown as Context;

    console.log('📨 Sending: /create Buy groceries tomorrow');

    await handler.handle(createCtx);

    const replyCall = createMockReply.mock.calls[0][0];
    console.log('📬 Reply:', replyCall);

    // Verify success
    expect(replyCall).toContain('✅');
    expect(replyCall).toContain('Task created');

    // Verify in database
    const tasks = await taskRepository.findByCreatedById(user!.id!);
    expect(tasks.length).toBeGreaterThan(0);

    console.log('✅ Task with inline text created successfully');

    // Cleanup
    for (const task of tasks) {
      await taskRepository.delete(task.id);
    }
  });

  it('should handle edge case: /create with empty task name', async () => {
    console.log('🧪 Testing /create with no task text...');

    // Setup user
    const mockReply = vi.fn().mockResolvedValue({});
    const setupCtx = {
      message: { text: '/start' },
      from: {
        id: 333444555,
        username: 'createtest3',
        first_name: 'Edge',
        last_name: 'Case',
        is_bot: false,
      },
      reply: mockReply,
      chat: { id: 333444555, type: 'private' }
    } as unknown as Context;

    try {
      const existingUser = await userRepository.findByTelegramId('333444555');
      if (existingUser) {
        const projects = await projectRepository.findByUserId(existingUser.id!);
        for (const project of projects) {
          await projectRepository.delete(project.id!);
        }
        await userRepository.delete(existingUser.id!);
      }
    } catch (error) {
      // Ignore
    }

    await handler.handle(setupCtx);
    const user = await userRepository.findByTelegramId('333444555');
    testUserId = user!.id!;
    const projects = await projectRepository.findByUserId(user!.id!);
    testProjectId = projects[0].id!;

    // Test /create with no text
    const createMockReply = vi.fn().mockResolvedValue({});
    const createCtx = {
      message: { text: '/create' },
      from: {
        id: 333444555,
        username: 'createtest3',
        first_name: 'Edge',
        last_name: 'Case',
      },
      reply: createMockReply,
      chat: { id: 333444555, type: 'private' }
    } as unknown as Context;

    console.log('📨 Sending: /create (with no task name)');

    await handler.handle(createCtx);

    const replyCall = createMockReply.mock.calls[0][0];
    console.log('📬 Reply:', replyCall);

    // Should handle gracefully - either ask for task name or show help
    expect(createMockReply).toHaveBeenCalled();
    // The response should not crash

    console.log('✅ Edge case handled gracefully');
  });
});
