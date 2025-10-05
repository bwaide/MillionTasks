import { MessageProcessor, MessageIntent, MessageContext, ProcessedMessage } from '../../../application/services/MessageProcessor.js';
import { CreateTaskUseCase } from '../../../application/use-cases/tasks/CreateTaskUseCase.js';
import { ListTasksUseCase } from '../../../application/use-cases/tasks/ListTasksUseCase.js';
import { CompleteTaskUseCase } from '../../../application/use-cases/tasks/CompleteTaskUseCase.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';
import { User } from '../../../domain/entities/User.js';
import { Project } from '../../../domain/entities/Project.js';

export interface TelegramMessage {
  messageId: number;
  chatId: number;
  from: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
  };
  text: string;
  date: Date;
  replyToMessage?: {
    messageId: number;
    text: string;
  };
}

export interface TelegramResponse {
  success: boolean;
  messageText: string;
  replyMarkup?: {
    inlineKeyboard?: Array<Array<{
      text: string;
      callbackData: string;
    }>>;
    keyboard?: Array<Array<{
      text: string;
    }>>;
    resizeKeyboard?: boolean;
    oneTimeKeyboard?: boolean;
  };
  parseMode?: 'HTML' | 'Markdown';
}

export class TelegramMessageHandler {
  constructor(
    private readonly messageProcessor: MessageProcessor,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly userRepository: IUserRepository,
    private readonly projectRepository: IProjectRepository
  ) {}

  async handleMessage(message: TelegramMessage): Promise<TelegramResponse> {
    try {
      console.log(`Processing message from user ${message.from.id}: "${message.text}"`);

      // Get or create user
      const user = await this.getOrCreateUser(message.from);
      if (!user) {
        return this.createErrorResponse('Failed to process user information');
      }

      // Get user's default project
      const project = await this.getUserDefaultProject(user.id);
      if (!project) {
        return this.createWelcomeResponse(user);
      }

      // Build message context
      const context: MessageContext = {
        userId: user.id,
        projectId: project.id,
        userPreferences: {
          timezone: user.preferences.timezone,
          language: user.preferences.language,
        },
      };

      // Process the message
      const processedMessage = await this.messageProcessor.processUserMessage(message.text, context);

      // Handle based on intent
      return await this.handleIntent(processedMessage, context, message);
    } catch (error) {
      console.error('Error handling Telegram message:', error);
      return this.createErrorResponse('Sorry, I encountered an error processing your message. Please try again.');
    }
  }

  private async handleIntent(
    processedMessage: ProcessedMessage,
    context: MessageContext,
    originalMessage: TelegramMessage
  ): Promise<TelegramResponse> {
    const { intent, extractedData, confidence } = processedMessage;

    // Check if confidence is too low for destructive actions
    if (this.messageProcessor.requiresHighConfidence(intent) && confidence < 0.7) {
      return this.createConfirmationResponse(processedMessage, context);
    }

    switch (intent) {
      case MessageIntent.CREATE_TASK:
        return await this.handleCreateTask(extractedData, context, originalMessage.text);

      case MessageIntent.LIST_TASKS:
        return await this.handleListTasks(context);

      case MessageIntent.COMPLETE_TASK:
        return await this.handleCompleteTask(extractedData, context);

      case MessageIntent.HELP:
        return this.createHelpResponse();

      case MessageIntent.QUERY_STATUS:
        return await this.handleStatusQuery(context);

      case MessageIntent.UPDATE_TASK:
      case MessageIntent.ASSIGN_TASK:
      case MessageIntent.SET_PRIORITY:
      case MessageIntent.SET_DUE_DATE:
      case MessageIntent.ADD_TAG:
      case MessageIntent.REMOVE_TAG:
        return this.createNotImplementedResponse(intent);

      case MessageIntent.DELETE_TASK:
        return this.createNotImplementedResponse(intent);

      case MessageIntent.UNKNOWN:
      default:
        return this.createUnknownIntentResponse(originalMessage.text);
    }
  }

