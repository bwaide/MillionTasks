import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  settings: z.object({
    isPublic: z.boolean().default(false),
    allowTaskCreation: z.boolean().default(true),
    requireApproval: z.boolean().default(false),
    defaultPriority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  }).default(() => ({ isPublic: false, allowTaskCreation: true, requireApproval: false, defaultPriority: 'medium' as const })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectProps = z.infer<typeof ProjectSchema>;

export class Project {
  private constructor(private readonly props: ProjectProps) {
    this.validate();
  }

  static create(props: Omit<ProjectProps, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const now = new Date();
    return new Project({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: ProjectProps): Project {
    return new Project(props);
  }

  private validate(): void {
    const result = ProjectSchema.safeParse(this.props);
    if (!result.success) {
      throw new Error(`Invalid Project: ${result.error.message}`);
    }

    if (this.props.name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get settings(): ProjectProps['settings'] {
    return this.props.settings;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateDetails(updates: Partial<Pick<ProjectProps, 'name' | 'description'>>): Project {
    if (updates.name !== undefined && updates.name.trim().length === 0) {
      throw new Error('Project name cannot be empty');
    }

    return new Project({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    });
  }

  updateSettings(settings: Partial<ProjectProps['settings']>): Project {
    return new Project({
      ...this.props,
      settings: {
        ...this.props.settings,
        ...settings,
      },
      updatedAt: new Date(),
    });
  }

  activate(): Project {
    if (this.props.isActive) {
      return this;
    }

    return new Project({
      ...this.props,
      isActive: true,
      updatedAt: new Date(),
    });
  }

  deactivate(): Project {
    if (!this.props.isActive) {
      return this;
    }

    return new Project({
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    });
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  canCreateTasks(): boolean {
    return this.props.isActive && this.props.settings.allowTaskCreation;
  }

  requiresApproval(): boolean {
    return this.props.settings.requireApproval;
  }

  isPublic(): boolean {
    return this.props.settings.isPublic;
  }

  getDefaultPriority(): ProjectProps['settings']['defaultPriority'] {
    return this.props.settings.defaultPriority;
  }

  // Equality and serialization
  equals(other: Project): boolean {
    return this.props.id === other.props.id;
  }

  toJSON(): ProjectProps {
    return { ...this.props };
  }
}