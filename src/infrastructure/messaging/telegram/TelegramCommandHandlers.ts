import { TelegramMessageHandler, TelegramMessage, TelegramResponse } from './TelegramMessageHandler.js';
import { CreateTaskUseCase } from '../../../application/use-cases/tasks/CreateTaskUseCase.js';
import { ListTasksUseCase } from '../../../application/use-cases/tasks/ListTasksUseCase.js';
import { CompleteTaskUseCase } from '../../../application/use-cases/tasks/CompleteTaskUseCase.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js';
import { Priority } from '../../../domain/value-objects/Priority.js';

export interface CallbackQuery {
  id: string;
  from: {
    id: number;
    firstName: string;
    lastName?: string;
    username?: string;
  };
  message?: {
    messageId: number;
    chatId: number;
    text: string;
  };
  data: string;
}

export interface CallbackResponse extends TelegramResponse {
  callbackQueryId: string;
  showAlert?: boolean;
  alertText?: string;
}

export class TelegramCommandHandlers {
  constructor(
    private readonly messageHandler: TelegramMessageHandler,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly userRepository: IUserRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository
  ) {}

  async handleCommand(message: TelegramMessage): Promise<TelegramResponse> {
    const text = message.text.toLowerCase();
    const command = text.split(' ')[0];
    const args = text.split(' ').slice(1);

    console.log(`Processing command: ${command} with args: ${args.join(' ')}`);

    switch (command) {
      case '/start':
        return this.handleStartCommand(message);
      
      case '/help':
        return this.handleHelpCommand();
      
      case '/list':
      case '/tasks':
        return this.handleListCommand(message, args);
      
      case '/create':
      case '/new':
        return this.handleCreateCommand(message, args);
      
      case '/complete':
      case '/done':
        return this.handleCompleteCommand(message, args);
      
      case '/status':
        return this.handleStatusCommand(message);
      
      case '/cancel':
        return this.handleCancelCommand(message, args);
      
      case '/priority':
        return this.handlePriorityCommand(message, args);
      
      case '/assign':
        return this.handleAssignCommand(message, args);
      
      case '/search':
        return this.handleSearchCommand(message, args);
      
      case '/settings':
        return this.handleSettingsCommand(message);
      
      default:
        // If it's not a recognized command, delegate to the message handler
        return this.messageHandler.handleMessage(message);
    }
  }

  async handleCallbackQuery(query: CallbackQuery): Promise<CallbackResponse> {
    try {
      console.log(`Processing callback query: ${query.data}`);

      const [action, ...params] = query.data.split(':');

      switch (action) {
        case 'list':
          return await this.handleListCallback(query, params);
        
        case 'create':
          return await this.handleCreateCallback(query, params);
        
        case 'complete':
          return await this.handleCompleteCallback(query, params);
        
        case 'edit':
          return await this.handleEditCallback(query, params);
        
        case 'confirm':
          return await this.handleConfirmCallback(query, params);
        
        case 'help':
          return await this.handleHelpCallback(query);
        
        case 'retry':
          return await this.handleRetryCallback(query);
        
        default:
          return {
            callbackQueryId: query.id,
            success: false,
            messageText: '❌ Unknown action',
            showAlert: true,
            alertText: 'This action is not recognized.',
          };
      }
    } catch (error) {
      console.error('Error handling callback query:', error);
      return {
        callbackQueryId: query.id,
        success: false,
        messageText: '❌ An error occurred',
        showAlert: true,
        alertText: 'Sorry, something went wrong.',
      };
    }
  }

  private async handleStartCommand(message: TelegramMessage): Promise<TelegramResponse> {
    // Delegate to message handler which handles user creation and welcome
    const welcomeMessage: TelegramMessage = {
      ...message,
      text: 'start', // This will trigger the welcome flow
    };
    return this.messageHandler.handleMessage(welcomeMessage);
  }

