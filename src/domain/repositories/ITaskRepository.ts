import { Task } from '../entities/Task.js';
import { TaskStatus } from '../value-objects/TaskStatus.js';
import { Priority } from '../value-objects/Priority.js';

export interface TaskFilters {
  projectId?: string;
  assigneeId?: string;
  createdById?: string;
  status?: TaskStatus;
  priority?: Priority;
  tags?: string[];
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  isOverdue?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface TaskSortOptions {
  field: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'title';
  direction: 'asc' | 'desc';
}

export interface ITaskRepository {
  /**
   * Save a task to the repository
   */
  save(task: Task): Promise<void>;

  /**
   * Find a task by its unique ID
   */
  findById(id: string): Promise<Task | null>;

  /**
   * Find all tasks with optional filtering and sorting
   */
  findAll(filters?: TaskFilters, sort?: TaskSortOptions): Promise<Task[]>;

  /**
   * Find tasks by project ID
   */
  findByProjectId(projectId: string, filters?: Omit<TaskFilters, 'projectId'>): Promise<Task[]>;

  /**
   * Find tasks assigned to a specific user
   */
  findByAssigneeId(assigneeId: string, filters?: Omit<TaskFilters, 'assigneeId'>): Promise<Task[]>;

  /**
   * Find tasks created by a specific user
   */
  findByCreatedById(createdById: string, filters?: Omit<TaskFilters, 'createdById'>): Promise<Task[]>;

  /**
   * Find tasks by status
   */
  findByStatus(status: TaskStatus, filters?: Omit<TaskFilters, 'status'>): Promise<Task[]>;

  /**
   * Find tasks by priority
   */
  findByPriority(priority: Priority, filters?: Omit<TaskFilters, 'priority'>): Promise<Task[]>;

  /**
   * Find tasks by tag
   */
  findByTag(tag: string, filters?: TaskFilters): Promise<Task[]>;

  /**
   * Find tasks by multiple tags (AND operation)
   */
  findByTags(tags: string[], filters?: Omit<TaskFilters, 'tags'>): Promise<Task[]>;

  /**
   * Find tasks by their IDs
   */
  findByIds(ids: string[]): Promise<Task[]>;

  /**
   * Search tasks by title or description
   */
  search(query: string, filters?: TaskFilters): Promise<Task[]>;

  /**
   * Find overdue tasks
   */
  findOverdue(filters?: Omit<TaskFilters, 'isOverdue'>): Promise<Task[]>;

  /**
   * Find tasks due within a specific timeframe
   */
  findDueSoon(withinHours: number, filters?: TaskFilters): Promise<Task[]>;

  /**
   * Find high priority tasks
   */
  findHighPriority(filters?: Omit<TaskFilters, 'priority'>): Promise<Task[]>;

  /**
   * Find tasks without assignee
   */
  findUnassigned(filters?: Omit<TaskFilters, 'assigneeId'>): Promise<Task[]>;

  /**
   * Find completed tasks
   */
  findCompleted(filters?: TaskFilters): Promise<Task[]>;

  /**
   * Find active tasks (not completed or cancelled)
   */
  findActive(filters?: TaskFilters): Promise<Task[]>;

  /**
   * Update an existing task
   */
  update(task: Task): Promise<void>;

  /**
   * Delete a task by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a task exists by ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count total number of tasks with optional filtering
   */
  count(filters?: TaskFilters): Promise<number>;

  /**
   * Count tasks by status for a project
   */
  countByStatus(projectId: string): Promise<Record<string, number>>;

  /**
   * Count tasks by priority for a project
   */
  countByPriority(projectId: string): Promise<Record<string, number>>;

  /**
   * Count tasks by assignee for a project
   */
  countByAssignee(projectId: string): Promise<Record<string, number>>;

  /**
   * Get task statistics for a project
   */
  getProjectStats(projectId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    averageCompletionTime?: number; // in hours
  }>;

  /**
   * Get task statistics for a user
   */
  getUserStats(userId: string): Promise<{
    assigned: number;
    completed: number;
    overdue: number;
    averageCompletionTime?: number; // in hours
  }>;

  /**
   * Get tasks created within a date range
   */
  findCreatedBetween(startDate: Date, endDate: Date, filters?: TaskFilters): Promise<Task[]>;

  /**
   * Get recently updated tasks
   */
  findRecentlyUpdated(limit?: number, filters?: TaskFilters): Promise<Task[]>;

  /**
   * Get tasks that need attention (overdue, high priority, etc.)
   */
  findRequiringAttention(userId?: string): Promise<Task[]>;

  /**
   * Get all unique tags used in tasks
   */
  getAllTags(projectId?: string): Promise<string[]>;

  /**
   * Bulk update tasks
   */
  bulkUpdate(tasks: Task[]): Promise<void>;

  /**
   * Bulk delete tasks by IDs
   */
  bulkDelete(ids: string[]): Promise<void>;
}