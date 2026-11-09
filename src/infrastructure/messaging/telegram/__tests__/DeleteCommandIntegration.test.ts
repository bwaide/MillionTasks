import { describe, it, expect, beforeEach } from 'vitest';
import { TelegramCommandHandlers } from '../TelegramCommandHandlers.js';
import { TelegramMessageHandler, TelegramMessage } from '../TelegramMessageHandler.js';
import { MessageProcessor } from '../../../../application/services/MessageProcessor.js';
import { CreateTaskUseCase } from '../../../../application/use-cases/tasks/CreateTaskUseCase.js';
import { ListTasksUseCase } from '../../../../application/use-cases/tasks/ListTasksUseCase.js';
import { CompleteTaskUseCase } from '../../../../application/use-cases/tasks/CompleteTaskUseCase.js';
import { DeleteTaskUseCase } from '../../../../application/use-cases/tasks/DeleteTaskUseCase.js';
import { SupabaseUserRepository } from '../../../database/repositories/SupabaseUserRepository.js';
import { SupabaseProjectRepository } from '../../../database/repositories/SupabaseProjectRepository.js';
import { SupabaseTaskRepository } from '../../../database/repositories/SupabaseTaskRepository.js';
import { AIService } from '../../../ai/AIService.js';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../../config/index.js';
import { User } from '../../../../domain/entities/User.js';
import { Project } from '../../../../domain/entities/Project.js';
import { Task } from '../../../../domain/entities/Task.js';