  private async handleCreateTask(
    extractedData: any,
    context: MessageContext,
    originalMessage: string
  ): Promise<TelegramResponse> {
    try {
      const result = await this.createTaskUseCase.createTaskFromMessage(
        originalMessage,
        context.userId,
        context.projectId!,
        extractedData
      );

      if (result.success) {
        const task = result.task;
        const messageText = `✅ Task created successfully!\n\n` +
          `📋 **${task.title}**\n` +
          `🔗 ID: \`${task.id.slice(0, 8)}\`\n` +
          `📊 Priority: ${this.getPriorityIcon(task.priority)} ${task.priority}\n` +
          `📅 Status: ${this.getStatusIcon(task.status)} ${task.status}\n` +
          (task.dueDate ? `⏰ Due: ${task.dueDate.toLocaleDateString()}\n` : '') +
          (task.tags.length > 0 ? `🏷️ Tags: ${task.tags.join(', ')}\n` : '');

        return {
          success: true,
          messageText,
          parseMode: 'Markdown',
          replyMarkup: {
            inlineKeyboard: [
              [
                { text: '✅ Mark Complete', callbackData: `complete:${task.id}` },
                { text: '📝 Edit Task', callbackData: `edit:${task.id}` }
              ],
              [
                { text: '📋 List My Tasks', callbackData: 'list:my' }
              ]
            ]
          }
        };
      } else {
        return {
          success: false,
          messageText: `❌ Failed to create task:\n${result.errors?.join('\n') || 'Unknown error'}`,
        };
      }
    } catch (error) {
      console.error('Error creating task:', error);
      return this.createErrorResponse('Failed to create task');
    }
  }

  private async handleListTasks(context: MessageContext): Promise<TelegramResponse> {
    try {
      const tasks = await this.listTasksUseCase.getMyTasks(context.userId, {
        includeAssigned: true,
        includeCreated: true,
        limit: 10,
      });

      if (tasks.length === 0) {
        return {
          success: true,
          messageText: '📋 You have no active tasks.\n\nSend me a message to create a new task!',
          replyMarkup: {
            inlineKeyboard: [
              [{ text: '➕ Create Task', callbackData: 'create:new' }]
            ]
          }
        };
      }

      let messageText = `📋 **Your Active Tasks (${tasks.length})**\n\n`;

      for (const task of tasks.slice(0, 5)) { // Show only first 5 in message
        messageText += `${this.getStatusIcon(task.status)} **${task.title}**\n`;
        messageText += `   🔗 \`${task.id.slice(0, 8)}\` | ${this.getPriorityIcon(task.priority)} ${task.priority}`;
        
        if (task.dueDate) {
          const isOverdue = task.isOverdue();
          const dueDateStr = task.dueDate.toLocaleDateString();
          messageText += ` | ${isOverdue ? '🚨' : '📅'} ${dueDateStr}`;
        }
        
        messageText += '\n\n';
      }

      if (tasks.length > 5) {
        messageText += `... and ${tasks.length - 5} more tasks\n\n`;
      }

      const summary = await this.listTasksUseCase.getTaskSummary(context.userId, context.projectId);
      messageText += `📊 **Summary**: ${summary.total} total, ${summary.overdue} overdue`;

      return {
        success: true,
        messageText,
        parseMode: 'Markdown',
        replyMarkup: {
          inlineKeyboard: [
            [
              { text: '✅ Complete Task', callbackData: 'complete:select' },
              { text: '📝 Edit Task', callbackData: 'edit:select' }
            ],
            [
              { text: '🔄 Refresh', callbackData: 'list:refresh' },
              { text: '➕ New Task', callbackData: 'create:new' }
            ]
          ]
        }
      };
    } catch (error) {
      console.error('Error listing tasks:', error);
      return this.createErrorResponse('Failed to list tasks');
    }
  }

  private async handleCompleteTask(
    extractedData: any,
    context: MessageContext
  ): Promise<TelegramResponse> {
    try {
      // For now, we'll need to implement task selection logic
      // This is a simplified version that would need enhancement
      return {
        success: true,
        messageText: '🔍 To complete a task, please use one of the following methods:\n\n' +
          '1️⃣ Use the "List My Tasks" button and select a task\n' +
          '2️⃣ Reply to a task message\n' +
          '3️⃣ Use the task ID: `/complete [task-id]`',
        replyMarkup: {
          inlineKeyboard: [
            [{ text: '📋 List My Tasks', callbackData: 'list:my' }]
          ]
        }
      };
    } catch (error) {
      console.error('Error completing task:', error);
      return this.createErrorResponse('Failed to complete task');
    }
  }

