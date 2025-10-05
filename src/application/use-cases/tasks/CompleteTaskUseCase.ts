import { Task } from '../../../domain/entities/Task.js';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js';

export interface CompleteTaskRequest {
  taskId: string;
  userId: string;
  status?: TaskStatus;
  actualHours?: number;
  completionNotes?: string;
}

export interface CompleteTaskResponse {
  task: Task;
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

export class CompleteTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: CompleteTaskRequest): Promise<CompleteTaskResponse> {
    try {
      // Validate the request
      const validationErrors = await this.validateRequest(request);
      if (validationErrors.length > 0) {
        return {
          task: null as any,
          success: false,
          errors: validationErrors,
        };
      }

      // Get the task
      const task = await this.taskRepository.findById(request.taskId);
      if (!task) {
        return {
          task: null as any,
          success: false,
          errors: ['Task not found'],
        };
      }

      // Check permissions
      const permissionErrors = this.checkPermissions(task, request.userId);
      if (permissionErrors.length > 0) {
        return {
          task,
          success: false,
          errors: permissionErrors,
        };
      }

      // Determine target status
      const targetStatus = request.status || TaskStatus.DONE;

      // Validate status transition
      const canTransition = task.status === 'todo' 
        ? targetStatus.toString() === 'in_progress' || targetStatus.toString() === 'done' || targetStatus.toString() === 'cancelled'
        : task.status === 'in_progress'
        ? targetStatus.toString() === 'in_review' || targetStatus.toString() === 'done' || targetStatus.toString() === 'cancelled'
        : task.status === 'in_review'
        ? targetStatus.toString() === 'done' || targetStatus.toString() === 'in_progress' || targetStatus.toString() === 'cancelled'
        : false;

      if (!canTransition) {
        return {
          task,
          success: false,
          errors: [`Cannot transition from ${task.status} to ${targetStatus.toString()}`],
        };
      }

      // Update task status
      let updatedTask = task.updateStatus(targetStatus.toString() as any);

      // Log time if provided
      if (request.actualHours && request.actualHours > 0) {
        updatedTask = updatedTask.logTime(request.actualHours);
      }

      // Save the updated task
      await this.taskRepository.update(updatedTask);

      // Collect warnings
      const warnings: string[] = [];
      
      // Check if task was completed without time logging
      if (targetStatus.isDone() && updatedTask.actualHours === 0) {
        warnings.push('Task completed without time tracking');
      }

      // Check if task was completed before due date
      if (targetStatus.isDone() && updatedTask.dueDate && updatedTask.dueDate > new Date()) {
        warnings.push('Task completed before due date');
      }

      // Check if task was completed late
      if (targetStatus.isDone() && updatedTask.isOverdue()) {
        warnings.push('Task completed after due date');
      }

      console.log(`Task ${updatedTask.id} status updated to ${targetStatus.toString()} by user ${request.userId}`);

      return {
        task: updatedTask,
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      console.error('Error completing task:', error);
      
      return {
        task: null as any,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  async markComplete(taskId: string, userId: string, actualHours?: number): Promise<CompleteTaskResponse> {
    return this.execute({
      taskId,
      userId,
      status: TaskStatus.DONE,
      actualHours,
    });
  }

  async markInProgress(taskId: string, userId: string): Promise<CompleteTaskResponse> {
    return this.execute({
      taskId,
      userId,
      status: TaskStatus.IN_PROGRESS,
    });
  }

  async markInReview(taskId: string, userId: string): Promise<CompleteTaskResponse> {
    return this.execute({
      taskId,
      userId,
      status: TaskStatus.IN_REVIEW,
    });
  }

  async markCancelled(taskId: string, userId: string, reason?: string): Promise<CompleteTaskResponse> {
    return this.execute({
      taskId,
      userId,
      status: TaskStatus.CANCELLED,
      completionNotes: reason,
    });
  }

  async reopenTask(taskId: string, userId: string): Promise<CompleteTaskResponse> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return {
          task: null as any,
          success: false,
          errors: ['Task not found'],
        };
      }

      // Only allow reopening from done or cancelled states
      if (task.status !== 'done' && task.status !== 'cancelled') {
        return {
          task,
          success: false,
          errors: ['Can only reopen completed or cancelled tasks'],
        };
      }

      const targetStatus = task.status === 'done' ? TaskStatus.IN_REVIEW : TaskStatus.TODO;

      return this.execute({
        taskId,
        userId,
        status: targetStatus,
      });
    } catch (error) {
      console.error('Error reopening task:', error);
      
      return {
        task: null as any,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  async bulkComplete(taskIds: string[], userId: string, status?: TaskStatus): Promise<{
    successful: Task[];
    failed: Array<{ taskId: string; error: string }>;
    warnings: string[];
  }> {
    const successful: Task[] = [];
    const failed: Array<{ taskId: string; error: string }> = [];
    const warnings: string[] = [];

    for (const taskId of taskIds) {
      try {
        const result = await this.execute({
          taskId,
          userId,
          status: status || TaskStatus.DONE,
        });

        if (result.success) {
          successful.push(result.task);
          if (result.warnings) {
            warnings.push(...result.warnings.map(w => `${taskId}: ${w}`));
          }
        } else {
          failed.push({
            taskId,
            error: result.errors?.join(', ') || 'Unknown error',
          });
        }
      } catch (error) {
        failed.push({
          taskId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`Bulk operation completed: ${successful.length} successful, ${failed.length} failed`);

    return {
      successful,
      failed,
      warnings,
    };
  }

  private async validateRequest(request: CompleteTaskRequest): Promise<string[]> {
    const errors: string[] = [];

    // Validate taskId
    if (!request.taskId || typeof request.taskId !== 'string') {
      errors.push('Task ID is required and must be a string');
    }

    // Validate userId
    if (!request.userId || typeof request.userId !== 'string') {
      errors.push('User ID is required and must be a string');
    } else {
      try {
        const user = await this.userRepository.findById(request.userId);
        if (!user) {
          errors.push('User not found');
        } else if (!user.isActive) {
          errors.push('User is inactive');
        }
      } catch (error) {
        errors.push('Error validating user');
        console.error('Error validating user:', error);
      }
    }

    // Validate status if provided
    if (request.status !== undefined) {
      try {
        if (!(request.status instanceof TaskStatus)) {
          errors.push('Status must be a valid TaskStatus instance');
        }
      } catch (error) {
        errors.push('Invalid status value');
      }
    }

    // Validate actualHours if provided
    if (request.actualHours !== undefined) {
      if (typeof request.actualHours !== 'number' || request.actualHours < 0) {
        errors.push('Actual hours must be a non-negative number');
      }
    }

    return errors;
  }

  private checkPermissions(task: Task, userId: string): string[] {
    const errors: string[] = [];

    // Check if user can modify this task
    const canModify = task.isCreatedBy(userId) || 
                     task.isAssignedTo(userId) || 
                     this.isProjectOwner(task.projectId, userId); // This would need to be implemented

    if (!canModify) {
      errors.push('You do not have permission to modify this task');
    }

    // Check if task is already in a final state that cannot be changed
    if (task.status === 'cancelled' && task.updatedAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      // Can't modify tasks cancelled more than 24 hours ago
      errors.push('Cannot modify tasks cancelled more than 24 hours ago');
    }

    return errors;
  }

  private isProjectOwner(projectId: string, userId: string): boolean {
    // This is a placeholder - would need to check project ownership
    // For now, return false as we don't have the project context
    return false;
  }

  async getTaskProgress(taskId: string): Promise<{
    task: Task;
    progressPercentage: number;
    timeSpent: number;
    estimatedRemaining?: number;
    isOnTrack: boolean;
  } | null> {
    try {
      const task = await this.taskRepository.findById(taskId);
      if (!task) {
        return null;
      }

      const status = TaskStatus.fromString(task.status);
      const progressPercentage = status.getProgressPercentage();
      
      const timeSpent = task.actualHours;
      const estimatedRemaining = task.estimatedHours 
        ? Math.max(0, task.estimatedHours - timeSpent)
        : undefined;

      // Determine if task is on track
      let isOnTrack = true;
      
      if (task.isOverdue()) {
        isOnTrack = false;
      } else if (task.estimatedHours && timeSpent > task.estimatedHours * 1.2) {
        // Consider off-track if more than 20% over estimate
        isOnTrack = false;
      } else if (task.dueDate) {
        const now = new Date();
        const timeRemaining = task.dueDate.getTime() - now.getTime();
        const totalTime = task.dueDate.getTime() - task.createdAt.getTime();
        const expectedProgress = ((totalTime - timeRemaining) / totalTime) * 100;
        
        if (progressPercentage < expectedProgress - 20) {
          // Consider off-track if more than 20% behind expected progress
          isOnTrack = false;
        }
      }

      return {
        task,
        progressPercentage,
        timeSpent,
        estimatedRemaining,
        isOnTrack,
      };
    } catch (error) {
      console.error('Error getting task progress:', error);
      return null;
    }
  }
}