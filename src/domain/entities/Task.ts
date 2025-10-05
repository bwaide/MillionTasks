import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  createdById: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  dueDate: z.date().optional(),
  estimatedHours: z.number().positive().optional(),
  actualHours: z.number().nonnegative().default(0),
  metadata: z.object({
    source: z.enum(['telegram', 'api', 'web']).default('telegram'),
    originalMessage: z.string().optional(),
    aiProcessed: z.boolean().default(false),
  }).default(() => ({ source: 'telegram' as const, aiProcessed: false })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TaskProps = z.infer<typeof TaskSchema>;

export class Task {
  private constructor(private readonly props: TaskProps) {
    this.validate();
  }

  static create(props: Omit<TaskProps, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const now = new Date();
    // Parse through Zod to apply defaults
    const parsedProps = TaskSchema.parse({
      ...props,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
    return new Task(parsedProps);
  }

  static fromProps(props: TaskProps): Task {
    return new Task(props);
  }

  private validate(): void {
    const result = TaskSchema.safeParse(this.props);
    if (!result.success) {
      throw new Error(`Invalid Task: ${result.error.message}`);
    }

    if (this.props.title.trim().length === 0) {
      throw new Error('Task title cannot be empty');
    }

    if (this.props.dueDate && this.props.dueDate < this.props.createdAt) {
      throw new Error('Due date cannot be before creation date');
    }
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get projectId(): string {
    return this.props.projectId;
  }

  get assigneeId(): string | undefined {
    return this.props.assigneeId;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get status(): TaskProps['status'] {
    return this.props.status;
  }

  get priority(): TaskProps['priority'] {
    return this.props.priority;
  }

  get tags(): string[] {
    return [...this.props.tags];
  }

  get dueDate(): Date | undefined {
    return this.props.dueDate;
  }

  get estimatedHours(): number | undefined {
    return this.props.estimatedHours;
  }

  get actualHours(): number {
    return this.props.actualHours;
  }

  get metadata(): TaskProps['metadata'] {
    return this.props.metadata;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Business logic methods
  updateDetails(updates: Partial<Pick<TaskProps, 'title' | 'description'>>): Task {
    if (updates.title !== undefined && updates.title.trim().length === 0) {
      throw new Error('Task title cannot be empty');
    }

    return new Task({
      ...this.props,
      ...updates,
      updatedAt: new Date(),
    });
  }

  updateStatus(status: TaskProps['status']): Task {
    if (this.props.status === status) {
      return this;
    }

    // Business rules for status transitions
    this.validateStatusTransition(this.props.status, status);

    return new Task({
      ...this.props,
      status,
      updatedAt: new Date(),
    });
  }

  private validateStatusTransition(currentStatus: TaskProps['status'], newStatus: TaskProps['status']): void {
    const validTransitions: Record<TaskProps['status'], TaskProps['status'][]> = {
      todo: ['in_progress', 'cancelled'],
      in_progress: ['in_review', 'done', 'todo', 'cancelled'],
      in_review: ['done', 'in_progress', 'cancelled'],
      done: ['in_review'], // Allow reopening for review
      cancelled: ['todo'], // Allow reactivation
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  updatePriority(priority: TaskProps['priority']): Task {
    return new Task({
      ...this.props,
      priority,
      updatedAt: new Date(),
    });
  }

  assign(assigneeId: string): Task {
    return new Task({
      ...this.props,
      assigneeId,
      updatedAt: new Date(),
    });
  }

  unassign(): Task {
    return new Task({
      ...this.props,
      assigneeId: undefined,
      updatedAt: new Date(),
    });
  }

  updateDueDate(dueDate: Date | undefined): Task {
    if (dueDate && dueDate < this.props.createdAt) {
      throw new Error('Due date cannot be before creation date');
    }

    return new Task({
      ...this.props,
      dueDate,
      updatedAt: new Date(),
    });
  }

  addTag(tag: string): Task {
    if (this.props.tags.includes(tag)) {
      return this;
    }

    return new Task({
      ...this.props,
      tags: [...this.props.tags, tag],
      updatedAt: new Date(),
    });
  }

  removeTag(tag: string): Task {
    if (!this.props.tags.includes(tag)) {
      return this;
    }

    return new Task({
      ...this.props,
      tags: this.props.tags.filter(t => t !== tag),
      updatedAt: new Date(),
    });
  }

  updateEstimate(estimatedHours: number | undefined): Task {
    if (estimatedHours !== undefined && estimatedHours <= 0) {
      throw new Error('Estimated hours must be positive');
    }

    return new Task({
      ...this.props,
      estimatedHours,
      updatedAt: new Date(),
    });
  }

  logTime(hours: number): Task {
    if (hours < 0) {
      throw new Error('Hours cannot be negative');
    }

    return new Task({
      ...this.props,
      actualHours: this.props.actualHours + hours,
      updatedAt: new Date(),
    });
  }

  // Query methods
  isAssignedTo(userId: string): boolean {
    return this.props.assigneeId === userId;
  }

  isCreatedBy(userId: string): boolean {
    return this.props.createdById === userId;
  }

  isOverdue(): boolean {
    return this.props.dueDate !== undefined && 
           this.props.dueDate < new Date() && 
           !this.isCompleted();
  }

  isCompleted(): boolean {
    return this.props.status === 'done';
  }

  isCancelled(): boolean {
    return this.props.status === 'cancelled';
  }

  isInProgress(): boolean {
    return this.props.status === 'in_progress';
  }

  hasTag(tag: string): boolean {
    return this.props.tags.includes(tag);
  }

  isHighPriority(): boolean {
    return this.props.priority === 'high' || this.props.priority === 'urgent';
  }

  getPriorityWeight(): number {
    const weights = { low: 1, medium: 2, high: 3, urgent: 4 };
    return weights[this.props.priority];
  }

  // Equality and serialization
  equals(other: Task): boolean {
    return this.props.id === other.props.id;
  }

  toJSON(): TaskProps {
    return { ...this.props };
  }
}