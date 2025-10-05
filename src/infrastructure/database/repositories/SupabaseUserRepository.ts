import { User, UserProps } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(user: User): Promise<User> {
    try {
      const userData = {
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

      const { data, error } = await this.supabase
        .from('users')
        .upsert(userData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save user: ${error.message}`);
      }

      // If the user has a Telegram ID, also save it to user_channels
      if (user.telegramId) {
        await this.saveUserChannel(user.id!, 'telegram', user.telegramId);
      }

      console.log(`User saved: ${user.id} (${user.firstName})`);
      return user;
    } catch (error) {
      console.error('Error saving user:', error);
      throw new Error(`Failed to save user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to find user by ID: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Get user channels (including Telegram ID)
      const { data: channels } = await this.supabase
        .from('user_channels')
        .select('*')
        .eq('user_id', id);

      const telegramChannel = channels?.find(c => c.channel_type === 'telegram');
      
      return this.mapRowToUser(data, telegramChannel?.channel_identifier);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByTelegramId(telegramId: string): Promise<User | null> {
    try {
      // Find user through user_channels table
      const { data: channelData, error: channelError } = await this.supabase
        .from('user_channels')
        .select('user_id')
        .eq('channel_type', 'telegram')
        .eq('channel_identifier', telegramId)
        .single();

      if (channelError && channelError.code !== 'PGRST116') {
        throw new Error(`Failed to find user channel: ${channelError.message}`);
      }

      if (!channelData) {
        return null;
      }

      // Get the user data
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', channelData.user_id)
        .single();

      if (userError) {
        throw new Error(`Failed to find user: ${userError.message}`);
      }

      return this.mapRowToUser(userData, telegramId);
    } catch (error) {
      console.error('Error finding user by Telegram ID:', error);
      throw new Error(`Failed to find user by Telegram ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find user by email: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Get Telegram channel if exists
      const { data: channels } = await this.supabase
        .from('user_channels')
        .select('*')
        .eq('user_id', data.id)
        .eq('channel_type', 'telegram');

      const telegramId = channels?.[0]?.channel_identifier;
      
      return this.mapRowToUser(data, telegramId);
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to find user by username: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Get Telegram channel if exists
      const { data: channels } = await this.supabase
        .from('user_channels')
        .select('*')
        .eq('user_id', data.id)
        .eq('channel_type', 'telegram');

      const telegramId = channels?.[0]?.channel_identifier;
      
      return this.mapRowToUser(data, telegramId);
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw new Error(`Failed to find user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(user: User): Promise<void> {
    try {
      const userData = {
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        is_active: user.isActive,
        timezone: user.preferences.timezone,
        preferences: user.preferences,
        updated_at: user.updatedAt.toISOString()
      };

      const { error } = await this.supabase
        .from('users')
        .update(userData)
        .eq('id', user.id);

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      // Update Telegram channel if needed
      if (user.telegramId) {
        await this.saveUserChannel(user.id!, 'telegram', user.telegramId);
      }

      console.log(`User updated: ${user.id} (${user.firstName})`);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }

      console.log(`User deleted: ${id}`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const user = await this.findById(id);
      return user !== null;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  // Private helper methods
  private async saveUserChannel(userId: string, channelType: string, channelIdentifier: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_channels')
      .upsert({
        user_id: userId,
        channel_type: channelType,
        channel_identifier: channelIdentifier,
        is_primary: true
      });

    if (error) {
      console.error('Error saving user channel:', error);
      // Don't throw here as this is secondary to user creation
    }
  }

  private mapRowToUser(row: any, telegramId?: string): User {
    const userProps: UserProps = {
      id: row.id,
      telegramId: telegramId,
      username: row.username || undefined,
      firstName: row.first_name,
      lastName: row.last_name || undefined,
      email: row.email || undefined,
      isActive: row.is_active,
      preferences: row.preferences || {
        timezone: row.timezone || 'UTC',
        language: 'en',
        notifications: {
          enabled: true,
          taskReminders: true,
          projectUpdates: true,
        },
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };

    return User.fromProps(userProps);
  }
}