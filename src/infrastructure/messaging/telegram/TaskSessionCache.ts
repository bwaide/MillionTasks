/**
 * Task Session Cache
 * Stores numbered task lists per user for easy reference
 */

import { Task } from '../../../domain/entities/Task.js';

interface UserTaskSession {
  tasks: Task[];
  lastUpdated: Date;
}

export class TaskSessionCache {
  private sessions: Map<string, UserTaskSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Store tasks for a user session
   */
  setUserTasks(userId: string, tasks: Task[]): void {
    this.sessions.set(userId, {
      tasks,
      lastUpdated: new Date(),
    });
  }

  /**
   * Get task by number (1-indexed)
   */
  getTaskByNumber(userId: string, taskNumber: number): Task | null {
    const session = this.getValidSession(userId);
    if (!session) return null;

    const index = taskNumber - 1; // Convert to 0-indexed
    if (index < 0 || index >= session.tasks.length) {
      return null;
    }

    return session.tasks[index];
  }

  /**
   * Find task by fuzzy matching title/description
   */
  findTaskByDescription(userId: string, description: string): Task | null {
    const session = this.getValidSession(userId);
    if (!session) return null;

    const searchTerm = description.toLowerCase().trim();

    // Try exact match first
    let match = session.tasks.find(task =>
      task.title.toLowerCase() === searchTerm
    );
    if (match) return match;

    // Try contains match
    match = session.tasks.find(task =>
      task.title.toLowerCase().includes(searchTerm) ||
      task.description?.toLowerCase().includes(searchTerm)
    );
    if (match) return match;

    // Try word matching (any word in search appears in title)
    const searchWords = searchTerm.split(/\s+/);
    match = session.tasks.find(task => {
      const title = task.title.toLowerCase();
      return searchWords.every(word => title.includes(word));
    });

    return match || null;
  }

  /**
   * Find all matching tasks (for ambiguous searches)
   */
  findAllMatchingTasks(userId: string, description: string): Task[] {
    const session = this.getValidSession(userId);
    if (!session) return [];

    const searchTerm = description.toLowerCase().trim();
    const searchWords = searchTerm.split(/\s+/);

    return session.tasks.filter(task => {
      const title = task.title.toLowerCase();
      const desc = task.description?.toLowerCase() || '';

      // Match if any search word appears in title or description
      return searchWords.some(word =>
        title.includes(word) || desc.includes(word)
      );
    });
  }

  /**
   * Get task number for a task ID
   */
  getTaskNumber(userId: string, taskId: string): number | null {
    const session = this.getValidSession(userId);
    if (!session) return null;

    const index = session.tasks.findIndex(task => task.id === taskId);
    return index >= 0 ? index + 1 : null;
  }

  /**
   * Get all tasks for a user
   */
  getUserTasks(userId: string): Task[] | null {
    const session = this.getValidSession(userId);
    return session ? session.tasks : null;
  }

  /**
   * Clear session for a user
   */
  clearUserSession(userId: string): void {
    this.sessions.delete(userId);
  }

  /**
   * Clear all expired sessions
   */
  clearExpiredSessions(): void {
    const now = new Date();
    for (const [userId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastUpdated.getTime();
      if (age > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(userId);
      }
    }
  }

  /**
   * Get valid session (not expired)
   */
  private getValidSession(userId: string): UserTaskSession | null {
    const session = this.sessions.get(userId);
    if (!session) return null;

    const age = new Date().getTime() - session.lastUpdated.getTime();
    if (age > this.SESSION_TIMEOUT_MS) {
      this.sessions.delete(userId);
      return null;
    }

    return session;
  }
}
