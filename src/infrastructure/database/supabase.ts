import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_id: string;
          username: string | null;
          first_name: string;
          last_name: string | null;
          email: string | null;
          is_active: boolean;
          preferences: {
            timezone: string;
            language: string;
            notifications: {
              enabled: boolean;
              taskReminders: boolean;
              projectUpdates: boolean;
            };
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          telegram_id: string;
          username?: string | null;
          first_name: string;
          last_name?: string | null;
          email?: string | null;
          is_active?: boolean;
          preferences?: {
            timezone: string;
            language: string;
            notifications: {
              enabled: boolean;
              taskReminders: boolean;
              projectUpdates: boolean;
            };
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          telegram_id?: string;
          username?: string | null;
          first_name?: string;
          last_name?: string | null;
          email?: string | null;
          is_active?: boolean;
          preferences?: {
            timezone: string;
            language: string;
            notifications: {
              enabled: boolean;
              taskReminders: boolean;
              projectUpdates: boolean;
            };
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          settings: {
            isPublic: boolean;
            allowTaskCreation: boolean;
            requireApproval: boolean;
            defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          settings?: {
            isPublic: boolean;
            allowTaskCreation: boolean;
            requireApproval: boolean;
            defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          settings?: {
            isPublic: boolean;
            allowTaskCreation: boolean;
            requireApproval: boolean;
            defaultPriority: 'low' | 'medium' | 'high' | 'urgent';
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          assigned_to: string | null;
          created_by: string;
          title: string;
          description: string | null;
          status: 'open' | 'in_progress' | 'done' | 'cancelled';
          priority: number;
          tags: string[];
          due_date: string | null;
          metadata: {
            source: 'telegram' | 'api' | 'web';
            originalMessage?: string;
            aiProcessed: boolean;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          assigned_to?: string | null;
          created_by: string;
          title: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'done' | 'cancelled';
          priority?: number;
          tags?: string[];
          due_date?: string | null;
          metadata?: {
            source: 'telegram' | 'api' | 'web';
            originalMessage?: string;
            aiProcessed: boolean;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          assigned_to?: string | null;
          created_by?: string;
          title?: string;
          description?: string | null;
          status?: 'open' | 'in_progress' | 'done' | 'cancelled';
          priority?: number;
          tags?: string[];
          due_date?: string | null;
          metadata?: {
            source: 'telegram' | 'api' | 'web';
            originalMessage?: string;
            aiProcessed: boolean;
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          permissions: {
            canCreateTasks: boolean;
            canEditTasks: boolean;
            canDeleteTasks: boolean;
            canAssignTasks: boolean;
            canManageMembers: boolean;
            canEditProject: boolean;
            canDeleteProject: boolean;
            canViewTasks: boolean;
          };
          granted_by_id: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          permissions: {
            canCreateTasks: boolean;
            canEditTasks: boolean;
            canDeleteTasks: boolean;
            canAssignTasks: boolean;
            canManageMembers: boolean;
            canEditProject: boolean;
            canDeleteProject: boolean;
            canViewTasks: boolean;
          };
          granted_by_id: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          permissions?: {
            canCreateTasks: boolean;
            canEditTasks: boolean;
            canDeleteTasks: boolean;
            canAssignTasks: boolean;
            canManageMembers: boolean;
            canEditProject: boolean;
            canDeleteProject: boolean;
            canViewTasks: boolean;
          };
          granted_by_id?: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // We're not using Supabase auth for user sessions
        autoRefreshToken: false,
      },
    });
  }

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  getClient(): SupabaseClient<Database> {
    return this.client;
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const { error } = await this.client.from('users').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  // Transaction helpers
  async withTransaction<T>(callback: (client: SupabaseClient<Database>) => Promise<T>): Promise<T> {
    // Note: Supabase doesn't support explicit transactions in the client library
    // In a production environment, you might want to use database functions or
    // implement optimistic locking patterns
    return await callback(this.client);
  }

  // Generic query helpers
  async findById<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string
  ): Promise<Database['public']['Tables'][T]['Row'] | null> {
    const { data, error } = await this.client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to find ${String(table)} by id: ${error.message}`);
    }

    return data;
  }

  async findMany<T extends keyof Database['public']['Tables']>(
    table: T,
    filters?: Record<string, any>,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: { column: string; ascending?: boolean };
    }
  ): Promise<Database['public']['Tables'][T]['Row'][]> {
    let query = this.client.from(table).select('*');

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find ${String(table)}: ${error.message}`);
    }

    return data || [];
  }

  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    data: Database['public']['Tables'][T]['Insert']
  ): Promise<Database['public']['Tables'][T]['Row']> {
    const { data: insertedData, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert into ${String(table)}: ${error.message}`);
    }

    return insertedData;
  }

  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string,
    data: Database['public']['Tables'][T]['Update']
  ): Promise<Database['public']['Tables'][T]['Row']> {
    const { data: updatedData, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ${String(table)}: ${error.message}`);
    }

    return updatedData;
  }

  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string
  ): Promise<void> {
    const { error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete from ${String(table)}: ${error.message}`);
    }
  }

  async count<T extends keyof Database['public']['Tables']>(
    table: T,
    filters?: Record<string, any>
  ): Promise<number> {
    let query = this.client.from(table).select('*', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count ${String(table)}: ${error.message}`);
    }

    return count || 0;
  }
}