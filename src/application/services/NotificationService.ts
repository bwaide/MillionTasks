import { User } from '@domain/entities/User.js';
import { Task } from '@domain/entities/Task.js';
import { Project } from '@domain/entities/Project.js';

export interface NotificationMessage {
  id: string;
  recipient: User;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  TASK_COMPLETED = 'task_completed',
  TASK_UPDATED = 'task_updated',
  PROJECT_INVITATION = 'project_invitation',
  PROJECT_UPDATED = 'project_updated',
  DAILY_SUMMARY = 'daily_summary',
  WEEKLY_SUMMARY = 'weekly_summary',
  REMINDER = 'reminder',
  SYSTEM_ALERT = 'system_alert',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  defaultChannels: NotificationChannel[];
}

export interface NotificationPreferences {
  enabled: boolean;
  channels: NotificationChannel[];
  quietHours?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  types: Partial<Record<NotificationType, boolean>>;
}

export interface INotificationProvider {
  send(message: NotificationMessage): Promise<void>;
  supports(channel: NotificationChannel): boolean;
}

export class NotificationService {
  private readonly providers: Map<NotificationChannel, INotificationProvider> = new Map();
  private readonly templates: Map<NotificationType, NotificationTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  registerProvider(channel: NotificationChannel, provider: INotificationProvider): void {
    this.providers.set(channel, provider);
  }

  async sendTaskAssignedNotification(task: Task, assignee: User, assigner: User): Promise<void> {
    const notification = this.createNotification({
      recipient: assignee,
      type: NotificationType.TASK_ASSIGNED,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        assignerName: assigner.displayName,
        projectId: task.projectId,
      },
    });