describe('Delete Command Integration Tests', () => {
  let commandHandlers: TelegramCommandHandlers;
  let messageHandler: TelegramMessageHandler;
  let userRepository: SupabaseUserRepository;
  let projectRepository: SupabaseProjectRepository;
  let taskRepository: SupabaseTaskRepository;
  let deleteTaskUseCase: DeleteTaskUseCase;

  let testUser: User;
  let testProject: Project;
  let testTask: Task;

  beforeEach(async () => {
    // Setup Supabase client
    const supabase = createClient(
      config.database.supabase.url,
      config.database.supabase.serviceKey,
      {
        auth: { persistSession: false }
      }
    );

    // Initialize repositories
    userRepository = new SupabaseUserRepository(supabase);
    projectRepository = new SupabaseProjectRepository(supabase);
    taskRepository = new SupabaseTaskRepository(supabase);

    // Initialize use cases
    const createTaskUseCase = new CreateTaskUseCase(taskRepository, projectRepository);
    const listTasksUseCase = new ListTasksUseCase(taskRepository, projectRepository);
    const completeTaskUseCase = new CompleteTaskUseCase(taskRepository, userRepository);
    deleteTaskUseCase = new DeleteTaskUseCase(taskRepository, userRepository);

    // Initialize AI service and message processor
    const aiService = new AIService();
    const messageProcessor = new MessageProcessor(aiService, taskRepository, projectRepository);

    // Initialize message handler
    messageHandler = new TelegramMessageHandler(
      messageProcessor,
      createTaskUseCase,
      listTasksUseCase,
      completeTaskUseCase,
      userRepository,
      projectRepository
    );

    // Initialize command handlers
    commandHandlers = new TelegramCommandHandlers(
      messageHandler,
      createTaskUseCase,
      listTasksUseCase,
      completeTaskUseCase,
      deleteTaskUseCase,
      userRepository,
      taskRepository,
      projectRepository
    );

    // Create test user
    testUser = User.create({
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isActive: true,
      preferences: {
        timezone: 'UTC',
        language: 'en',
        notifications: {
          enabled: true,
          taskReminders: true,
          projectUpdates: true,
        },
      },
    });
    await userRepository.save(testUser);

    // Create test project
    testProject = Project.create({
      name: 'Test Project',
      description: 'Project for delete command testing',
      ownerId: testUser.id,
      isActive: true,
      settings: {
        isPublic: false,
        allowTaskCreation: true,
        requireApproval: false,
        defaultPriority: 'medium',
      },
    });
    await projectRepository.save(testProject);

    // Create test task
    testTask = Task.create({
      projectId: testProject.id,
      title: 'Test task to delete',
      description: 'This task will be deleted in tests',
      createdById: testUser.id,
      assignedToId: testUser.id,
    });
    await taskRepository.save(testTask);
  });

  describe('/delete command', () => {
    it('should delete a task with full task ID', async () => {
      // Recreate the task for this test since beforeEach runs for all tests
      testTask = Task.create({
        projectId: testProject.id,
        title: 'Test task to delete',
        description: 'This task will be deleted in tests',
        createdById: testUser.id,
        assignedToId: testUser.id,
      });
      await taskRepository.save(testTask);

      const message: TelegramMessage = {
        messageId: 1,
        chatId: 123456,
        from: {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        text: `/delete ${testTask.id}`,
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(true);
      expect(response.messageText).toContain('Task Deleted');
      expect(response.messageText).toContain('Test task to delete');

      // Verify task is actually deleted
      const deletedTask = await taskRepository.findById(testTask.id);
      expect(deletedTask).toBeNull();
    });

    it('should delete a task with partial task ID', async () => {
      // Recreate the task for this test
      testTask = Task.create({
        projectId: testProject.id,
        title: 'Test task to delete',
        description: 'This task will be deleted in tests',
        createdById: testUser.id,
        assignedToId: testUser.id,
      });
      await taskRepository.save(testTask);

      const partialId = testTask.id.slice(0, 8);

      const message: TelegramMessage = {
        messageId: 1,
        chatId: 123456,
        from: {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        text: `/delete ${partialId}`,
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(true);
      expect(response.messageText).toContain('Task Deleted');

      // Verify task is deleted
      const deletedTask = await taskRepository.findById(testTask.id);
      expect(deletedTask).toBeNull();
    });

    it('should show help when no task ID provided', async () => {
      const message: TelegramMessage = {
        messageId: 1,
        chatId: 123456,
        from: {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        text: '/delete',
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(true);
      expect(response.messageText).toContain('Delete a Task');
      expect(response.messageText).toContain('/delete [task-id]');
    });

    it('should show error when task not found', async () => {
      const message: TelegramMessage = {
        messageId: 1,
        chatId: 123456,
        from: {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        text: '/delete nonexistent123',
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(false);
      expect(response.messageText).toContain('Task not found');
    });

    it('should prevent deleting tasks owned by another user', async () => {
      // Create another user
      const otherUser = User.create({
        telegramId: '987654321',
        firstName: 'Other',
        lastName: 'User',
        username: 'otheruser',
        isActive: true,
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: true,
            projectUpdates: true,
          },
        },
      });
      await userRepository.save(otherUser);

      // Try to delete test task as other user
      const message: TelegramMessage = {
        messageId: 1,
        chatId: 987654,
        from: {
          id: 987654321,
          firstName: 'Other',
          lastName: 'User',
          username: 'otheruser',
        },
        text: `/delete ${testTask.id}`,
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(false);
      expect(response.messageText).toContain('permission' || 'not found');

      // Verify task still exists
      const stillExists = await taskRepository.findById(testTask.id);
      expect(stillExists).not.toBeNull();
    });

    it('should work with /remove alias', async () => {
      // Recreate the task for this test
      testTask = Task.create({
        projectId: testProject.id,
        title: 'Test task to delete',
        description: 'This task will be deleted in tests',
        createdById: testUser.id,
        assignedToId: testUser.id,
      });
      await taskRepository.save(testTask);

      const message: TelegramMessage = {
        messageId: 1,
        chatId: 123456,
        from: {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        text: `/remove ${testTask.id}`,
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(true);
      expect(response.messageText).toContain('Task Deleted');
    });

    it('should provide helpful buttons after deletion', async () => {
      // Recreate the task for this test
      testTask = Task.create({
        projectId: testProject.id,
        title: 'Test task to delete',
        description: 'This task will be deleted in tests',
        createdById: testUser.id,
        assignedToId: testUser.id,
      });
      await taskRepository.save(testTask);

      const message: TelegramMessage = {
        messageId: 1,
        chatId: 123456,
        from: {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        },
        text: `/delete ${testTask.id}`,
        date: new Date(),
      };

      const response = await commandHandlers.handleCommand(message);

      expect(response.success).toBe(true);
      expect(response.replyMarkup).toBeDefined();
      expect(response.replyMarkup?.inlineKeyboard).toBeDefined();
      expect(response.replyMarkup?.inlineKeyboard?.length).toBeGreaterThan(0);
    });
  });
});