  private async handleHelpCommand(): Promise<TelegramResponse> {
    return {
      success: true,
      messageText: '📚 **MillionTasks Commands**\n\n' +
        '**Basic Commands:**\n' +
        '• `/start` - Get started with MillionTasks\n' +
        '• `/help` - Show this help message\n' +
        '• `/list` - List your active tasks\n' +
        '• `/status` - Get task summary\n\n' +
        '**Task Management:**\n' +
        '• `/create [task description]` - Create a new task\n' +
        '• `/complete [task-id]` - Mark task as complete\n' +
        '• `/cancel [task-id]` - Cancel a task\n' +
        '• `/priority [task-id] [low|medium|high|urgent]` - Set priority\n\n' +
        '**Advanced:**\n' +
        '• `/search [query]` - Search your tasks\n' +
        '• `/assign [task-id] [@username]` - Assign task\n' +
        '• `/settings` - Manage your preferences\n\n' +
        '**Natural Language:**\n' +
        'You can also just talk to me naturally!\n' +
        'Try: "Create a task to review documents" or "Show my urgent tasks"',
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

  private async handleListCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    const user = await this.userRepository.findByTelegramId(message.from.id.toString());
    if (!user) {
      return { success: false, messageText: '❌ User not found. Please use /start first.' };
    }

    // Parse arguments for filtering
    const filter = args.join(' ').toLowerCase();
    let statusFilter: TaskStatus | undefined;
    let priorityFilter: Priority | undefined;

    if (filter.includes('completed') || filter.includes('done')) {
      statusFilter = TaskStatus.DONE;
    } else if (filter.includes('progress')) {
      statusFilter = TaskStatus.IN_PROGRESS;
    } else if (filter.includes('todo')) {
      statusFilter = TaskStatus.TODO;
    }

    if (filter.includes('urgent')) {
      priorityFilter = Priority.URGENT;
    } else if (filter.includes('high')) {
      priorityFilter = Priority.HIGH;
    } else if (filter.includes('low')) {
      priorityFilter = Priority.LOW;
    }

    try {
      const listRequest = {
        userId: user.id,
        status: statusFilter,
        priority: priorityFilter,
        limit: 10,
      };

      const result = await this.listTasksUseCase.execute(listRequest);

      if (!result.success) {
        return {
          success: false,
          messageText: `❌ Failed to list tasks: ${result.errors?.join(', ')}`
        };
      }

      if (result.tasks.length === 0) {
        return {
          success: true,
          messageText: '📋 No tasks found matching your criteria.\n\nUse /create to add a new task!',
          replyMarkup: {
            inlineKeyboard: [
              [{ text: '➕ Create Task', callbackData: 'create:new' }]
            ]
          }
        };
      }

      let messageText = `📋 **Your Tasks** (${result.tasks.length}/${result.totalCount})\n\n`;

      for (const task of result.tasks) {
        messageText += `${this.getStatusIcon(task.status)} **${task.title}**\n`;
        messageText += `   🔗 \`${task.id.slice(0, 8)}\` | ${this.getPriorityIcon(task.priority)} ${task.priority}`;
        
        if (task.dueDate) {
          const isOverdue = task.isOverdue();
          messageText += ` | ${isOverdue ? '🚨' : '📅'} ${task.dueDate.toLocaleDateString()}`;
        }
        
        messageText += '\n\n';
      }

      if (result.hasMore) {
        messageText += `... and ${result.totalCount - result.tasks.length} more tasks\n`;
      }

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
      console.error('Error in list command:', error);
      return { success: false, messageText: '❌ Failed to list tasks' };
    }
  }

  private async handleCreateCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    if (args.length === 0) {
      return {
        success: true,
        messageText: '📝 **Create a New Task**\n\n' +
          'Please provide a task description.\n\n' +
          '**Examples:**\n' +
          '• `/create Review quarterly report`\n' +
          '• `/create urgent Call client about project due tomorrow`\n' +
          '• `/create low priority Organize desk #cleanup`\n\n' +
          'You can include:\n' +
          '• Priority: urgent, high, medium, low\n' +
          '• Due dates: tomorrow, Friday, next week\n' +
          '• Tags: #tag-name',
        parseMode: 'Markdown',
      };
    }

    const taskDescription = args.join(' ');
    
    // Convert to a message and delegate to the message handler
    const taskMessage: TelegramMessage = {
      ...message,
      text: taskDescription,
    };

    return this.messageHandler.handleMessage(taskMessage);
  }

