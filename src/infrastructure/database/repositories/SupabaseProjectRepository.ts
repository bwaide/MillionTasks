import { Project, ProjectProps } from '../../../domain/entities/Project.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseProjectRepository implements IProjectRepository {
  constructor(private readonly supabaseClient: SupabaseClient) {}

  async save(project: Project): Promise<Project> {
    try {
      const projectData = {
        id: project.id,
        name: project.name,
        description: project.description,
        owner_id: project.ownerId,
        settings: project.settings,
        is_archived: !project.isActive,
        is_active: project.isActive,
        created_at: project.createdAt.toISOString(),
        updated_at: project.updatedAt.toISOString()
      };

      const { data, error } = await this.supabaseClient
        .from('projects')
        .upsert(projectData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save project: ${error.message}`);
      }

      console.log(`Project saved: ${project.id} - "${project.name}"`);
      return project;
    } catch (error) {
      console.error('Error saving project:', error);
      throw new Error(`Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Project | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to find project by ID: ${error.message}`);
      }

      return data ? this.mapRowToProject(data) : null;
    } catch (error) {
      console.error('Error finding project by ID:', error);
      throw new Error(`Failed to find project by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findAll(filters?: {
    ownerId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      const dbFilters: Record<string, any> = {};
      
      if (filters?.ownerId) {
        dbFilters.owner_id = filters.ownerId;
      }

      if (filters?.isActive !== undefined) {
        dbFilters.is_active = filters.isActive;
      }

      let query = this.supabaseClient
        .from('projects')
        .select('*');

      // Apply filters
      Object.entries(dbFilters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      query = query.order('updated_at', { ascending: false });

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data: projectData, error } = await query;

      if (error) {
        throw new Error(`Failed to find projects: ${error.message}`);
      }

      return projectData.map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error finding all projects:', error);
      throw new Error(`Failed to find projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOwnerId(ownerId: string): Promise<Project[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to find projects by owner ID: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error finding projects by owner ID:', error);
      throw new Error(`Failed to find projects by owner ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string): Promise<Project[]> {
    try {
      // This implementation finds projects where the user is the owner
      // In a full implementation, this would also check permissions table
      // for projects where the user has any level of access
      // Get projects owned by the user
      const { data: ownedProjects, error: ownedError } = await this.supabaseClient
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .eq('is_active', true);

      if (ownedError) {
        throw new Error(`Failed to find owned projects: ${ownedError.message}`);
      }

      // TODO: In a full implementation, also query the permissions table
      // to find projects where the user has permissions but is not the owner
      /*
      const { data: permissionProjects, error: permissionError } = await client
        .from('permissions')
        .select('project_id, projects(*)')
        .eq('user_id', userId)
        .eq('projects.is_active', true);
      */

      const projects = (ownedProjects || []).map(row => this.mapRowToProject(row));
      
      // Remove duplicates and sort by update time
      const uniqueProjects = projects.filter((project, index, self) => 
        index === self.findIndex(p => p.id === project.id)
      );

      return uniqueProjects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error finding projects by user ID:', error);
      throw new Error(`Failed to find projects by user ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByIds(ids: string[]): Promise<Project[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .select('*')
        .in('id', ids);

      if (error) {
        throw new Error(`Failed to find projects by IDs: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error finding projects by IDs:', error);
      throw new Error(`Failed to find projects by IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(query: string, options?: {
    ownerId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      let dbQuery = this.supabaseClient
        .from('projects')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

      if (options?.ownerId) {
        dbQuery = dbQuery.eq('owner_id', options.ownerId);
      }

      if (options?.isActive !== undefined) {
        dbQuery = dbQuery.eq('is_active', options.isActive);
      } else {
        dbQuery = dbQuery.eq('is_active', true); // Default to active projects
      }

      dbQuery = dbQuery.order('updated_at', { ascending: false });

      if (options?.limit) {
        dbQuery = dbQuery.limit(options.limit);
      }

      if (options?.offset) {
        dbQuery = dbQuery.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data, error } = await dbQuery;

      if (error) {
        throw new Error(`Failed to search projects: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error searching projects:', error);
      throw new Error(`Failed to search projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findPublicProjects(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      let query = this.supabaseClient
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .contains('settings', { isPublic: true })
        .order('updated_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find public projects: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error finding public projects:', error);
      throw new Error(`Failed to find public projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(project: Project): Promise<void> {
    try {
      const projectProps = project.toJSON();
      const projectData: ProjectUpdate = this.mapProjectPropsToUpdate(projectProps);

      const { error } = await this.supabaseClient
        .from('projects')
        .update(projectData)
        .eq('id', project.id);

      if (error) {
        throw new Error(`Failed to update project: ${error.message}`);
      }
      console.log(`Project updated: ${project.id} - "${project.name}"`);
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error(`Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete project: ${error.message}`);
      }
      console.log(`Project deleted: ${id}`);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error(`Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const project = await this.findById(id);
      return project !== null;
    } catch (error) {
      console.error('Error checking project existence:', error);
      return false;
    }
  }

  async existsByNameAndOwner(name: string, ownerId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .select('id')
        .eq('name', name)
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to check project name existence: ${error.message}`);
      }

      return data !== null;
    } catch (error) {
      console.error('Error checking project name existence:', error);
      return false;
    }
  }

  async count(filters?: {
    ownerId?: string;
    isActive?: boolean;
  }): Promise<number> {
    try {
      const dbFilters: Record<string, any> = {};
      
      if (filters?.ownerId) {
        dbFilters.owner_id = filters.ownerId;
      }

      if (filters?.isActive !== undefined) {
        dbFilters.is_active = filters.isActive;
      }

      let query = this.supabaseClient
        .from('projects')
        .select('*', { count: 'exact', head: true });

      Object.entries(dbFilters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query;

      if (error) {
        throw new Error(`Failed to count projects: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting projects:', error);
      throw new Error(`Failed to count projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findCreatedBetween(startDate: Date, endDate: Date): Promise<Project[]> {
    try {
      const { data, error } = await this.supabaseClient
        .from('projects')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to find projects created between dates: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error finding projects created between dates:', error);
      throw new Error(`Failed to find projects created between dates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findRecentlyUpdated(limit?: number): Promise<Project[]> {
    try {
      let query = this.supabaseClient
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find recently updated projects: ${error.message}`);
      }

      return (data || []).map(row => this.mapRowToProject(row));
    } catch (error) {
      console.error('Error finding recently updated projects:', error);
      throw new Error(`Failed to find recently updated projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByTaskCount(options?: {
    limit?: number;
    minTaskCount?: number;
  }): Promise<Array<{ project: Project; taskCount: number }>> {
    try {
      // This is a complex query that would benefit from a database view or function
      // For now, we'll do it in two steps: get projects, then count tasks for each
      const { data: projects, error: projectError } = await this.supabaseClient
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (projectError) {
        throw new Error(`Failed to find projects: ${projectError.message}`);
      }

      const projectsWithTaskCount: Array<{ project: Project; taskCount: number }> = [];

      for (const projectRow of (projects || [])) {
        const { count, error: countError } = await this.supabaseClient
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectRow.id);

        if (countError) {
          console.warn(`Failed to count tasks for project ${projectRow.id}:`, countError);
          continue;
        }

        const taskCount = count || 0;
        
        if (options?.minTaskCount === undefined || taskCount >= options.minTaskCount) {
          projectsWithTaskCount.push({
            project: this.mapRowToProject(projectRow),
            taskCount,
          });
        }
      }

      // Sort by task count (descending)
      projectsWithTaskCount.sort((a, b) => b.taskCount - a.taskCount);

      // Apply limit
      if (options?.limit) {
        return projectsWithTaskCount.slice(0, options.limit);
      }

      return projectsWithTaskCount;
    } catch (error) {
      console.error('Error finding projects by task count:', error);
      throw new Error(`Failed to find projects by task count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findActiveProjectsForUser(userId: string): Promise<Project[]> {
    try {
      // For now, this returns the same as findByUserId since we don't have
      // full permissions implementation. In a complete system, this would
      // check the permissions table and return all projects where the user
      // has any active permissions.
      return this.findByUserId(userId);
    } catch (error) {
      console.error('Error finding active projects for user:', error);
      throw new Error(`Failed to find active projects for user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private mapping methods
  private mapRowToProject(row: ProjectRow): Project {
    const projectProps: ProjectProps = {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      description: row.description || undefined,
      isActive: row.is_active,
      settings: {
        isPublic: row.settings.isPublic,
        allowTaskCreation: row.settings.allowTaskCreation,
        requireApproval: row.settings.requireApproval,
        defaultPriority: row.settings.defaultPriority,
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return Project.fromProps(projectProps);
  }

  private mapProjectPropsToInsert(props: ProjectProps): ProjectInsert {
    return {
      id: props.id,
      owner_id: props.ownerId,
      name: props.name,
      description: props.description,
      is_active: props.isActive,
      settings: {
        isPublic: props.settings.isPublic,
        allowTaskCreation: props.settings.allowTaskCreation,
        requireApproval: props.settings.requireApproval,
        defaultPriority: props.settings.defaultPriority,
      },
      created_at: props.createdAt.toISOString(),
      updated_at: props.updatedAt.toISOString(),
    };
  }

  private mapProjectPropsToUpdate(props: ProjectProps): ProjectUpdate {
    return {
      owner_id: props.ownerId,
      name: props.name,
      description: props.description,
      is_active: props.isActive,
      settings: {
        isPublic: props.settings.isPublic,
        allowTaskCreation: props.settings.allowTaskCreation,
        requireApproval: props.settings.requireApproval,
        defaultPriority: props.settings.defaultPriority,
      },
      updated_at: props.updatedAt.toISOString(),
    };
  }
}