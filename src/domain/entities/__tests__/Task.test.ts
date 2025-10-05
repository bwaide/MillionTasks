import { describe, it, expect } from 'vitest';
import { Task } from '../Task.js';

describe('Task Entity', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const projectId = '650e8400-e29b-41d4-a716-446655440000';

  describe('creation', () => {
    it('should create a task with required fields', () => {
      const task = Task.create({
        title: 'Test Task',
        description: 'Test Description',
        projectId,
        createdById: userId,
        assigneeId: userId,
        priority: 'medium',
        tags: ['test', 'unit']
      });

      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.projectId).toBe(projectId);
      expect(task.createdById).toBe(userId);
      expect(task.assigneeId).toBe(userId);
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
    });

    it('should create task with minimal fields', () => {
      const task = Task.create({
        title: 'Minimal Task',
        projectId,
        createdById: userId,
      });

      expect(task.title).toBe('Minimal Task');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
    });

    it('should throw error for empty title after trim', () => {
      expect(() => {
        Task.create({
          title: '   ',
          projectId,
          createdById: userId,
        });
      }).toThrow();
    });
  });

  describe('getters', () => {
    it('should expose all required properties', () => {
      const task = Task.create({
        title: 'Test',
        projectId,
        createdById: userId,
      });

      expect(task.id).toBeDefined();
      expect(task.projectId).toBe(projectId);
      expect(task.createdById).toBe(userId);
      expect(task.createdAt).toBeInstanceOf(Date);
      expect(task.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('business logic', () => {
    it('should check if task will be overdue', () => {
      // Task with future due date should not be overdue
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const task = Task.create({
        title: 'Task with Due Date',
        projectId,
        createdById: userId,
        dueDate: futureDate,
      });

      expect(task.isOverdue()).toBe(false);
      expect(task.dueDate).toEqual(futureDate);
    });

    it('should not be overdue without due date', () => {
      const task = Task.create({
        title: 'No Due Date',
        projectId,
        createdById: userId,
      });

      expect(task.isOverdue()).toBe(false);
    });

    it('should check if task is completed', () => {
      const completedTask = Task.create({
        title: 'Completed',
        projectId,
        createdById: userId,
        status: 'done',
      });

      expect(completedTask.isCompleted()).toBe(true);
    });

    it('should check task assignment', () => {
      const task = Task.create({
        title: 'Assigned',
        projectId,
        createdById: userId,
        assigneeId: userId,
      });

      expect(task.isAssignedTo(userId)).toBe(true);
      expect(task.isAssignedTo('other-user')).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to JSON', () => {
      const task = Task.create({
        title: 'Test Task',
        projectId,
        createdById: userId,
        priority: 'high',
      });

      const json = task.toJSON();

      expect(json.title).toBe('Test Task');
      expect(json.projectId).toBe(projectId);
      expect(json.createdById).toBe(userId);
      expect(json.status).toBe('todo');
      expect(json.priority).toBe('high');
      expect(json.id).toBeDefined();
    });
  });
});
