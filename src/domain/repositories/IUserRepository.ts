import { User } from '../entities/User.js';

export interface IUserRepository {
  /**
   * Save a user to the repository
   */
  save(user: User): Promise<void>;

  /**
   * Find a user by their unique ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by their Telegram ID
   */
  findByTelegramId(telegramId: string): Promise<User | null>;

  /**
   * Find a user by their email address
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find a user by their username
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find all users with optional filtering
   */
  findAll(filters?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<User[]>;

  /**
   * Find users by their IDs
   */
  findByIds(ids: string[]): Promise<User[]>;

  /**
   * Search users by name or username
   */
  search(query: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<User[]>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<void>;

  /**
   * Delete a user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a user exists by ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Check if a user exists by Telegram ID
   */
  existsByTelegramId(telegramId: string): Promise<boolean>;

  /**
   * Check if a user exists by email
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Check if a user exists by username
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Count total number of users with optional filtering
   */
  count(filters?: {
    isActive?: boolean;
  }): Promise<number>;

  /**
   * Get users created within a date range
   */
  findCreatedBetween(startDate: Date, endDate: Date): Promise<User[]>;

  /**
   * Get recently active users
   */
  findRecentlyActive(limit?: number): Promise<User[]>;
}