  private async handleCompleteCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    if (args.length === 0) {
      return {
        success: true,
        messageText: '📋 **Complete a Task**\n\n' +
          'Please specify a task to complete:\n\n' +
          '• `/complete [task-id]` - Complete specific task\n' +
          '• Use task ID from /list command\n\n' +
          'Or use the buttons below to select a task.',
        replyMarkup: {
          inlineKeyboard: [
            [{ text: '📋 List My Tasks', callbackData: 'list:my' }]
          ]
        }
      };
    }

    const taskId = args[0];
    const user = await this.userRepository.findByTelegramId(message.from.id.toString());
    
    if (!user) {
      return { success: false, messageText: '❌ User not found. Please use /start first.' };
    }

    try {
      // Try to find task by partial ID
      const tasks = await this.taskRepository.findAll({ 
        createdById: user.id,
        limit: 100 
      });
      
      const task = tasks.find(t => t.id.startsWith(taskId) || t.id === taskId);
      
      if (!task) {
        return {
          success: false,
          messageText: `❌ Task not found with ID: ${taskId}\n\nUse /list to see your tasks and their IDs.`
        };
      }

      const result = await this.completeTaskUseCase.markComplete(task.id, user.id);
      
      if (result.success) {
        let responseText = `✅ **Task Completed!**\n\n📋 ${task.title}\n`;
        
        if (result.warnings && result.warnings.length > 0) {
          responseText += `\n⚠️ **Warnings:**\n${result.warnings.join('\n')}`;
        }
        
        return {
          success: true,
          messageText: responseText,
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
      } else {
        return {
          success: false,
          messageText: `❌ Failed to complete task: ${result.errors?.join(', ')}`
        };
      }
    } catch (error) {
      console.error('Error completing task:', error);
      return { success: false, messageText: '❌ Failed to complete task' };
    }
  }

  private async handleStatusCommand(message: TelegramMessage): Promise<TelegramResponse> {
    // Delegate to message handler
    const statusMessage: TelegramMessage = {
      ...message,
      text: 'what is my status',
    };
    return this.messageHandler.handleMessage(statusMessage);
  }

