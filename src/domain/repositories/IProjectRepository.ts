import { Project } from '../entities/Project.js';

export interface IProjectRepository {
  /**
   * Save a project to the repository
   */
  save(project: Project): Promise<void>;

  /**
   * Find a project by its unique ID
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Find all projects with optional filtering
   */
  findAll(filters?: {
    ownerId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]>;

  /**
   * Find projects by owner ID
   */
  findByOwnerId(ownerId: string): Promise<Project[]>;

  /**
   * Find projects where user has any permissions
   */
  findByUserId(userId: string): Promise<Project[]>;

  /**
   * Find projects by their IDs
   */
  findByIds(ids: string[]): Promise<Project[]>;

  /**
   * Search projects by name or description
   */
  search(query: string, options?: {
    ownerId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Project[]>;

  /**
   * Find public projects
   */
  findPublicProjects(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Project[]>;

  /**
   * Update an existing project
   */
  update(project: Project): Promise<void>;

  /**
   * Delete a project by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a project exists by ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Check if a project name exists for a specific owner
   */
  existsByNameAndOwner(name: string, ownerId: string): Promise<boolean>;

  /**
   * Count total number of projects with optional filtering
   */
  count(filters?: {
    ownerId?: string;
    isActive?: boolean;
  }): Promise<number>;

  /**
   * Get projects created within a date range
   */
  findCreatedBetween(startDate: Date, endDate: Date): Promise<Project[]>;

  /**
   * Get recently updated projects
   */
  findRecentlyUpdated(limit?: number): Promise<Project[]>;

  /**
   * Get projects with most tasks
   */
  findByTaskCount(options?: {
    limit?: number;
    minTaskCount?: number;
  }): Promise<Array<{ project: Project; taskCount: number }>>;

  /**
   * Get active projects for a user (where user has permissions)
   */
  findActiveProjectsForUser(userId: string): Promise<Project[]>;
}