    await this.send(notification);
  }

  async sendTaskDueSoonNotification(task: Task, assignee: User): Promise<void> {
    if (!task.dueDate) return;

    const hoursUntilDue = this.getHoursUntilDate(task.dueDate);
    
    const notification = this.createNotification({
      recipient: assignee,
      type: NotificationType.TASK_DUE_SOON,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate.toISOString(),
        hoursUntilDue,
        projectId: task.projectId,
      },
    });

    await this.send(notification);
  }

  async sendTaskOverdueNotification(task: Task, assignee: User): Promise<void> {
    if (!task.dueDate || !task.isOverdue()) return;

    const hoursOverdue = this.getHoursSinceDate(task.dueDate);
    
    const notification = this.createNotification({
      recipient: assignee,
      type: NotificationType.TASK_OVERDUE,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        dueDate: task.dueDate.toISOString(),
        hoursOverdue,
        projectId: task.projectId,
      },
    });

    await this.send(notification);
  }

  async sendTaskCompletedNotification(task: Task, completedBy: User, notifyUser: User): Promise<void> {
    const notification = this.createNotification({
      recipient: notifyUser,
      type: NotificationType.TASK_COMPLETED,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        completedByName: completedBy.displayName,
        projectId: task.projectId,
      },
    });

    await this.send(notification);
  }

  async sendProjectInvitationNotification(
    project: Project,
    invitee: User,
    inviter: User,
    role: string
  ): Promise<void> {
    const notification = this.createNotification({
      recipient: invitee,
      type: NotificationType.PROJECT_INVITATION,
      data: {
        projectId: project.id,
        projectName: project.name,
        inviterName: inviter.displayName,
        role,
      },
    });

    await this.send(notification);
  }

  async sendDailySummary(user: User, summary: DailySummaryData): Promise<void> {
    const notification = this.createNotification({
      recipient: user,
      type: NotificationType.DAILY_SUMMARY,
      data: summary,
      priority: NotificationPriority.LOW,
    });

    await this.send(notification);
  }

  async sendReminder(user: User, task: Task, reminderMessage: string): Promise<void> {
    const notification = this.createNotification({
      recipient: user,
      type: NotificationType.REMINDER,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        reminderMessage,
        projectId: task.projectId,
      },
    });

    await this.send(notification);
  }

  async scheduleNotification(
    notification: NotificationMessage,
    scheduledAt: Date
  ): Promise<void> {
    notification.scheduledAt = scheduledAt;
    // In a real implementation, this would queue the notification for later delivery
    console.log(`Notification scheduled for ${scheduledAt.toISOString()}`);
  }

  private async send(notification: NotificationMessage): Promise<void> {
    // Check if notifications are enabled for the user
    if (!this.shouldSendNotification(notification)) {
      return;
    }

    // Apply user preferences to channels
    const allowedChannels = this.filterChannelsByPreferences(
      notification.channels,
      notification.recipient
    );

    // Send to each allowed channel
    const sendPromises = allowedChannels.map(channel => 
      this.sendToChannel(notification, channel)
    );

    await Promise.allSettled(sendPromises);
  }

  private async sendToChannel(
    notification: NotificationMessage,
    channel: NotificationChannel
  ): Promise<void> {
    const provider = this.providers.get(channel);
    
    if (!provider) {
      console.warn(`No provider registered for channel: ${channel}`);
      return;
    }

    try {
      await provider.send(notification);
    } catch (error) {
      console.error(`Failed to send notification via ${channel}:`, error);
    }
  }

  private createNotification(params: {
    recipient: User;
    type: NotificationType;
    data?: Record<string, any>;
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
    expiresAt?: Date;
  }): NotificationMessage {
    const template = this.templates.get(params.type);
    
    if (!template) {
      throw new Error(`No template found for notification type: ${params.type}`);
    }

    const content = this.renderTemplate(template.content, params.data || {});
    const title = this.renderTemplate(template.title, params.data || {});

    return {
      id: crypto.randomUUID(),
      recipient: params.recipient,
      type: params.type,
      title,
      content,
      data: params.data,
      priority: params.priority || template.priority,
      channels: params.channels || template.defaultChannels,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    };
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private shouldSendNotification(notification: NotificationMessage): boolean {
    const user = notification.recipient;
    
    // Check if notifications are enabled globally
    if (!user.preferences.notifications.enabled) {
      return false;
    }

    // Check if this notification type is enabled
    const typeEnabled = user.preferences.notifications[this.getNotificationTypeKey(notification.type)];
    if (typeEnabled === false) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours(user)) {
      // Only send urgent notifications during quiet hours
      return notification.priority === NotificationPriority.URGENT;
    }

    return true;
  }

  private filterChannelsByPreferences(
    channels: NotificationChannel[],
    user: User
  ): NotificationChannel[] {
    // In a real implementation, this would check user's channel preferences
    return channels;
  }

  private getNotificationTypeKey(type: NotificationType): keyof User['preferences']['notifications'] {
    switch (type) {
      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_DUE_SOON:
      case NotificationType.TASK_OVERDUE:
      case NotificationType.TASK_COMPLETED:
      case NotificationType.TASK_UPDATED:
      case NotificationType.REMINDER:
        return 'taskReminders';
      case NotificationType.PROJECT_INVITATION:
      case NotificationType.PROJECT_UPDATED:
      case NotificationType.DAILY_SUMMARY:
      case NotificationType.WEEKLY_SUMMARY:
        return 'projectUpdates';
      default:
        return 'taskReminders';
    }
  }

  private isInQuietHours(user: User): boolean {
    // In a real implementation, this would check against user's quiet hours preference
    return false;
  }

  private getHoursUntilDate(date: Date): number {
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60));
  }

  private getHoursSinceDate(date: Date): number {
    return Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60));
  }

  private initializeTemplates(): void {
    this.templates.set(NotificationType.TASK_ASSIGNED, {
      type: NotificationType.TASK_ASSIGNED,
      title: 'New task assigned',
      content: '{{assignerName}} assigned you the task "{{taskTitle}}"',
      priority: NotificationPriority.MEDIUM,
      defaultChannels: [NotificationChannel.TELEGRAM, NotificationChannel.IN_APP],
    });

    this.templates.set(NotificationType.TASK_DUE_SOON, {
      type: NotificationType.TASK_DUE_SOON,
      title: 'Task due soon',
      content: 'Task "{{taskTitle}}" is due in {{hoursUntilDue}} hours',
      priority: NotificationPriority.HIGH,
      defaultChannels: [NotificationChannel.TELEGRAM, NotificationChannel.PUSH],
    });

    this.templates.set(NotificationType.TASK_OVERDUE, {
      type: NotificationType.TASK_OVERDUE,
      title: 'Task overdue',
      content: 'Task "{{taskTitle}}" is {{hoursOverdue}} hours overdue',
      priority: NotificationPriority.URGENT,
      defaultChannels: [NotificationChannel.TELEGRAM, NotificationChannel.PUSH],
    });

    this.templates.set(NotificationType.TASK_COMPLETED, {
      type: NotificationType.TASK_COMPLETED,
      title: 'Task completed',
      content: '{{completedByName}} completed the task "{{taskTitle}}"',
      priority: NotificationPriority.LOW,
      defaultChannels: [NotificationChannel.IN_APP],
    });

    this.templates.set(NotificationType.PROJECT_INVITATION, {
      type: NotificationType.PROJECT_INVITATION,
      title: 'Project invitation',
      content: '{{inviterName}} invited you to join project "{{projectName}}" as {{role}}',
      priority: NotificationPriority.MEDIUM,
      defaultChannels: [NotificationChannel.TELEGRAM, NotificationChannel.EMAIL],
    });

    this.templates.set(NotificationType.DAILY_SUMMARY, {
      type: NotificationType.DAILY_SUMMARY,
      title: 'Daily task summary',
      content: 'You have {{activeTasks}} active tasks, {{completedToday}} completed today',
      priority: NotificationPriority.LOW,
      defaultChannels: [NotificationChannel.TELEGRAM],
    });

    this.templates.set(NotificationType.REMINDER, {
      type: NotificationType.REMINDER,
      title: 'Task reminder',
      content: 'Reminder: {{reminderMessage}} for task "{{taskTitle}}"',
      priority: NotificationPriority.MEDIUM,
      defaultChannels: [NotificationChannel.TELEGRAM, NotificationChannel.PUSH],
    });
  }
}

export interface DailySummaryData {
  activeTasks: number;
  completedToday: number;
  overdueTasks: number;
  dueSoon: number;
  projects: number;
}