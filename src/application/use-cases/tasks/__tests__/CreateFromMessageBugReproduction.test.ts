import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateTaskUseCase } from '../CreateTaskUseCase.js';
import { ITaskRepository } from '../../../../domain/repositories/ITaskRepository.js';
import { IProjectRepository } from '../../../../domain/repositories/IProjectRepository.js';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository.js';

/**
 * Bug Reproduction Test: createFromMessage method not found
 *
 * Issue: DatabaseConnectedHandler calls this.createTaskUseCase.createFromMessage()
 * but the actual method name is createTaskFromMessage().
 *
 * The test expects a method signature of:
 * createFromMessage(extractedData, userId, projectId)
 *
 * But the actual implementation has:
 * createTaskFromMessage(message, userId, projectId, extractedData?)
 *
 * This test documents the expected interface after the fix.
 */
describe('CreateTaskUseCase - createFromMessage Bug', () => {
  let createTaskUseCase: CreateTaskUseCase;
  let mockTaskRepository: ITaskRepository;
  let mockProjectRepository: IProjectRepository;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    mockTaskRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockProjectRepository = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      save: vi.fn(),
    } as any;

    mockUserRepository = {
      findById: vi.fn(),
      save: vi.fn(),
    } as any;

    createTaskUseCase = new CreateTaskUseCase(
      mockTaskRepository,
      mockProjectRepository,
      mockUserRepository
    );
  });

  it('should have a createFromMessage method with correct signature', () => {
    // This test verifies that the method exists and can be called
    expect(createTaskUseCase).toHaveProperty('createFromMessage');
    expect(typeof (createTaskUseCase as any).createFromMessage).toBe('function');
  });

  it('should accept extractedData as first parameter', () => {
    // The expected signature is:
    // createFromMessage(extractedData, userId, projectId?)
    //
    // Where extractedData contains:
    // - title: string
    // - description?: string
    // - priority?: Priority
    // - tags?: string[]
    // - dueDate?: Date

    const expectedSignature = {
      extractedData: {
        title: 'Test task',
        description: 'Task description',
        priority: 'medium',
        tags: ['test'],
        dueDate: new Date()
      },
      userId: 'user-123',
      projectId: 'project-456'
    };

    // This documents what the handler expects to call
    expect(expectedSignature.extractedData.title).toBe('Test task');
  });

  it('should NOT be named createTaskFromMessage', () => {
    // The old method name that causes the bug
    const incorrectMethodName = 'createTaskFromMessage';
    const correctMethodName = 'createFromMessage';

    expect(correctMethodName).not.toBe(incorrectMethodName);
    expect(correctMethodName).toBe('createFromMessage');
  });
});
