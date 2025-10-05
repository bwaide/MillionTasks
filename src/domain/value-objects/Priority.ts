export enum PriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class Priority {
  private constructor(private readonly value: PriorityEnum) {}

  static LOW = new Priority(PriorityEnum.LOW);
  static MEDIUM = new Priority(PriorityEnum.MEDIUM);
  static HIGH = new Priority(PriorityEnum.HIGH);
  static URGENT = new Priority(PriorityEnum.URGENT);

  static fromString(value: string): Priority {
    const normalizedValue = value.toLowerCase() as PriorityEnum;
    
    switch (normalizedValue) {
      case PriorityEnum.LOW:
        return Priority.LOW;
      case PriorityEnum.MEDIUM:
        return Priority.MEDIUM;
      case PriorityEnum.HIGH:
        return Priority.HIGH;
      case PriorityEnum.URGENT:
        return Priority.URGENT;
      default:
        throw new Error(`Invalid priority: ${value}`);
    }
  }

  static fromNumber(value: number): Priority {
    if (value < 1 || value > 4) {
      throw new Error(`Priority number must be between 1-4, got: ${value}`);
    }

    const priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT];
    return priorities[value - 1];
  }

  static getAllPriorities(): Priority[] {
    return [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT];
  }

  static getHighPriorities(): Priority[] {
    return [Priority.HIGH, Priority.URGENT];
  }

  static getDefault(): Priority {
    return Priority.MEDIUM;
  }

  getValue(): PriorityEnum {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  getDisplayName(): string {
    const displayNames: Record<PriorityEnum, string> = {
      [PriorityEnum.LOW]: 'Low',
      [PriorityEnum.MEDIUM]: 'Medium',
      [PriorityEnum.HIGH]: 'High',
      [PriorityEnum.URGENT]: 'Urgent',
    };

    return displayNames[this.value];
  }

  getIcon(): string {
    const icons: Record<PriorityEnum, string> = {
      [PriorityEnum.LOW]: '🔽',
      [PriorityEnum.MEDIUM]: '➖',
      [PriorityEnum.HIGH]: '🔺',
      [PriorityEnum.URGENT]: '🚨',
    };

    return icons[this.value];
  }

  getColor(): string {
    const colors: Record<PriorityEnum, string> = {
      [PriorityEnum.LOW]: '#10B981', // green
      [PriorityEnum.MEDIUM]: '#F59E0B', // yellow
      [PriorityEnum.HIGH]: '#F97316', // orange
      [PriorityEnum.URGENT]: '#EF4444', // red
    };

    return colors[this.value];
  }

  getNumericValue(): number {
    const numericValues: Record<PriorityEnum, number> = {
      [PriorityEnum.LOW]: 1,
      [PriorityEnum.MEDIUM]: 2,
      [PriorityEnum.HIGH]: 3,
      [PriorityEnum.URGENT]: 4,
    };

    return numericValues[this.value];
  }

  getWeight(): number {
    // Weight for prioritization algorithms
    const weights: Record<PriorityEnum, number> = {
      [PriorityEnum.LOW]: 1,
      [PriorityEnum.MEDIUM]: 2,
      [PriorityEnum.HIGH]: 4,
      [PriorityEnum.URGENT]: 8,
    };

    return weights[this.value];
  }

  // Business logic methods
  isLow(): boolean {
    return this.equals(Priority.LOW);
  }

  isMedium(): boolean {
    return this.equals(Priority.MEDIUM);
  }

  isHigh(): boolean {
    return this.equals(Priority.HIGH);
  }

  isUrgent(): boolean {
    return this.equals(Priority.URGENT);
  }

  isHighPriority(): boolean {
    return this.isHigh() || this.isUrgent();
  }

  requiresImmediateAttention(): boolean {
    return this.isUrgent();
  }

  shouldNotifyImmediately(): boolean {
    return this.isUrgent();
  }

  getEscalationTimeHours(): number {
    // Time in hours before a task should be escalated if not addressed
    const escalationTimes: Record<PriorityEnum, number> = {
      [PriorityEnum.LOW]: 168, // 7 days
      [PriorityEnum.MEDIUM]: 72, // 3 days
      [PriorityEnum.HIGH]: 24, // 1 day
      [PriorityEnum.URGENT]: 4, // 4 hours
    };

    return escalationTimes[this.value];
  }

  getResponseTimeHours(): number {
    // Expected response time in hours
    const responseTimes: Record<PriorityEnum, number> = {
      [PriorityEnum.LOW]: 48, // 2 days
      [PriorityEnum.MEDIUM]: 24, // 1 day
      [PriorityEnum.HIGH]: 8, // 8 hours
      [PriorityEnum.URGENT]: 1, // 1 hour
    };

    return responseTimes[this.value];
  }

  // Comparison methods
  equals(other: Priority): boolean {
    return this.value === other.value;
  }

  isHigherThan(other: Priority): boolean {
    return this.getNumericValue() > other.getNumericValue();
  }

  isLowerThan(other: Priority): boolean {
    return this.getNumericValue() < other.getNumericValue();
  }

  isHigherOrEqualTo(other: Priority): boolean {
    return this.getNumericValue() >= other.getNumericValue();
  }

  isLowerOrEqualTo(other: Priority): boolean {
    return this.getNumericValue() <= other.getNumericValue();
  }

  increase(): Priority {
    switch (this.value) {
      case PriorityEnum.LOW:
        return Priority.MEDIUM;
      case PriorityEnum.MEDIUM:
        return Priority.HIGH;
      case PriorityEnum.HIGH:
        return Priority.URGENT;
      case PriorityEnum.URGENT:
        return Priority.URGENT; // Already at max
      default:
        throw new Error(`Unknown priority: ${this.value}`);
    }
  }

  decrease(): Priority {
    switch (this.value) {
      case PriorityEnum.LOW:
        return Priority.LOW; // Already at min
      case PriorityEnum.MEDIUM:
        return Priority.LOW;
      case PriorityEnum.HIGH:
        return Priority.MEDIUM;
      case PriorityEnum.URGENT:
        return Priority.HIGH;
      default:
        throw new Error(`Unknown priority: ${this.value}`);
    }
  }

  // Static comparison methods for sorting
  static compare(a: Priority, b: Priority): number {
    return b.getNumericValue() - a.getNumericValue(); // Higher priority first
  }

  static sort(priorities: Priority[]): Priority[] {
    return [...priorities].sort(Priority.compare);
  }

  // Serialization
  toJSON(): string {
    return this.value;
  }
}