/**
 * ScheduleTaskUseCase
 * Handles GTD scheduling of tasks (NOW/NEXT/LATER)
 */

import { ITaskRepository } from '@domain/repositories/ITaskRepository.js';
import { IUserRepository } from '@domain/repositories/IUserRepository.js';

interface ScheduleTaskRequest {
  taskId: string;
  userId: string;
  gtdStatus: 'now' | 'next' | 'later';
  scheduledDate?: Date;
}

interface ScheduleTaskResponse {
  success: boolean;
  taskId?: string;
  gtdStatus?: string;
  errors?: string[];
}

export class ScheduleTaskUseCase {
  private readonly MAX_NOW_TASKS = 3;

  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: ScheduleTaskRequest): Promise<ScheduleTaskResponse> {
    try {
      // Verify user exists
      const user = await this.userRepository.findById(request.userId);
      if (!user) {
        return { success: false, errors: ['User not found'] };
      }

      // Find the task
      const task = await this.taskRepository.findById(request.taskId);
      if (!task) {
        return { success: false, errors: ['Task not found'] };
      }

      // Verify user has permission (must be creator or assignee)
      if (task.createdById !== request.userId && task.assigneeId !== request.userId) {
        return { success: false, errors: ['You do not have permission to schedule this task'] };
      }

      // If scheduling as NOW, check the limit
      if (request.gtdStatus === 'now') {
        const nowTasks = await this.taskRepository.findByUserAndGTDStatus(
          request.userId,
          'now'
        );

        // Filter out the current task if it's already in NOW (we're re-scheduling it)
        const otherNowTasks = nowTasks.filter(t => t.id !== task.id && !t.isCompleted());

        if (otherNowTasks.length >= this.MAX_NOW_TASKS) {
          return {
            success: false,
            errors: [
              `You already have ${this.MAX_NOW_TASKS} NOW tasks. Complete or defer some tasks first.`,
            ],
          };
        }

        // NOW tasks should be scheduled for today
        if (!request.scheduledDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          request.scheduledDate = today;
        }
      }

      // If scheduling as NEXT and no date provided, set to tomorrow
      if (request.gtdStatus === 'next' && !request.scheduledDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        request.scheduledDate = tomorrow;
      }

      // Schedule the task
      const updatedTask = task.scheduleFor(request.gtdStatus, request.scheduledDate);

      // Save to repository
      await this.taskRepository.update(updatedTask);

      return {
        success: true,
        taskId: updatedTask.id,
        gtdStatus: updatedTask.gtdStatus,
      };
    } catch (error) {
      console.error('Error scheduling task:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  /**
   * Helper method to reschedule a task from NOW to NEXT or LATER
   */
  async defer(taskId: string, userId: string, to: 'next' | 'later'): Promise<ScheduleTaskResponse> {
    const scheduledDate = to === 'next' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined;
    return this.execute({
      taskId,
      userId,
      gtdStatus: to,
      scheduledDate,
    });
  }

  /**
   * Helper method to promote a task from NEXT to NOW
   */
  async promoteToNow(taskId: string, userId: string): Promise<ScheduleTaskResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.execute({
      taskId,
      userId,
      gtdStatus: 'now',
      scheduledDate: today,
    });
  }
}
