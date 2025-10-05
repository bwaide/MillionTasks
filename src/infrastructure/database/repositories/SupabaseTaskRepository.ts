import { Task, TaskProps } from '../../../domain/entities/Task.js';
import { ITaskRepository, TaskFilters, TaskSortOptions } from '../../../domain/repositories/ITaskRepository.js';
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js';
import { Priority } from '../../../domain/value-objects/Priority.js';
import { SupabaseService, Database } from '../supabase.js';
import { SupabaseClient } from '@supabase/supabase-js';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export class SupabaseTaskRepository implements ITaskRepository {
  private supabase: SupabaseService | SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || SupabaseService.getInstance();
  }

  private getClient(): any {
    // If it's already a Supabase client, return it directly
    if ('from' in this.supabase) {
      return this.supabase;
    }
    // Otherwise it's SupabaseService, call getClient()
    return (this.supabase as SupabaseService).getClient();
  }

  async save(task: Task): Promise<void> {
    try {
      const taskProps = task.toJSON();
      const taskData: TaskInsert = this.mapTaskPropsToInsert(taskProps);

      const client = this.getClient();
      const { error } = await client.from('tasks').insert(taskData);

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Task saved: ${task.id} - "${task.title}"`);
    } catch (error) {
      console.error('Error saving task:', error);
      throw new Error(`Failed to save task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const client = this.getClient();
      const { data, error } = await client.from('tasks').select('*').eq('id', id).single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data ? this.mapRowToTask(data) : null;
    } catch (error) {
      console.error('Error finding task by ID:', error);
      throw new Error(`Failed to find task by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters?: TaskFilters, sort?: TaskSortOptions): Promise<Task[]> {
    try {
      const client = this.getClient();
      let query = client.from('tasks').select('*');

      // Apply filters
      if (filters) {
        query = this.applyFilters(query, filters);
      }

      // Apply sorting
      if (sort) {
        const column = this.mapSortField(sort.field);
        query = query.order(column, { ascending: sort.direction === 'asc' });
      } else {
        query = query.order('updated_at', { ascending: false });
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find tasks: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding all tasks:', error);
      throw new Error(`Failed to find tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByProjectId(projectId: string, filters?: Omit<TaskFilters, 'projectId'>): Promise<Task[]> {
    return this.findAll({ ...filters, projectId });
  }

  async findByAssigneeId(assigneeId: string, filters?: Omit<TaskFilters, 'assigneeId'>): Promise<Task[]> {
    return this.findAll({ ...filters, assigneeId });
  }

  async findByCreatedById(createdById: string, filters?: Omit<TaskFilters, 'createdById'>): Promise<Task[]> {
    return this.findAll({ ...filters, createdById });
  }

  async findByStatus(status: TaskStatus, filters?: Omit<TaskFilters, 'status'>): Promise<Task[]> {
    return this.findAll({ ...filters, status });
  }

  async findByPriority(priority: Priority, filters?: Omit<TaskFilters, 'priority'>): Promise<Task[]> {
    return this.findAll({ ...filters, priority });
  }

  async findByTag(tag: string, filters?: TaskFilters): Promise<Task[]> {
    try {
      const client = this.getClient();
      let query = client
        .from('tasks')
        .select('*')
        .contains('tags', [tag]);

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find tasks by tag: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by tag:', error);
      throw new Error(`Failed to find tasks by tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByTags(tags: string[], filters?: Omit<TaskFilters, 'tags'>): Promise<Task[]> {
    return this.findAll({ ...filters, tags });
  }

  async findByIds(ids: string[]): Promise<Task[]> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .in('id', ids);

      if (error) {
        throw new Error(`Failed to find tasks by IDs: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks by IDs:', error);
      throw new Error(`Failed to find tasks by IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: string, filters?: TaskFilters): Promise<Task[]> {
    try {
      const client = this.getClient();
      let dbQuery = client
        .from('tasks')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      if (filters) {
        dbQuery = this.applyFilters(dbQuery, filters);
      }

      dbQuery = dbQuery.order('updated_at', { ascending: false });

      const { data, error } = await dbQuery;

      if (error) {
        throw new Error(`Failed to search tasks: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error searching tasks:', error);
      throw new Error(`Failed to search tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findOverdue(filters?: Omit<TaskFilters, 'isOverdue'>): Promise<Task[]> {
    try {
      const client = this.getClient();
      const now = new Date().toISOString();
      
      let query = client
        .from('tasks')
        .select('*')
        .lt('due_date', now)
        .not('status', 'in', ['done', 'cancelled']);

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find overdue tasks: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding overdue tasks:', error);
      throw new Error(`Failed to find overdue tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findDueSoon(withinHours: number, filters?: TaskFilters): Promise<Task[]> {
    try {
      const client = this.getClient();
      const now = new Date();
      const future = new Date(now.getTime() + (withinHours * 60 * 60 * 1000));
      
      let query = client
        .from('tasks')
        .select('*')
        .gte('due_date', now.toISOString())
        .lte('due_date', future.toISOString())
        .not('status', 'in', ['done', 'cancelled']);

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find tasks due soon: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks due soon:', error);
      throw new Error(`Failed to find tasks due soon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findHighPriority(filters?: Omit<TaskFilters, 'priority'>): Promise<Task[]> {
    try {
      const client = this.getClient();
      let query = client
        .from('tasks')
        .select('*')
        .in('priority', ['high', 'urgent']);

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('priority', { ascending: false }).order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find high priority tasks: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding high priority tasks:', error);
      throw new Error(`Failed to find high priority tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findUnassigned(filters?: Omit<TaskFilters, 'assigneeId'>): Promise<Task[]> {
    try {
      const client = this.getClient();
      let query = client
        .from('tasks')
        .select('*')
        .is('assigned_to', null);

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find unassigned tasks: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding unassigned tasks:', error);
      throw new Error(`Failed to find unassigned tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findCompleted(filters?: TaskFilters): Promise<Task[]> {
    return this.findAll({ ...filters, status: TaskStatus.DONE });
  }

  async findActive(filters?: TaskFilters): Promise<Task[]> {
    try {
      const client = this.getClient();
      let query = client
        .from('tasks')
        .select('*')
        .not('status', 'in', ['done', 'cancelled']);

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find active tasks: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding active tasks:', error);
      throw new Error(`Failed to find active tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(task: Task): Promise<void> {
    try {
      const taskProps = task.toJSON();
      const taskData: TaskUpdate = this.mapTaskPropsToUpdate(taskProps);

      const client = this.getClient();
      const { error } = await client.from('tasks').update(taskData).eq('id', task.id);

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Task updated: ${task.id} - "${task.title}"`);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client.from('tasks').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }

      console.log(`Task deleted: ${id}`);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const task = await this.findById(id);
      return task !== null;
    } catch (error) {
      console.error('Error checking task existence:', error);
      return false;
    }
  }

  async count(filters?: TaskFilters): Promise<number> {
    try {
      const client = this.getClient();
      let query = client.from('tasks').select('*', { count: 'exact', head: true });

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(`Failed to count tasks: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting tasks:', error);
      throw new Error(`Failed to count tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countByStatus(projectId: string): Promise<Record<string, number>> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('tasks')
        .select('status')
        .eq('project_id', projectId);

      if (error) {
        throw new Error(`Failed to count tasks by status: ${error.message}`);
      }

      const counts: Record<string, number> = {
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
        cancelled: 0,
      };

      (data || []).forEach(task => {
        counts[task.status] = (counts[task.status] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('Error counting tasks by status:', error);
      throw new Error(`Failed to count tasks by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countByPriority(projectId: string): Promise<Record<string, number>> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('tasks')
        .select('priority')
        .eq('project_id', projectId);

      if (error) {
        throw new Error(`Failed to count tasks by priority: ${error.message}`);
      }

      const counts: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      };

      (data || []).forEach(task => {
        counts[task.priority] = (counts[task.priority] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('Error counting tasks by priority:', error);
      throw new Error(`Failed to count tasks by priority: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async countByAssignee(projectId: string): Promise<Record<string, number>> {
    try {
      const client = this.getClient();
      const { data, error } = await client
        .from('tasks')
        .select('assignee_id')
        .eq('project_id', projectId);

      if (error) {
        throw new Error(`Failed to count tasks by assignee: ${error.message}`);
      }

      const counts: Record<string, number> = {};

      (data || []).forEach(task => {
        const assigneeId = task.assigned_to || 'unassigned';
        counts[assigneeId] = (counts[assigneeId] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('Error counting tasks by assignee:', error);
      throw new Error(`Failed to count tasks by assignee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProjectStats(projectId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    averageCompletionTime?: number;
  }> {
    try {
      const client = this.getClient();
      
      // Get all tasks for the project
      const { data: tasks, error } = await client
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        throw new Error(`Failed to get project stats: ${error.message}`);
      }

      const taskEntities = (tasks || []).map(row => this.mapRowToTask(row));
      
      const stats = {
        total: taskEntities.length,
        completed: taskEntities.filter(t => t.status === 'done').length,
        inProgress: taskEntities.filter(t => t.status === 'in_progress').length,
        overdue: taskEntities.filter(t => t.isOverdue()).length,
      };

      // Calculate average completion time for completed tasks
      const completedTasks = taskEntities.filter(t => t.status === 'done');
      if (completedTasks.length > 0) {
        const totalCompletionTime = completedTasks.reduce((sum, task) => {
          const completionTime = task.updatedAt.getTime() - task.createdAt.getTime();
          return sum + (completionTime / (1000 * 60 * 60)); // Convert to hours
        }, 0);
        
        return {
          ...stats,
          averageCompletionTime: totalCompletionTime / completedTasks.length,
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting project stats:', error);
      throw new Error(`Failed to get project stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserStats(userId: string): Promise<{
    assigned: number;
    completed: number;
    overdue: number;
    averageCompletionTime?: number;
  }> {
    try {
      const client = this.getClient();
      
      // Get tasks assigned to user
      const { data: assignedTasks, error: assignedError } = await client
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId);

      if (assignedError) {
        throw new Error(`Failed to get user stats: ${assignedError.message}`);
      }

      const taskEntities = (assignedTasks || []).map(row => this.mapRowToTask(row));
      
      const stats = {
        assigned: taskEntities.length,
        completed: taskEntities.filter(t => t.status === 'done').length,
        overdue: taskEntities.filter(t => t.isOverdue()).length,
      };

      // Calculate average completion time
      const completedTasks = taskEntities.filter(t => t.status === 'done');
      if (completedTasks.length > 0) {
        const totalCompletionTime = completedTasks.reduce((sum, task) => {
          const completionTime = task.updatedAt.getTime() - task.createdAt.getTime();
          return sum + (completionTime / (1000 * 60 * 60)); // Convert to hours
        }, 0);
        
        return {
          ...stats,
          averageCompletionTime: totalCompletionTime / completedTasks.length,
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw new Error(`Failed to get user stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findCreatedBetween(startDate: Date, endDate: Date, filters?: TaskFilters): Promise<Task[]> {
    try {
      const client = this.getClient();
      let query = client
        .from('tasks')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (filters) {
        query = this.applyFilters(query, filters);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find tasks created between dates: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks created between dates:', error);
      throw new Error(`Failed to find tasks created between dates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findRecentlyUpdated(limit?: number, filters?: TaskFilters): Promise<Task[]> {
    const recentFilters = { ...filters, limit: limit || 50 };
    return this.findAll(recentFilters, { field: 'updatedAt', direction: 'desc' });
  }

  async findRequiringAttention(userId?: string): Promise<Task[]> {
    try {
      const client = this.getClient();
      const now = new Date().toISOString();
      
      let query = client
        .from('tasks')
        .select('*')
        .or('priority.eq.urgent,priority.eq.high,due_date.lt.' + now)
        .not('status', 'in', ['done', 'cancelled']);

      if (userId) {
        query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      }

      query = query.order('priority', { ascending: false }).order('due_date', { ascending: true });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find tasks requiring attention: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToTask(row));
    } catch (error) {
      console.error('Error finding tasks requiring attention:', error);
      throw new Error(`Failed to find tasks requiring attention: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllTags(projectId?: string): Promise<string[]> {
    try {
      const client = this.getClient();
      let query = client.from('tasks').select('tags');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to get all tags: ${error.message}`);
      }

      const allTags = new Set<string>();
      (data || []).forEach(task => {
        (task.tags || []).forEach(tag => allTags.add(tag));
      });

      return Array.from(allTags).sort();
    } catch (error) {
      console.error('Error getting all tags:', error);
      throw new Error(`Failed to get all tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bulkUpdate(tasks: Task[]): Promise<void> {
    try {
      await this.supabase.withTransaction(async (client) => {
        for (const task of tasks) {
          const taskProps = task.toJSON();
          const taskData: TaskUpdate = this.mapTaskPropsToUpdate(taskProps);
          
          const { error } = await client
            .from('tasks')
            .update(taskData)
            .eq('id', task.id);

          if (error) {
            throw new Error(`Failed to update task ${task.id}: ${error.message}`);
          }
        }
      });

      console.log(`Bulk updated ${tasks.length} tasks`);
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      throw new Error(`Failed to bulk update tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async bulkDelete(ids: string[]): Promise<void> {
    try {
      const client = this.getClient();
      const { error } = await client
        .from('tasks')
        .delete()
        .in('id', ids);

      if (error) {
        throw new Error(`Failed to bulk delete tasks: ${error.message}`);
      }

      console.log(`Bulk deleted ${ids.length} tasks`);
    } catch (error) {
      console.error('Error bulk deleting tasks:', error);
      throw new Error(`Failed to bulk delete tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods
  private priorityToNumber(priority: 'low' | 'medium' | 'high' | 'urgent'): number {
    const priorityMap = {
      'low': 1,
      'medium': 3,
      'high': 4,
      'urgent': 5
    };
    return priorityMap[priority] || 3;
  }

  private numberToPriority(priority: number): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap: Record<number, 'low' | 'medium' | 'high' | 'urgent'> = {
      1: 'low',
      2: 'low',
      3: 'medium',
      4: 'high',
      5: 'urgent'
    };
    return priorityMap[priority] || 'medium';
  }

  private statusToDb(status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'): 'open' | 'in_progress' | 'done' | 'cancelled' {
    const statusMap: Record<string, 'open' | 'in_progress' | 'done' | 'cancelled'> = {
      'todo': 'open',
      'in_progress': 'in_progress',
      'in_review': 'in_progress', // Map in_review to in_progress in DB
      'done': 'done',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'open';
  }

  private dbToStatus(status: 'open' | 'in_progress' | 'done' | 'cancelled'): 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled' {
    const statusMap: Record<string, 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'> = {
      'open': 'todo',
      'in_progress': 'in_progress',
      'done': 'done',
      'cancelled': 'cancelled'
    };
    return statusMap[status] || 'todo';
  }

  private applyFilters(query: any, filters: TaskFilters): any {
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.assigneeId) {
      query = query.eq('assigned_to', filters.assigneeId);
    }

    if (filters.createdById) {
      query = query.eq('created_by', filters.createdById);
    }

    if (filters.status) {
      query = query.eq('status', filters.status.toString());
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority.toString());
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.dueDateBefore) {
      query = query.lt('due_date', filters.dueDateBefore.toISOString());
    }

    if (filters.dueDateAfter) {
      query = query.gt('due_date', filters.dueDateAfter.toISOString());
    }

    if (filters.createdAfter) {
      query = query.gt('created_at', filters.createdAfter.toISOString());
    }

    if (filters.createdBefore) {
      query = query.lt('created_at', filters.createdBefore.toISOString());
    }

    return query;
  }

  private mapSortField(field: TaskSortOptions['field']): string {
    const fieldMap: Record<TaskSortOptions['field'], string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      dueDate: 'due_date',
      priority: 'priority',
      title: 'title',
    };

    return fieldMap[field];
  }

  private mapRowToTask(row: TaskRow): Task {
    const taskProps: TaskProps = {
      id: row.id,
      projectId: row.project_id,
      assigneeId: row.assigned_to || undefined,
      createdById: row.created_by,
      title: row.title,
      description: row.description || undefined,
      status: this.dbToStatus(row.status),
      priority: this.numberToPriority(row.priority),
      tags: row.tags || [],
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      estimatedHours: undefined,
      actualHours: 0,
      metadata: {
        source: row.metadata.source,
        originalMessage: row.metadata.originalMessage,
        aiProcessed: row.metadata.aiProcessed,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Task.fromProps(taskProps);
  }

  private mapTaskPropsToInsert(props: TaskProps): TaskInsert {
    return {
      id: props.id,
      project_id: props.projectId,
      assigned_to: props.assigneeId,
      created_by: props.createdById,
      title: props.title,
      description: props.description,
      status: this.statusToDb(props.status as any),
      priority: this.priorityToNumber(props.priority as any),
      tags: props.tags,
      due_date: props.dueDate?.toISOString(),
      metadata: {
        source: props.metadata.source,
        originalMessage: props.metadata.originalMessage,
        aiProcessed: props.metadata.aiProcessed,
      },
      created_at: props.createdAt.toISOString(),
      updated_at: props.updatedAt.toISOString(),
    };
  }

  private mapTaskPropsToUpdate(props: TaskProps): TaskUpdate {
    return {
      project_id: props.projectId,
      assigned_to: props.assigneeId,
      created_by: props.createdById,
      title: props.title,
      description: props.description,
      status: this.statusToDb(props.status as any),
      priority: this.priorityToNumber(props.priority as any),
      tags: props.tags,
      due_date: props.dueDate?.toISOString(),
      metadata: {
        source: props.metadata.source,
        originalMessage: props.metadata.originalMessage,
        aiProcessed: props.metadata.aiProcessed,
      },
      updated_at: props.updatedAt.toISOString(),
    };
  }
}