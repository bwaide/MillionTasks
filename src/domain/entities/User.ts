import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  telegramId: z.string().optional(),
  username: z.string().min(1).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().default(true),
  preferences: z.object({
    timezone: z.string().default('UTC'),
    language: z.string().default('en'),
    notifications: z.object({
      enabled: z.boolean().default(true),
      taskReminders: z.boolean().default(true),
      projectUpdates: z.boolean().default(true),
    }).default(() => ({ enabled: true, taskReminders: true, projectUpdates: true })),
  }).default(() => ({ timezone: 'UTC', language: 'en', notifications: { enabled: true, taskReminders: true, projectUpdates: true } })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserProps = z.infer<typeof UserSchema>;

export class User {
  private constructor(private readonly props: UserProps) {
    this.validate();
  }

  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User {
    const now = new Date();
    return new User({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromProps(props: UserProps): User {
    return new User(props);
  }

  private validate(): void {
    const result = UserSchema.safeParse(this.props);
    if (!result.success) {
      throw new Error(`Invalid User: ${result.error.message}`);
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get telegramId(): string | undefined {
    return this.props.telegramId;
  }

  get username(): string | undefined {
    return this.props.username;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string | undefined {
    return this.props.lastName;
  }

  get email(): string | undefined {
    return this.props.email;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get preferences(): UserProps['preferences'] {
    return this.props.preferences;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get fullName(): string {
    return this.props.lastName 
      ? `${this.props.firstName} ${this.props.lastName}`
      : this.props.firstName;
  }

  get displayName(): string {
    return this.props.username || this.fullName;
  }

  // Business logic methods
  updateProfile(updates: Partial<Pick<UserProps, 'username' | 'firstName' | 'lastName' | 'email'>>): User {
    return new User({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    });
  }

  updatePreferences(preferences: Partial<UserProps['preferences']>): User {
    return new User({
      ...this.props,
      preferences: {
        ...this.props.preferences,
        ...preferences,
      },
      updatedAt: new Date(),
    });
  }

  activate(): User {
    if (this.props.isActive) {
      return this;
    }

    return new User({
      ...this.props,
      isActive: true,
      updatedAt: new Date(),
    });
  }

  deactivate(): User {
    if (!this.props.isActive) {
      return this;
    }

    return new User({
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    });
  }

  isNotificationEnabled(type: keyof UserProps['preferences']['notifications']): boolean {
    return this.props.preferences.notifications.enabled && 
           this.props.preferences.notifications[type];
  }

  // Equality and serialization
  equals(other: User): boolean {
    return this.props.id === other.props.id;
  }

  toJSON(): UserProps {
    return { ...this.props };
  }
}