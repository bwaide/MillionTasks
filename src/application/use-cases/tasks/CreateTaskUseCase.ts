import { Task, TaskProps } from '../../../domain/entities/Task.js';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { Priority } from '../../../domain/value-objects/Priority.js';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  projectId: string;
  createdById: string;
  assigneeId?: string;
  priority?: Priority;
  tags?: string[];
  dueDate?: Date;
  estimatedHours?: number;
  metadata?: {
    source?: 'telegram' | 'api' | 'web';
    originalMessage?: string;
    aiProcessed?: boolean;
  };
}

export interface CreateTaskResponse {
  task: Task;
  success: boolean;
  errors?: string[];
}

export class CreateTaskUseCase {
  constructor(
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async execute(request: CreateTaskRequest): Promise<CreateTaskResponse> {
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

      // Create the task entity
      const taskProps: Omit<TaskProps, 'id' | 'createdAt' | 'updatedAt'> = {
        title: request.title.trim(),
        description: request.description?.trim(),
        projectId: request.projectId,
        createdById: request.createdById,
        assigneeId: request.assigneeId,
        priority: request.priority?.toString() as TaskProps['priority'] || 'medium',
        tags: request.tags || [],
        dueDate: request.dueDate,
        estimatedHours: request.estimatedHours,
        status: 'todo',
        actualHours: 0,
        metadata: {
          source: request.metadata?.source || 'telegram',
          originalMessage: request.metadata?.originalMessage,
          aiProcessed: request.metadata?.aiProcessed || false,
        },
      };

      const task = Task.create(taskProps);

      // Save the task
      await this.taskRepository.save(task);

      console.log(`Task created successfully: ${task.id} - "${task.title}"`);

      return {
        task,
        success: true,
      };
    } catch (error) {
      console.error('Error creating task:', error);
      
      return {
        task: null as any,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  private async validateRequest(request: CreateTaskRequest): Promise<string[]> {
    const errors: string[] = [];

    // Validate title
    if (!request.title || typeof request.title !== 'string') {
      errors.push('Title is required and must be a string');
    } else if (request.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (request.title.length > 500) {
      errors.push('Title cannot exceed 500 characters');
    }

    // Validate description if provided
    if (request.description !== undefined && typeof request.description !== 'string') {
      errors.push('Description must be a string');
    }

    // Validate projectId
    if (!request.projectId || typeof request.projectId !== 'string') {
      errors.push('Project ID is required and must be a string');
    } else {
      try {
        const project = await this.projectRepository.findById(request.projectId);
        if (!project) {
          errors.push('Project not found');
        } else if (!project.isActive) {
          errors.push('Cannot create tasks in inactive project');
        } else if (!project.canCreateTasks()) {
          errors.push('Task creation is not allowed in this project');
        }
      } catch (error) {
        errors.push('Error validating project');
        console.error('Error validating project:', error);
      }
    }

    // Validate createdById
    if (!request.createdById || typeof request.createdById !== 'string') {
      errors.push('Created by user ID is required and must be a string');
    } else {
      try {
        const creator = await this.userRepository.findById(request.createdById);
        if (!creator) {
          errors.push('Creator user not found');
        } else if (!creator.isActive) {
          errors.push('Creator user is inactive');
        }
      } catch (error) {
        errors.push('Error validating creator user');
        console.error('Error validating creator user:', error);
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
          } else if (!assignee.isActive) {
            errors.push('Assignee user is inactive');
          }
        } catch (error) {
          errors.push('Error validating assignee user');
          console.error('Error validating assignee user:', error);
        }
      }
    }

    // Validate priority if provided
    if (request.priority !== undefined) {
      try {
        if (!(request.priority instanceof Priority)) {
          errors.push('Priority must be a valid Priority instance');
        }
      } catch (error) {
        errors.push('Invalid priority value');
      }
    }

    // Validate tags if provided
    if (request.tags !== undefined) {
      if (!Array.isArray(request.tags)) {
        errors.push('Tags must be an array');
      } else {
        for (const tag of request.tags) {
          if (typeof tag !== 'string') {
            errors.push('All tags must be strings');
            break;
          }
        }
      }
    }

    // Validate dueDate if provided
    if (request.dueDate !== undefined) {
      if (!(request.dueDate instanceof Date)) {
        errors.push('Due date must be a valid Date object');
      } else if (request.dueDate < new Date()) {
        errors.push('Due date cannot be in the past');
      }
    }

    // Validate estimatedHours if provided
    if (request.estimatedHours !== undefined) {
      if (typeof request.estimatedHours !== 'number' || request.estimatedHours <= 0) {
        errors.push('Estimated hours must be a positive number');
      }
    }

    return errors;
  }

  async createFromMessage(
    extractedData: {
      title: string;
      description?: string;
      priority?: Priority;
      tags?: string[];
      dueDate?: Date;
      estimatedHours?: number;
      originalMessage?: string;
    },
    userId: string,
    projectId?: string
  ): Promise<CreateTaskResponse> {
    try {
      // If no projectId provided, get user's default project
      let targetProjectId = projectId;
      if (!targetProjectId) {
        const projects = await this.projectRepository.findByUserId(userId);
        if (!projects || projects.length === 0) {
          return {
            task: null as any,
            success: false,
            errors: ['No projects found for user. Please create a project first.'],
          };
        }
        // Use the first project (typically "Personal")
        targetProjectId = projects[0].id!;
      }

      const request: CreateTaskRequest = {
        title: extractedData.title,
        description: extractedData.description,
        projectId: targetProjectId,
        createdById: userId,
        priority: extractedData.priority,
        tags: extractedData.tags,
        dueDate: extractedData.dueDate,
        estimatedHours: extractedData.estimatedHours,
        metadata: {
          source: 'telegram',
          originalMessage: extractedData.originalMessage,
          aiProcessed: true,
        },
      };

      return this.execute(request);
    } catch (error) {
      console.error('Error in createFromMessage:', error);
      return {
        task: null as any,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  async createTaskFromMessage(
    message: string,
    userId: string,
    projectId: string,
    extractedData?: {
      title?: string;
      description?: string;
      priority?: Priority;
      tags?: string[];
      dueDate?: Date;
    }
  ): Promise<CreateTaskResponse> {
    const title = extractedData?.title || message.substring(0, 200).trim();

    const request: CreateTaskRequest = {
      title,
      description: extractedData?.description,
      projectId,
      createdById: userId,
      priority: extractedData?.priority,
      tags: extractedData?.tags,
      dueDate: extractedData?.dueDate,
      metadata: {
        source: 'telegram',
        originalMessage: message,
        aiProcessed: !!extractedData,
      },
    };

    return this.execute(request);
  }
}