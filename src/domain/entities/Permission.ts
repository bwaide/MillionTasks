import { z } from 'zod';

export const PermissionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  permissions: z.object({
    canCreateTasks: z.boolean().default(false),
    canEditTasks: z.boolean().default(false),
    canDeleteTasks: z.boolean().default(false),
    canAssignTasks: z.boolean().default(false),
    canManageMembers: z.boolean().default(false),
    canEditProject: z.boolean().default(false),
    canDeleteProject: z.boolean().default(false),
    canViewTasks: z.boolean().default(true),
  }),
  grantedById: z.string().uuid(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PermissionProps = z.infer<typeof PermissionSchema>;

export class Permission {
  private constructor(private readonly props: PermissionProps) {
    this.validate();
  }

  static create(props: Omit<PermissionProps, 'id' | 'createdAt' | 'updatedAt'>): Permission {
    const now = new Date();
    return new Permission({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: PermissionProps): Permission {
    return new Permission(props);
  }

  static createForRole(
    userId: string,
    projectId: string,
    role: PermissionProps['role'],
    grantedById: string,
    expiresAt?: Date
  ): Permission {
    const permissions = Permission.getDefaultPermissionsForRole(role);
    
    return Permission.create({
      userId,
      projectId,
      role,
      permissions,
      grantedById,
      expiresAt,
    });
  }

  private static getDefaultPermissionsForRole(role: PermissionProps['role']): PermissionProps['permissions'] {
    switch (role) {
      case 'owner':
        return {
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true,
          canManageMembers: true,
          canEditProject: true,
          canDeleteProject: true,
          canViewTasks: true,
        };
      case 'admin':
        return {
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true,
          canManageMembers: true,
          canEditProject: true,
          canDeleteProject: false,
          canViewTasks: true,
        };
      case 'member':
        return {
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: false,
          canAssignTasks: true,
          canManageMembers: false,
          canEditProject: false,
          canDeleteProject: false,
          canViewTasks: true,
        };
      case 'viewer':
        return {
          canCreateTasks: false,
          canEditTasks: false,
          canDeleteTasks: false,
          canAssignTasks: false,
          canManageMembers: false,
          canEditProject: false,
          canDeleteProject: false,
          canViewTasks: true,
        };
      default:
        throw new Error(`Unknown role: ${role}`);
    }
  }

  private validate(): void {
    const result = PermissionSchema.safeParse(this.props);
    if (!result.success) {
      throw new Error(`Invalid Permission: ${result.error.message}`);
    }

    if (this.props.expiresAt && this.props.expiresAt <= this.props.createdAt) {
      throw new Error('Expiration date must be after creation date');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get projectId(): string {
    return this.props.projectId;
  }

  get role(): PermissionProps['role'] {
    return this.props.role;
  }

  get permissions(): PermissionProps['permissions'] {
    return this.props.permissions;
  }

  get grantedById(): string {
    return this.props.grantedById;
  }

  get expiresAt(): Date | undefined {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateRole(role: PermissionProps['role']): Permission {
    if (this.props.role === role) {
      return this;
    }

    const permissions = Permission.getDefaultPermissionsForRole(role);

    return new Permission({
      ...this.props,
      role,
      permissions,
      updatedAt: new Date(),
    });
  }

  updatePermissions(permissions: Partial<PermissionProps['permissions']>): Permission {
    return new Permission({
      ...this.props,
      permissions: {
        ...this.props.permissions,
        ...permissions,
      },
      updatedAt: new Date(),
    });
  }

  extend(expiresAt: Date | undefined): Permission {
    if (expiresAt && expiresAt <= new Date()) {
      throw new Error('New expiration date must be in the future');
    }

    return new Permission({
      ...this.props,
      expiresAt,
      updatedAt: new Date(),
    });
  }

  // Query methods
  isActive(): boolean {
    return !this.isExpired();
  }

  isExpired(): boolean {
    return this.props.expiresAt !== undefined && this.props.expiresAt <= new Date();
  }

  isOwner(): boolean {
    return this.props.role === 'owner';
  }

  isAdmin(): boolean {
    return this.props.role === 'admin' || this.props.role === 'owner';
  }

  isMember(): boolean {
    return this.props.role === 'member' || this.isAdmin();
  }

  canPerform(action: keyof PermissionProps['permissions']): boolean {
    if (this.isExpired()) {
      return false;
    }

    return this.props.permissions[action];
  }

  // Specific permission checks
  canCreateTasks(): boolean {
    return this.canPerform('canCreateTasks');
  }

  canEditTasks(): boolean {
    return this.canPerform('canEditTasks');
  }

  canDeleteTasks(): boolean {
    return this.canPerform('canDeleteTasks');
  }

  canAssignTasks(): boolean {
    return this.canPerform('canAssignTasks');
  }

  canManageMembers(): boolean {
    return this.canPerform('canManageMembers');
  }

  canEditProject(): boolean {
    return this.canPerform('canEditProject');
  }

  canDeleteProject(): boolean {
    return this.canPerform('canDeleteProject');
  }

  canViewTasks(): boolean {
    return this.canPerform('canViewTasks');
  }

  hasHigherOrEqualRole(otherRole: PermissionProps['role']): boolean {
    const roleHierarchy: Record<PermissionProps['role'], number> = {
      viewer: 1,
      member: 2,
      admin: 3,
      owner: 4,
    };

    return roleHierarchy[this.props.role] >= roleHierarchy[otherRole];
  }

  belongsToUser(userId: string): boolean {
    return this.props.userId === userId;
  }

  belongsToProject(projectId: string): boolean {
    return this.props.projectId === projectId;
  }

  // Equality and serialization
  equals(other: Permission): boolean {
    return this.props.id === other.props.id;
  }

  toJSON(): PermissionProps {
    return { ...this.props };
  }
}