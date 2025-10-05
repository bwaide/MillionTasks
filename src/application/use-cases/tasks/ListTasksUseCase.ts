import { Task } from '../../../domain/entities/Task.js';
import { ITaskRepository, TaskFilters, TaskSortOptions } from '../../../domain/repositories/ITaskRepository.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js';
import { Priority } from '../../../domain/value-objects/Priority.js';

export interface ListTasksRequest {
  userId: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  tags?: string[];
  search?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  showCompleted?: boolean;
  showCancelled?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
  sortDirection?: 'asc' | 'desc';
}

export interface ListTasksResponse {
  tasks: Task[];
  totalCount: number;
  hasMore: boolean;
  filters: {
    applied: string[];
    available: {
      statuses: TaskStatus[];
      priorities: Priority[];
      tags: string[];
    };
  };
  success: boolean;
  errors?: string[];
}

export interface TaskSummary {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  dueSoon: number;
}

export class ListTasksUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: ListTasksRequest): Promise<ListTasksResponse> {
    try {
      // Validate the request
      const validationErrors = await this.validateRequest(request);
      if (validationErrors.length > 0) {
        return {
          tasks: [],
          totalCount: 0,
          hasMore: false,
          filters: { applied: [], available: { statuses: [], priorities: [], tags: [] } },
          success: false,
          errors: validationErrors,
        };
      }

      // Build filters
      const filters = await this.buildFilters(request);
      
      // Build sort options
      const sortOptions = this.buildSortOptions(request);

      // Get tasks
      const tasks = await this.taskRepository.findAll(filters, sortOptions);
      
      // Get total count for pagination
      const totalCount = await this.taskRepository.count(filters);
      
      // Calculate if there are more tasks
      const hasMore = (request.offset || 0) + tasks.length < totalCount;

      // Get available filter options
      const availableFilters = await this.getAvailableFilters(request);

      // Build applied filters description
      const appliedFilters = this.getAppliedFilters(request);

      console.log(`Listed ${tasks.length} tasks for user ${request.userId}`);

      return {
        tasks,
        totalCount,
        hasMore,
        filters: {
          applied: appliedFilters,
          available: availableFilters,
        },
        success: true,
      };
    } catch (error) {
      console.error('Error listing tasks:', error);
      
      return {
        tasks: [],
        totalCount: 0,
        hasMore: false,
        filters: { applied: [], available: { statuses: [], priorities: [], tags: [] } },
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  async getTaskSummary(userId: string, projectId?: string): Promise<TaskSummary> {
    try {
      const filters: TaskFilters = {
        projectId,
        limit: 1000, // Get all tasks for summary
      };

      // Add user filter - either created by or assigned to user
      const userTasks = await this.taskRepository.findAll({
        ...filters,
        createdById: userId,
      });

      const assignedTasks = await this.taskRepository.findAll({
        ...filters,
        assigneeId: userId,
      });

      // Combine and deduplicate tasks
      const allTasks = [...userTasks, ...assignedTasks];
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );

      // Calculate summary statistics
      const summary: TaskSummary = {
        total: uniqueTasks.length,
        byStatus: {},
        byPriority: {},
        overdue: 0,
        dueSoon: 0,
      };

      // Count by status
      for (const status of TaskStatus.getAllStatuses()) {
        summary.byStatus[status.toString()] = uniqueTasks.filter(
          task => task.status === status.toString()
        ).length;
      }

      // Count by priority
      for (const priority of Priority.getAllPriorities()) {
        summary.byPriority[priority.toString()] = uniqueTasks.filter(
          task => task.priority === priority.toString()
        ).length;
      }

      // Count overdue tasks
      summary.overdue = uniqueTasks.filter(task => task.isOverdue()).length;

      // Count tasks due soon (within 24 hours)
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      summary.dueSoon = uniqueTasks.filter(task => 
        task.dueDate && 
        task.dueDate <= tomorrow && 
        task.dueDate > new Date() &&
        !task.isCompleted()
      ).length;

      return summary;
    } catch (error) {
      console.error('Error getting task summary:', error);
      throw error;
    }
  }

  async getMyTasks(userId: string, options?: {
    includeAssigned?: boolean;
    includeCreated?: boolean;
    limit?: number;
  }): Promise<Task[]> {
    const includeAssigned = options?.includeAssigned !== false;
    const includeCreated = options?.includeCreated !== false;
    const limit = options?.limit || 50;

    try {
      const tasks: Task[] = [];

      if (includeCreated) {
        const createdTasks = await this.taskRepository.findByCreatedById(userId, {
          limit,
          isOverdue: false, // Exclude completed and cancelled
        });
        tasks.push(...createdTasks);
      }

      if (includeAssigned) {
        const assignedTasks = await this.taskRepository.findByAssigneeId(userId, {
          limit,
          isOverdue: false, // Exclude completed and cancelled
        });
        tasks.push(...assignedTasks);
      }

      // Remove duplicates and sort by priority and due date
      const uniqueTasks = tasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );

      return uniqueTasks
        .filter(task => task.status !== 'done' && task.status !== 'cancelled')
        .sort((a, b) => {
          // Sort by priority first
          const priorityDiff = b.getPriorityWeight() - a.getPriorityWeight();
          if (priorityDiff !== 0) return priorityDiff;

          // Then by due date (earliest first)
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime();
          }
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;

          // Finally by creation date (newest first)
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting my tasks:', error);
      throw error;
    }
  }

  private async validateRequest(request: ListTasksRequest): Promise<string[]> {
    const errors: string[] = [];

    // Validate userId
    if (!request.userId || typeof request.userId !== 'string') {
      errors.push('User ID is required and must be a string');
    } else {
      try {
        const user = await this.userRepository.findById(request.userId);
        if (!user) {
          errors.push('User not found');
        }
      } catch (error) {
        errors.push('Error validating user');
        console.error('Error validating user:', error);
      }
    }

    // Validate projectId if provided
    if (request.projectId !== undefined) {
      if (typeof request.projectId !== 'string') {
        errors.push('Project ID must be a string');
      } else {
        try {
          const project = await this.projectRepository.findById(request.projectId);
          if (!project) {
            errors.push('Project not found');
          }
        } catch (error) {
          errors.push('Error validating project');
          console.error('Error validating project:', error);
        }
      }
    }

    // Validate assigneeId if provided
    if (request.assigneeId !== undefined) {
      if (typeof request.assigneeId !== 'string') {
        errors.push('Assignee ID must be a string');
      } else {
        try {
          const assignee = await this.userRepository.findById(request.assigneeId);
          if (!assignee) {
            errors.push('Assignee user not found');
          }
        } catch (error) {
          errors.push('Error validating assignee user');
          console.error('Error validating assignee user:', error);
        }
      }
    }

    // Validate pagination parameters
    if (request.limit !== undefined && (typeof request.limit !== 'number' || request.limit <= 0)) {
      errors.push('Limit must be a positive number');
    }

    if (request.offset !== undefined && (typeof request.offset !== 'number' || request.offset < 0)) {
      errors.push('Offset must be a non-negative number');
    }

    return errors;
  }

  private async buildFilters(request: ListTasksRequest): Promise<TaskFilters> {
    const filters: TaskFilters = {
      limit: request.limit || 50,
      offset: request.offset || 0,
    };

    // Project filter
    if (request.projectId) {
      filters.projectId = request.projectId;
    }

    // Status filter
    if (request.status) {
      filters.status = request.status;
    } else {
      // By default, exclude completed and cancelled unless explicitly requested
      if (!request.showCompleted && !request.showCancelled) {
        // This would need to be handled at the repository level
        // For now, we'll filter after retrieval
      }
    }

    // Priority filter
    if (request.priority) {
      filters.priority = request.priority;
    }

    // Assignee filter
    if (request.assigneeId) {
      filters.assigneeId = request.assigneeId;
    }

    // Tags filter
    if (request.tags && request.tags.length > 0) {
      filters.tags = request.tags;
    }

    // Date filters
    if (request.dueDateBefore) {
      filters.dueDateBefore = request.dueDateBefore;
    }

    if (request.dueDateAfter) {
      filters.dueDateAfter = request.dueDateAfter;
    }

    return filters;
  }

  private buildSortOptions(request: ListTasksRequest): TaskSortOptions {
    return {
      field: request.sortBy || 'updatedAt',
      direction: request.sortDirection || 'desc',
    };
  }

  private async getAvailableFilters(request: ListTasksRequest): Promise<{
    statuses: TaskStatus[];
    priorities: Priority[];
    tags: string[];
  }> {
    try {
      const projectTags = request.projectId 
        ? await this.taskRepository.getAllTags(request.projectId)
        : await this.taskRepository.getAllTags();

      return {
        statuses: TaskStatus.getAllStatuses(),
        priorities: Priority.getAllPriorities(),
        tags: projectTags,
      };
    } catch (error) {
      console.error('Error getting available filters:', error);
      return {
        statuses: TaskStatus.getAllStatuses(),
        priorities: Priority.getAllPriorities(),
        tags: [],
      };
    }
  }

  private getAppliedFilters(request: ListTasksRequest): string[] {
    const applied: string[] = [];

    if (request.projectId) {
      applied.push(`Project: ${request.projectId}`);
    }

    if (request.status) {
      applied.push(`Status: ${request.status.getDisplayName()}`);
    }

    if (request.priority) {
      applied.push(`Priority: ${request.priority.getDisplayName()}`);
    }

    if (request.assigneeId) {
      applied.push(`Assigned to: ${request.assigneeId}`);
    }

    if (request.tags && request.tags.length > 0) {
      applied.push(`Tags: ${request.tags.join(', ')}`);
    }

    if (request.search) {
      applied.push(`Search: "${request.search}"`);
    }

    if (request.dueDateBefore) {
      applied.push(`Due before: ${request.dueDateBefore.toLocaleDateString()}`);
    }

    if (request.dueDateAfter) {
      applied.push(`Due after: ${request.dueDateAfter.toLocaleDateString()}`);
    }

    if (!request.showCompleted) {
      applied.push('Excluding completed tasks');
    }

    if (!request.showCancelled) {
      applied.push('Excluding cancelled tasks');
    }

    return applied;
  }
}