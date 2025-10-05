import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SupabaseUserRepository } from '../SupabaseUserRepository.js';
import { User } from '../../../../domain/entities/User.js';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        limit: vi.fn()
      })),
      single: vi.fn(),
      limit: vi.fn()
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    })),
    insert: vi.fn()
  }))
} as unknown as SupabaseClient;

describe('SupabaseUserRepository', () => {
  let repository: SupabaseUserRepository;
  let mockFromMethod: any;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new SupabaseUserRepository(mockSupabaseClient);
    mockFromMethod = mockSupabaseClient.from as any;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('findByTelegramId', () => {
    it('should find user by Telegram ID using user_channels table', async () => {
      const telegramId = '123456789';
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const userData = {
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        is_active: true,
        timezone: 'UTC',
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: true,
            projectUpdates: true
          }
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock user_channels query
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: { user_id: userId },
                error: null
              })
            })
          })
        })
      });

      // Mock users query
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: userData,
              error: null
            })
          })
        })
      });

      const user = await repository.findByTelegramId(telegramId);

      expect(user).toBeInstanceOf(User);
      expect(user?.firstName).toBe('John');
      expect(user?.telegramId).toBe(telegramId);
      expect(mockFromMethod).toHaveBeenCalledWith('user_channels');
      expect(mockFromMethod).toHaveBeenCalledWith('users');
    });

    it('should return null if user not found by Telegram ID', async () => {
      const telegramId = '999999999';

      // Mock user_channels query - no results
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' } // Not found
              })
            })
          })
        })
      });

      const user = await repository.findByTelegramId(telegramId);

      expect(user).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const telegramId = '123456789';

      // Mock database error
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { code: 'DB_ERROR', message: 'Database connection failed' }
              })
            })
          })
        })
      });

      await expect(repository.findByTelegramId(telegramId))
        .rejects
        .toThrow('Failed to find user by Telegram ID: Failed to find user channel: Database connection failed');
    });
  });

  describe('save', () => {
    it('should save a new user with Telegram ID', async () => {
      const user = User.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        username: 'janesmith',
        telegramId: '987654321',
        preferences: {
          timezone: 'EST',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: false,
            projectUpdates: true
          }
        },
        isActive: true
      });

      const savedUserData = {
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        username: user.username,
        is_active: user.isActive,
        timezone: user.preferences.timezone,
        preferences: user.preferences,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString()
      };

      // Mock users table upsert
      mockFromMethod.mockReturnValueOnce({
        upsert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: savedUserData,
              error: null
            })
          })
        })
      });

      // Mock user_channels table upsert
      mockFromMethod.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValueOnce({
          error: null
        })
      });

      const result = await repository.save(user);

      expect(result).toBeInstanceOf(User);
      expect(result.firstName).toBe('Jane');
      expect(mockFromMethod).toHaveBeenCalledWith('users');
      expect(mockFromMethod).toHaveBeenCalledWith('user_channels');
    });

    it('should handle save errors gracefully', async () => {
      const user = User.create({
        firstName: 'Error',
        lastName: 'User',
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: true,
            projectUpdates: true
          }
        },
        isActive: true
      });

      // Mock database error
      mockFromMethod.mockReturnValueOnce({
        upsert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { message: 'Constraint violation' }
            })
          })
        })
      });

      await expect(repository.save(user))
        .rejects
        .toThrow('Failed to save user: Constraint violation');
    });
  });

  describe('findById', () => {
    it('should find user by ID and include Telegram channel', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const telegramId = '123456789';
      const userData = {
        id: userId,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        username: 'johndoe',
        is_active: true,
        timezone: 'UTC',
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: true,
            projectUpdates: true
          }
        },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      // Mock users query
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: userData,
              error: null
            })
          })
        })
      });

      // Mock user_channels query
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [{ channel_type: 'telegram', channel_identifier: telegramId }],
            error: null
          })
        })
      });

      const user = await repository.findById(userId);

      expect(user).toBeInstanceOf(User);
      expect(user?.id).toBe(userId);
      expect(user?.telegramId).toBe(telegramId);
    });

    it('should return null for non-existent user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';

      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: null,
              error: { code: 'PGRST116' } // Not found
            })
          })
        })
      });

      const user = await repository.findById(userId);

      expect(user).toBeNull();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing preferences gracefully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440003';
      const userData = {
        id: userId,
        first_name: 'No',
        last_name: 'Prefs',
        is_active: true,
        timezone: 'PST', // Legacy timezone field
        preferences: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };

      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: userData,
              error: null
            })
          })
        })
      });

      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
            error: null
          })
        })
      });

      const user = await repository.findById(userId);

      expect(user).toBeInstanceOf(User);
      expect(user?.preferences.timezone).toBe('PST');
      expect(user?.preferences.language).toBe('en');
      expect(user?.preferences.notifications.enabled).toBe(true);
    });

    it('should handle malformed database response', async () => {
      const telegramId = '123456789';

      // Mock malformed response
      mockFromMethod.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              single: vi.fn().mockRejectedValueOnce(new Error('Network error'))
            })
          })
        })
      });

      await expect(repository.findByTelegramId(telegramId))
        .rejects
        .toThrow('Failed to find user by Telegram ID: Network error');
    });
  });

  describe('user channel management', () => {
    it('should save user channel when saving user with Telegram ID', async () => {
      const user = User.create({
        firstName: 'Channel',
        lastName: 'Test',
        telegramId: '111222333',
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: true,
            projectUpdates: true
          }
        },
        isActive: true
      });

      // Mock successful user save
      mockFromMethod.mockReturnValueOnce({
        upsert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: user.id },
              error: null
            })
          })
        })
      });

      // Mock successful channel save
      const channelUpsertMock = vi.fn().mockResolvedValueOnce({ error: null });
      mockFromMethod.mockReturnValueOnce({
        upsert: channelUpsertMock
      });

      await repository.save(user);

      expect(channelUpsertMock).toHaveBeenCalledWith({
        user_id: user.id,
        channel_type: 'telegram',
        channel_identifier: '111222333',
        is_primary: true
      });
    });

    it('should not fail if channel save fails', async () => {
      const user = User.create({
        firstName: 'Resilient',
        lastName: 'User',
        telegramId: '444555666',
        preferences: {
          timezone: 'UTC',
          language: 'en',
          notifications: {
            enabled: true,
            taskReminders: true,
            projectUpdates: true
          }
        },
        isActive: true
      });

      // Mock successful user save
      mockFromMethod.mockReturnValueOnce({
        upsert: vi.fn().mockReturnValueOnce({
          select: vi.fn().mockReturnValueOnce({
            single: vi.fn().mockResolvedValueOnce({
              data: { id: user.id },
              error: null
            })
          })
        })
      });

      // Mock failed channel save
      mockFromMethod.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValueOnce({
          error: { message: 'Channel constraint violation' }
        })
      });

      // Should not throw even if channel save fails
      const result = await repository.save(user);
      expect(result).toBeInstanceOf(User);
    });
  });
});