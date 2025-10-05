import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { SupabaseUserRepository } from '../../../database/repositories/SupabaseUserRepository.js';
import { SupabaseProjectRepository } from '../../../database/repositories/SupabaseProjectRepository.js';
import { SupabaseTaskRepository } from '../../../database/repositories/SupabaseTaskRepository.js';
import { CreateTaskUseCase } from '../../../../application/use-cases/tasks/CreateTaskUseCase.js';
import { User } from '../../../../domain/entities/User.js';
import { Project } from '../../../../domain/entities/Project.js';
import { config } from '../../../../config/index.js';

/**
 * Integration Test: /create Command
 *
 * This test reproduces the actual_hours column error when creating tasks.
 *
 * Error: "Could not find the 'actual_hours' column of 'tasks' in the schema cache"
 *
 * The database schema doesn't have actual_hours or estimated_hours columns,
 * but the TypeScript code is trying to insert them.
 */
describe('Create Command Integration Test', () => {
  let supabase: any;
  let userRepository: SupabaseUserRepository;
  let projectRepository: SupabaseProjectRepository;
  let taskRepository: SupabaseTaskRepository;
  let createTaskUseCase: CreateTaskUseCase;
  let testUser: User;
  let testProject: Project;

  beforeAll(async () => {
    // Connect to real database
    supabase = createClient(
      config.database.supabase.url,
      config.database.supabase.serviceKey,
      {
        auth: { persistSession: false }
      }
    );

    userRepository = new SupabaseUserRepository(supabase);
    projectRepository = new SupabaseProjectRepository(supabase);
    taskRepository = new SupabaseTaskRepository(supabase);
    createTaskUseCase = new CreateTaskUseCase(
      taskRepository,
      projectRepository,
      userRepository
    );

    // Create test user
    testUser = User.create({
      firstName: 'Test',
      lastName: 'User',
      username: 'createtest',
      telegramId: '123456789',
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

    await userRepository.save(testUser);
    console.log(`Created test user: ${testUser.id}`);

    // Create test project
    testProject = Project.create({
      name: 'Test Project',
      description: 'Test project for create command',
      ownerId: testUser.id!,
      settings: {
        allowTaskCreation: true,
        requireApproval: false,
        visibility: 'private',
        defaultPriority: 'medium'
      }
    });

    await projectRepository.save(testProject);
    console.log(`Created test project: ${testProject.id}`);
  });

  afterAll(async () => {
    // Cleanup
    if (testProject?.id) {
      await projectRepository.delete(testProject.id);
      console.log(`Deleted test project: ${testProject.id}`);
    }
    if (testUser?.id) {
      await userRepository.delete(testUser.id);
      console.log(`Deleted test user: ${testUser.id}`);
    }
  });

  it('should create a task via /create command without actual_hours error', async () => {
    console.log('🧪 Testing task creation via /create command...');

    const extractedData = {
      title: 'First Task',
      description: 'Test task from /create command',
    };

    // This should NOT throw "Could not find the 'actual_hours' column"
    const result = await createTaskUseCase.createFromMessage(
      extractedData,
      testUser.id!,
      testProject.id!
    );

    // Log the error to see what's happening
    if (!result.success) {
      console.log('❌ Task creation failed:', result.errors);
    }

    expect(result.success).toBe(true);
    expect(result.task).toBeDefined();
    expect(result.task?.title).toBe('First Task');
    expect(result.errors).toBeUndefined();

    console.log(`✅ Task created successfully: ${result.task?.id}`);

    // Cleanup the created task
    if (result.task?.id) {
      await taskRepository.delete(result.task.id);
      console.log(`Deleted test task: ${result.task.id}`);
    }
  });

  it('should verify the database schema does not require actual_hours', async () => {
    console.log('🔍 Verifying database schema compatibility...');

    // Create a minimal task to test schema
    const minimalTaskData = {
      title: 'Minimal Task',
    };

    const result = await createTaskUseCase.createFromMessage(
      minimalTaskData,
      testUser.id!,
      testProject.id!
    );

    expect(result.success).toBe(true);
    expect(result.task).toBeDefined();

    // Verify the task was saved without actual_hours/estimated_hours
    const savedTask = await taskRepository.findById(result.task!.id);
    expect(savedTask).toBeDefined();
    expect(savedTask?.title).toBe('Minimal Task');

    console.log('✅ Database schema compatibility verified');

    // Cleanup
    if (result.task?.id) {
      await taskRepository.delete(result.task.id);
    }
  });

  it('should handle tasks with optional fields', async () => {
    console.log('🧪 Testing task creation with optional fields...');

    const taskWithOptionalFields = {
      title: 'Task with Options',
      description: 'This has a description',
      tags: ['test', 'integration'],
    };

    const result = await createTaskUseCase.createFromMessage(
      taskWithOptionalFields,
      testUser.id!,
      testProject.id!
    );

    expect(result.success).toBe(true);
    expect(result.task).toBeDefined();
    expect(result.task?.description).toBe('This has a description');
    expect(result.task?.tags).toContain('test');

    console.log('✅ Task with optional fields created successfully');

    // Cleanup
    if (result.task?.id) {
      await taskRepository.delete(result.task.id);
    }
  });
});
