export enum TaskStatusEnum {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export class TaskStatus {
  private constructor(private readonly value: TaskStatusEnum) {}

  static TODO = new TaskStatus(TaskStatusEnum.TODO);
  static IN_PROGRESS = new TaskStatus(TaskStatusEnum.IN_PROGRESS);
  static IN_REVIEW = new TaskStatus(TaskStatusEnum.IN_REVIEW);
  static DONE = new TaskStatus(TaskStatusEnum.DONE);
  static CANCELLED = new TaskStatus(TaskStatusEnum.CANCELLED);

  static fromString(value: string): TaskStatus {
    const normalizedValue = value.toLowerCase().replace(/[^a-z]/g, '_') as TaskStatusEnum;
    
    switch (normalizedValue) {
      case TaskStatusEnum.TODO:
        return TaskStatus.TODO;
      case TaskStatusEnum.IN_PROGRESS:
        return TaskStatus.IN_PROGRESS;
      case TaskStatusEnum.IN_REVIEW:
        return TaskStatus.IN_REVIEW;
      case TaskStatusEnum.DONE:
        return TaskStatus.DONE;
      case TaskStatusEnum.CANCELLED:
        return TaskStatus.CANCELLED;
      default:
        throw new Error(`Invalid task status: ${value}`);
    }
  }

  static getAllStatuses(): TaskStatus[] {
    return [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ];
  }

  static getActiveStatuses(): TaskStatus[] {
    return [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
    ];
  }

  static getCompletedStatuses(): TaskStatus[] {
    return [
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ];
  }

  getValue(): TaskStatusEnum {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  getDisplayName(): string {
    const displayNames: Record<TaskStatusEnum, string> = {
      [TaskStatusEnum.TODO]: 'To Do',
      [TaskStatusEnum.IN_PROGRESS]: 'In Progress',
      [TaskStatusEnum.IN_REVIEW]: 'In Review',
      [TaskStatusEnum.DONE]: 'Done',
      [TaskStatusEnum.CANCELLED]: 'Cancelled',
    };

    return displayNames[this.value];
  }

  getIcon(): string {
    const icons: Record<TaskStatusEnum, string> = {
      [TaskStatusEnum.TODO]: '📋',
      [TaskStatusEnum.IN_PROGRESS]: '🔄',
      [TaskStatusEnum.IN_REVIEW]: '👀',
      [TaskStatusEnum.DONE]: '✅',
      [TaskStatusEnum.CANCELLED]: '❌',
    };

    return icons[this.value];
  }

  getColor(): string {
    const colors: Record<TaskStatusEnum, string> = {
      [TaskStatusEnum.TODO]: '#6B7280', // gray
      [TaskStatusEnum.IN_PROGRESS]: '#3B82F6', // blue
      [TaskStatusEnum.IN_REVIEW]: '#F59E0B', // yellow
      [TaskStatusEnum.DONE]: '#10B981', // green
      [TaskStatusEnum.CANCELLED]: '#EF4444', // red
    };

    return colors[this.value];
  }

  // Business logic methods
  canTransitionTo(newStatus: TaskStatus): boolean {
    const validTransitions: Record<TaskStatusEnum, TaskStatusEnum[]> = {
      [TaskStatusEnum.TODO]: [TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.CANCELLED],
      [TaskStatusEnum.IN_PROGRESS]: [TaskStatusEnum.IN_REVIEW, TaskStatusEnum.DONE, TaskStatusEnum.TODO, TaskStatusEnum.CANCELLED],
      [TaskStatusEnum.IN_REVIEW]: [TaskStatusEnum.DONE, TaskStatusEnum.IN_PROGRESS, TaskStatusEnum.CANCELLED],
      [TaskStatusEnum.DONE]: [TaskStatusEnum.IN_REVIEW], // Allow reopening for review
      [TaskStatusEnum.CANCELLED]: [TaskStatusEnum.TODO], // Allow reactivation
    };

    return validTransitions[this.value].includes(newStatus.value);
  }

  isActive(): boolean {
    return TaskStatus.getActiveStatuses().some(status => status.equals(this));
  }

  isCompleted(): boolean {
    return TaskStatus.getCompletedStatuses().some(status => status.equals(this));
  }

  isTodo(): boolean {
    return this.equals(TaskStatus.TODO);
  }

  isInProgress(): boolean {
    return this.equals(TaskStatus.IN_PROGRESS);
  }

  isInReview(): boolean {
    return this.equals(TaskStatus.IN_REVIEW);
  }

  isDone(): boolean {
    return this.equals(TaskStatus.DONE);
  }

  isCancelled(): boolean {
    return this.equals(TaskStatus.CANCELLED);
  }

  // Query methods
  requiresAction(): boolean {
    return this.isInProgress() || this.isInReview();
  }

  allowsTimeTracking(): boolean {
    return this.isInProgress();
  }

  allowsAssignment(): boolean {
    return !this.isCompleted();
  }

  // Comparison methods
  equals(other: TaskStatus): boolean {
    return this.value === other.value;
  }

  getProgressPercentage(): number {
    const progressMap: Record<TaskStatusEnum, number> = {
      [TaskStatusEnum.TODO]: 0,
      [TaskStatusEnum.IN_PROGRESS]: 50,
      [TaskStatusEnum.IN_REVIEW]: 80,
      [TaskStatusEnum.DONE]: 100,
      [TaskStatusEnum.CANCELLED]: 0,
    };

    return progressMap[this.value];
  }

  // Serialization
  toJSON(): string {
    return this.value;
  }
}