import { ITaskRepository } from '../../../domain/repositories/ITaskRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';

export interface DeleteTaskRequest {
  taskId: string;
  userId: string;
}

export interface DeleteTaskResponse {
  success: boolean;
  taskTitle?: string;
  errors?: string[];
  warnings?: string[];
}

export class DeleteTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: DeleteTaskRequest): Promise<DeleteTaskResponse> {
    try {
      // Validate input
      if (!request.taskId || !request.userId) {
        return {
          success: false,
          errors: ['Task ID and User ID are required'],
        };
      }

      // Find the task
      const task = await this.taskRepository.findById(request.taskId);
      if (!task) {
        return {
          success: false,
          errors: ['Task not found'],
        };
      }

      // Check permissions - user must be the creator or assigned user
      if (task.createdById !== request.userId && task.assigneeId !== request.userId) {
        return {
          success: false,
          errors: ['You do not have permission to delete this task'],
        };
      }

      // Store task title before deletion
      const taskTitle = task.title;

      // Delete the task
      const deleted = await this.taskRepository.delete(request.taskId);

      if (!deleted) {
        return {
          success: false,
          errors: ['Failed to delete task'],
        };
      }

      return {
        success: true,
        taskTitle,
      };
    } catch (error) {
      console.error('Error in DeleteTaskUseCase:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred while deleting the task'],
      };
    }
  }

  async deleteByPartialId(partialId: string, userId: string): Promise<DeleteTaskResponse> {
    try {
      // Find tasks belonging to the user
      const tasks = await this.taskRepository.findAll({
        createdById: userId,
        limit: 100,
      });

      // Find task by partial ID
      const task = tasks.find(t => t.id.startsWith(partialId) || t.id === partialId);

      if (!task) {
        return {
          success: false,
          errors: [`Task not found with ID: ${partialId}`],
        };
      }

      // Use the full delete method
      return await this.execute({
        taskId: task.id,
        userId,
      });
    } catch (error) {
      console.error('Error in deleteByPartialId:', error);
      return {
        success: false,
        errors: ['An unexpected error occurred'],
      };
    }
  }
}