  private async handleCancelCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    return {
      success: true,
      messageText: '🚧 Task cancellation is coming soon!\n\nFor now, you can:\n• List your tasks with /list\n• Complete tasks with /complete',
      replyMarkup: {
        inlineKeyboard: [
          [{ text: '📋 My Tasks', callbackData: 'list:my' }]
        ]
      }
    };
  }

  private async handlePriorityCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    return {
      success: true,
      messageText: '🚧 Priority setting is coming soon!\n\nFor now, you can include priority when creating tasks:\n\n"urgent task description" or "low priority task"',
      replyMarkup: {
        inlineKeyboard: [
          [{ text: '➕ Create Task', callbackData: 'create:new' }]
        ]
      }
    };
  }

  private async handleAssignCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    return {
      success: true,
      messageText: '🚧 Task assignment is coming soon!\n\nCurrently, all tasks are automatically assigned to you.',
      replyMarkup: {
        inlineKeyboard: [
          [{ text: '📋 My Tasks', callbackData: 'list:my' }]
        ]
      }
    };
  }

  private async handleSearchCommand(message: TelegramMessage, args: string[]): Promise<TelegramResponse> {
    return {
      success: true,
      messageText: '🚧 Task search is coming soon!\n\nFor now, use /list to see all your tasks.',
      replyMarkup: {
        inlineKeyboard: [
          [{ text: '📋 My Tasks', callbackData: 'list:my' }]
        ]
      }
    };
  }

  private async handleSettingsCommand(message: TelegramMessage): Promise<TelegramResponse> {
    return {
      success: true,
      messageText: '⚙️ **Settings**\n\n🚧 User settings management is coming soon!\n\nPlanned features:\n• Timezone configuration\n• Notification preferences\n• Default project settings\n• Language selection',
      parseMode: 'Markdown',
      replyMarkup: {
        inlineKeyboard: [
          [{ text: '📋 Back to Tasks', callbackData: 'list:my' }]
        ]
      }
    };
  }

  // Callback handlers
  private async handleListCallback(query: CallbackQuery, params: string[]): Promise<CallbackResponse> {
    const action = params[0];
    
    const message: TelegramMessage = {
      messageId: query.message?.messageId || 0,
      chatId: query.message?.chatId || 0,
      from: query.from,
      text: action === 'my' ? '/list' : '/list refresh',
      date: new Date(),
    };

    const response = await this.handleListCommand(message, action === 'my' ? [] : ['refresh']);
    
    return {
      ...response,
      callbackQueryId: query.id,
    };
  }

  private async handleCreateCallback(query: CallbackQuery, params: string[]): Promise<CallbackResponse> {
    const action = params[0];
    
    if (action === 'new') {
      return {
        callbackQueryId: query.id,
        success: true,
        messageText: '📝 **Create a New Task**\n\nSend me a message describing what you need to do.\n\n**Examples:**\n• "Review the project proposal"\n• "urgent Call the client about delivery"\n• "Schedule team meeting for next week"',
        parseMode: 'Markdown',
        showAlert: false,
      };
    } else if (action.length > 0) {
      // Handle encoded task creation
      try {
        const decodedMessage = Buffer.from(action, 'base64').toString('utf-8');
        const message: TelegramMessage = {
          messageId: query.message?.messageId || 0,
          chatId: query.message?.chatId || 0,
          from: query.from,
          text: decodedMessage,
          date: new Date(),
        };

        const response = await this.messageHandler.handleMessage(message);
        return {
          ...response,
          callbackQueryId: query.id,
        };
      } catch (error) {
        return {
          callbackQueryId: query.id,
          success: false,
          messageText: '❌ Failed to create task',
          showAlert: true,
          alertText: 'Invalid task data',
        };
      }
    }

    return {
      callbackQueryId: query.id,
      success: false,
      messageText: '❌ Invalid create action',
      showAlert: true,
    };
  }

  private async handleCompleteCallback(query: CallbackQuery, params: string[]): Promise<CallbackResponse> {
    const taskIdOrAction = params[0];
    
    if (taskIdOrAction === 'select') {
      return {
        callbackQueryId: query.id,
        success: true,
        messageText: '✅ **Complete a Task**\n\nUse /list to see your tasks, then use:\n`/complete [task-id]`\n\nOr click a task from the list to get completion options.',
        parseMode: 'Markdown',
        replyMarkup: {
          inlineKeyboard: [
            [{ text: '📋 List My Tasks', callbackData: 'list:my' }]
          ]
        }
      };
    }

    // Handle specific task completion
    const user = await this.userRepository.findByTelegramId(query.from.id.toString());
    if (!user) {
      return {
        callbackQueryId: query.id,
        success: false,
        messageText: '❌ User not found',
        showAlert: true,
      };
    }

    try {
      const result = await this.completeTaskUseCase.markComplete(taskIdOrAction, user.id);
      
      if (result.success) {
        return {
          callbackQueryId: query.id,
          success: true,
          messageText: `✅ Task completed: ${result.task.title}`,
          showAlert: false,
          alertText: 'Task marked as complete!',
        };
      } else {
        return {
          callbackQueryId: query.id,
          success: false,
          messageText: `❌ Failed to complete task: ${result.errors?.join(', ')}`,
          showAlert: true,
        };
      }
    } catch (error) {
      return {
        callbackQueryId: query.id,
        success: false,
        messageText: '❌ Error completing task',
        showAlert: true,
      };
    }
  }

  private async handleEditCallback(query: CallbackQuery, params: string[]): Promise<CallbackResponse> {
    return {
      callbackQueryId: query.id,
      success: true,
      messageText: '🚧 Task editing is coming soon!\n\nFor now, you can create new tasks and complete existing ones.',
      showAlert: false,
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

  private async handleConfirmCallback(query: CallbackQuery, params: string[]): Promise<CallbackResponse> {
    return {
      callbackQueryId: query.id,
      success: true,
      messageText: '🚧 Confirmation handling is coming soon!',
      showAlert: true,
    };
  }

  private async handleHelpCallback(query: CallbackQuery): Promise<CallbackResponse> {
    const helpResponse = await this.handleHelpCommand();
    return {
      ...helpResponse,
      callbackQueryId: query.id,
    };
  }

  private async handleRetryCallback(query: CallbackQuery): Promise<CallbackResponse> {
    return {
      callbackQueryId: query.id,
      success: true,
      messageText: '🔄 Please send your message again and I\'ll try to help you.',
      showAlert: false,
    };
  }

  // Helper methods
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