  private async handleStatusQuery(context: MessageContext): Promise<TelegramResponse> {
    try {
      const summary = await this.listTasksUseCase.getTaskSummary(context.userId, context.projectId);
      
      let messageText = '📊 **Your Task Summary**\n\n';
      messageText += `📋 Total Tasks: ${summary.total}\n`;
      messageText += `✅ Completed: ${summary.byStatus.done || 0}\n`;
      messageText += `🔄 In Progress: ${summary.byStatus.in_progress || 0}\n`;
      messageText += `📝 To Do: ${summary.byStatus.todo || 0}\n`;
      messageText += `👀 In Review: ${summary.byStatus.in_review || 0}\n`;
      
      if (summary.overdue > 0) {
        messageText += `\n🚨 **${summary.overdue} tasks are overdue!**\n`;
      }
      
      if (summary.dueSoon > 0) {
        messageText += `⏰ ${summary.dueSoon} tasks due soon\n`;
      }

      messageText += '\n**Priority Breakdown:**\n';
      messageText += `🚨 Urgent: ${summary.byPriority.urgent || 0}\n`;
      messageText += `🔺 High: ${summary.byPriority.high || 0}\n`;
      messageText += `➖ Medium: ${summary.byPriority.medium || 0}\n`;
      messageText += `🔽 Low: ${summary.byPriority.low || 0}\n`;

      return {
        success: true,
        messageText,
        parseMode: 'Markdown',
        replyMarkup: {
          inlineKeyboard: [
            [
              { text: '📋 View Tasks', callbackData: 'list:my' },
              { text: '➕ New Task', callbackData: 'create:new' }
            ]
          ]
        }
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return this.createErrorResponse('Failed to get task status');
    }
  }

  private async getOrCreateUser(from: TelegramMessage['from']): Promise<User | null> {
    try {
      // Try to find existing user
      let user = await this.userRepository.findByTelegramId(from.id.toString());
      
      if (!user) {
        // Create new user
        const userData = {
          telegramId: from.id.toString(),
          firstName: from.firstName,
          lastName: from.lastName,
          username: from.username,
          isActive: true,
          preferences: {
            timezone: 'UTC',
            language: 'en',
            notifications: {
              enabled: true,
              taskReminders: true,
              projectUpdates: true,
            },
          },
        };

        user = User.create(userData);
        await this.userRepository.save(user);
        
        console.log(`Created new user: ${user.id} (${user.displayName})`);
      }

      return user;
    } catch (error) {
      console.error('Error getting or creating user:', error);
      return null;
    }
  }

  private async getUserDefaultProject(userId: string): Promise<Project | null> {
    try {
      const projects = await this.projectRepository.findByOwnerId(userId);
      
      if (projects.length === 0) {
        // Create default project for new user
        const project = Project.create({
          name: 'My Tasks',
          description: 'Default project for personal tasks',
          ownerId: userId,
          isActive: true,
          settings: {
            isPublic: false,
            allowTaskCreation: true,
            requireApproval: false,
            defaultPriority: 'medium',
          },
        });

        await this.projectRepository.save(project);
        console.log(`Created default project for user ${userId}`);
        return project;
      }

      return projects[0]; // Return first project as default
    } catch (error) {
      console.error('Error getting user default project:', error);
      return null;
    }
  }

  private createWelcomeResponse(user: User): TelegramResponse {
    return {
      success: true,
      messageText: `👋 Welcome to MillionTasks, ${user.firstName}!\n\n` +
        'I\'m your personal task management assistant. Here\'s what I can help you with:\n\n' +
        '📝 **Create tasks** - Just send me a message describing what you need to do\n' +
        '📋 **List tasks** - Ask me to show your tasks\n' +
        '✅ **Complete tasks** - Mark tasks as done\n' +
        '📊 **Task status** - Get summaries and updates\n\n' +
        'Try sending me something like:\n' +
        '• "Create a task to review the quarterly report"\n' +
        '• "Show my tasks"\n' +
        '• "What\'s my status?"',
      replyMarkup: {
        inlineKeyboard: [
          [
            { text: '➕ Create First Task', callbackData: 'create:new' },
            { text: '❓ Help', callbackData: 'help' }
          ]
        ]
      }
    };
  }

  private createHelpResponse(): TelegramResponse {
    return {
      success: true,
      messageText: '📚 **MillionTasks Help**\n\n' +
        '**Creating Tasks:**\n' +
        '• Just describe what you need to do\n' +
        '• Add priority: "urgent task" or "low priority task"\n' +
        '• Set due dates: "due tomorrow" or "due Friday"\n' +
        '• Add tags: "review #document #urgent"\n\n' +
        '**Managing Tasks:**\n' +
        '• "show my tasks" - List active tasks\n' +
        '• "complete [task]" - Mark task done\n' +
        '• "what\'s my status?" - Get summary\n\n' +
        '**Commands:**\n' +
        '• /help - Show this help\n' +
        '• /list - List your tasks\n' +
        '• /status - Get task summary\n\n' +
        'Just talk to me naturally - I understand most requests!',
      parseMode: 'Markdown',
      replyMarkup: {
        inlineKeyboard: [
          [
            { text: '📋 My Tasks', callbackData: 'list:my' },
            { text: '➕ New Task', callbackData: 'create:new' }
          ]
        ]
      }
    };
  }

  private createUnknownIntentResponse(originalMessage: string): TelegramResponse {
    return {
      success: true,
      messageText: '🤔 I\'m not sure what you want me to do with that message.\n\n' +
        'Here are some things you can try:\n' +
        '• Describe a task you want to create\n' +
        '• Ask me to "show my tasks"\n' +
        '• Use /help for more information\n\n' +
        'Or I can create a task with your message as the title?',
      replyMarkup: {
        inlineKeyboard: [
          [
            { text: `✅ Create Task: "${originalMessage.slice(0, 30)}..."`, 
              callbackData: `create:${Buffer.from(originalMessage).toString('base64')}` },
          ],
          [
            { text: '❓ Help', callbackData: 'help' },
            { text: '📋 My Tasks', callbackData: 'list:my' }
          ]
        ]
      }
    };
  }

  private createConfirmationResponse(
    processedMessage: ProcessedMessage,
    context: MessageContext
  ): TelegramResponse {
    const { intent, extractedData } = processedMessage;
    
    return {
      success: true,
      messageText: `🤔 I think you want to ${intent.replace('_', ' ')} but I'm not completely sure.\n\n` +
        `Did you mean: "${extractedData.title}"?\n\n` +
        'Please confirm or clarify your request.',
      replyMarkup: {
        inlineKeyboard: [
          [
            { text: '✅ Yes, that\'s right', callbackData: `confirm:${intent}:yes` },
            { text: '❌ No, that\'s wrong', callbackData: `confirm:${intent}:no` }
          ]
        ]
      }
    };
  }

  private createNotImplementedResponse(intent: MessageIntent): TelegramResponse {
    return {
      success: true,
      messageText: `🚧 The feature "${intent.replace('_', ' ')}" is coming soon!\n\n` +
        'For now, you can:\n' +
        '• Create new tasks\n' +
        '• List your tasks\n' +
        '• Mark tasks complete\n' +
        '• Get task summaries',
      replyMarkup: {
        inlineKeyboard: [
          [
            { text: '📋 My Tasks', callbackData: 'list:my' },
            { text: '➕ New Task', callbackData: 'create:new' }
          ]
        ]
      }
    };
  }

  private createErrorResponse(message: string): TelegramResponse {
    return {
      success: false,
      messageText: `❌ ${message}\n\nPlease try again or use /help for assistance.`,
      replyMarkup: {
        inlineKeyboard: [
          [
            { text: '🔄 Try Again', callbackData: 'retry' },
            { text: '❓ Help', callbackData: 'help' }
          ]
        ]
      }
    };
  }

  // Helper methods for formatting
  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      todo: '📋',
      in_progress: '🔄',
      in_review: '👀',
      done: '✅',
      cancelled: '❌',
    };
    return icons[status] || '❓';
  }

  private getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      low: '🔽',
      medium: '➖',
      high: '🔺',
      urgent: '🚨',
    };
    return icons[priority] || '➖';
  }
}