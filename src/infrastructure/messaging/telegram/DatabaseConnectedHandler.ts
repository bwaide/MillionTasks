/**
 * Database-Connected Telegram Handler
 * Handles bot commands with actual database integration
 */

import { Context } from 'telegraf';
import { MessageHandler } from './TelegramBot.js';
import { IUserRepository } from '../../../domain/repositories/IUserRepository.js';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository.js';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository.js';
import { CreateTaskUseCase } from '../../../application/use-cases/tasks/CreateTaskUseCase.js';
import { ListTasksUseCase } from '../../../application/use-cases/tasks/ListTasksUseCase.js';
import { CompleteTaskUseCase } from '../../../application/use-cases/tasks/CompleteTaskUseCase.js';
import { DeleteTaskUseCase } from '../../../application/use-cases/tasks/DeleteTaskUseCase.js';
import { ScheduleTaskUseCase } from '../../../application/use-cases/tasks/ScheduleTaskUseCase.js';
import { MessageProcessor } from '../../../application/services/MessageProcessor.js';
import { User } from '../../../domain/entities/User.js';
import { Project } from '../../../domain/entities/Project.js';
import { Task } from '../../../domain/entities/Task.js';
import { Priority } from '../../../domain/value-objects/Priority.js';
import { TaskSessionCache } from './TaskSessionCache.js';

export class DatabaseConnectedHandler implements MessageHandler {
  private taskCache: TaskSessionCache;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly completeTaskUseCase: CompleteTaskUseCase,
    private readonly deleteTaskUseCase: DeleteTaskUseCase,
    private readonly scheduleTaskUseCase: ScheduleTaskUseCase,
    private readonly messageProcessor: MessageProcessor
  ) {
    this.taskCache = new TaskSessionCache();

    // Clear expired sessions every 10 minutes
    setInterval(() => {
      this.taskCache.clearExpiredSessions();
    }, 10 * 60 * 1000);
  }

  async handle(ctx: Context): Promise<void> {
    // Handle callback queries (button clicks)
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await this.handleCallbackQuery(ctx);
      return;
    }

    // Check if it's a text message
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    const text = ctx.message.text;
    const telegramId = String(ctx.from?.id);
    const username = ctx.from?.username || ctx.from?.first_name || 'User';

    console.log(`📨 Message from ${username} (${telegramId}): ${text}`);

    // Get or create user
    const user = await this.getOrCreateUser(ctx);
    if (!user) {
      await ctx.reply('❌ Failed to process user information. Please try again.');
      return;
    }

    // Handle commands
    if (text.startsWith('/')) {
      await this.handleCommand(ctx, text, user);
    } else {
      // Handle natural language
      await this.handleNaturalLanguage(ctx, text, user);
    }
  }

  private async getOrCreateUser(ctx: Context): Promise<User | null> {
    try {
      const telegramId = String(ctx.from?.id);
      
      // Try to find existing user
      let user = await this.userRepository.findByTelegramId(telegramId);
      
      if (!user) {
        // Create new user
        console.log(`Creating new user for Telegram ID: ${telegramId}`);
        const newUser = User.create({
          firstName: ctx.from?.first_name || 'User',
          lastName: ctx.from?.last_name,
          username: ctx.from?.username,
          telegramId: telegramId,
          preferences: {
            timezone: 'UTC',
            language: 'en',
            notifications: {
              enabled: true,
              taskReminders: true,
              projectUpdates: true
            }
          },
          isActive: true
        });
        
        user = await this.userRepository.save(newUser);
        
        // Also save user channel info
        // Note: This would need a proper UserChannelRepository in production
        console.log(`Created user with ID: ${user.id}`);
      }
      
      return user;
    } catch (error) {
      console.error('Error getting/creating user:', error);
      return null;
    }
  }

  private async handleCommand(ctx: Context, text: string, user: User): Promise<void> {
    const command = text.split(' ')[0].toLowerCase();
    
    switch (command) {
      case '/start':
        await this.handleStart(ctx, user);
        break;

      case '/help':
        await this.handleHelp(ctx);
        break;

      case '/list':
      case '/tasks':
        await this.handleListTasks(ctx, user);
        break;

      case '/projects':
        await this.handleListProjects(ctx, user);
        break;

      case '/create':
      case '/new':
        await this.handleCreateTask(ctx, text, user);
        break;

      case '/complete':
      case '/done':
        await this.handleCompleteTask(ctx, text, user);
        break;

      case '/delete':
      case '/remove':
        await this.handleDeleteTask(ctx, text, user);
        break;

      case '/status':
        await this.handleStatus(ctx, user);
        break;

      case '/settings':
        await this.handleSettings(ctx, user);
        break;

      case '/webview':
      case '/web':
        await this.handleWebView(ctx, user);
        break;

      case '/now':
        await this.handleNowTasks(ctx, user);
        break;

      case '/next':
        await this.handleNextTasks(ctx, user);
        break;

      case '/later':
        await this.handleLaterTasks(ctx, user);
        break;

      case '/pick':
        await this.handlePickTasks(ctx, user);
        break;

      case '/defer':
        await this.handleDeferTask(ctx, text, user);
        break;

      case '/schedule':
        await this.handleScheduleTask(ctx, text, user);
        break;

      default:
        await ctx.reply(`❓ Unknown command: ${command}\n\nType /help to see available commands.`);
    }
  }

  private async handleStart(ctx: Context, user: User): Promise<void> {
    // Ensure user has a default project
    const projects = await this.projectRepository.findByUserId(user.id!);
    
    if (projects.length === 0) {
      // Create default Personal project
      const personalProject = Project.create({
        name: 'Personal',
        description: 'Personal tasks and reminders',
        ownerId: user.id!,
        settings: {
          isPublic: false,
          allowTaskCreation: true,
          requireApproval: false,
          defaultPriority: 'medium'
        },
        isActive: true
      });
      
      await this.projectRepository.save(personalProject);
      console.log(`Created default project for user ${user.id}`);
    }

    await ctx.reply(
      `👋 Welcome to MillionTasks!\n\n` +
      `I'm your AI-powered task manager. I understand natural language, so you can just tell me what you need to do.\n\n` +
      `Try saying:\n` +
      `• "Create a task to call John tomorrow"\n` +
      `• "What do I have today?"\n` +
      `• "Mark grocery shopping as done"\n\n` +
      `Your default "Personal" project has been created.\n\n` +
      `Let's get started! What would you like to do?`
    );
  }

  private async handleHelp(ctx: Context): Promise<void> {
    await ctx.reply(
      `🤖 MillionTasks Help\n\n` +
      `**Natural Language Commands:**\n` +
      `Just type what you want to do!\n\n` +
      `Examples:\n` +
      `• "Review quarterly report by Friday"\n` +
      `• "Meeting with Sarah at 3pm tomorrow"\n` +
      `• "Buy groceries #shopping"\n` +
      `• "High priority: Fix the bug"\n\n` +
      `**Basic Commands:**\n` +
      `/start - Initialize your account\n` +
      `/help - Show this help\n` +
      `/list - Show your tasks\n` +
      `/status - Get task summary\n` +
      `/projects - Show your projects\n\n` +
      `**Task Management:**\n` +
      `/create <text> - Create a task\n` +
      `/complete <task-id> - Mark task as complete\n` +
      `/delete <task-id> - Delete a task\n\n` +
      `**Settings:**\n` +
      `/settings - Manage preferences\n` +
      `/webview - Get web dashboard link\n\n` +
      `💡 Tip: You can use short task IDs (first 8 chars)!\n` +
      `Just send me a message and I'll help you manage your tasks!`,
      { parse_mode: 'Markdown' }
    );
  }

  private async handleListTasks(ctx: Context, user: User): Promise<void> {
    try {
      const tasks = await this.listTasksUseCase.getMyTasks(user.id!);

      if (!tasks || tasks.length === 0) {
        await ctx.reply(
          `📋 You don't have any tasks yet.\n\n` +
          `Create your first task by saying something like:\n` +
          `"Buy groceries" or "Meeting at 3pm tomorrow"`
        );
        return;
      }

      // Store tasks in cache for numbered references
      this.taskCache.setUserTasks(user.id!, tasks);

      let response = `📋 **Your Tasks**\n\n`;

      // Group tasks by project
      const tasksByProject = new Map<string, typeof tasks>();
      for (const task of tasks) {
        const projectId = task.projectId || 'no-project';
        if (!tasksByProject.has(projectId)) {
          tasksByProject.set(projectId, []);
        }
        tasksByProject.get(projectId)!.push(task);
      }

      let taskNumber = 1;
      for (const [projectId, projectTasks] of tasksByProject) {
        // Get project name
        const project = await this.projectRepository.findById(projectId);
        const projectName = project?.name || 'No Project';

        response += `📁 **${projectName}**\n`;

        for (const task of projectTasks) {
          const statusStr = typeof task.status === 'string' ? task.status : task.status.toString();
          const status = (statusStr === 'done' || statusStr === 'completed') ? '✅' : '⏳';
          const priority = this.getPriorityEmoji(task.priority);

          response += `${taskNumber}. ${status} ${priority} ${task.title}`;

          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            response += ` | 📅 ${dueDate.toLocaleDateString()}`;
          }

          response += '\n';
          taskNumber++;
        }
        response += '\n';
      }

      response += `💡 Use task numbers with commands:\n`;
      response += `   \`/complete 1\` or \`/delete 2\`\n`;
      response += `   Or describe the task: \`/delete Buy groceries\``;

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error listing tasks:', error);
      await ctx.reply('❌ Failed to load tasks. Please try again.');
    }
  }

  private async handleListProjects(ctx: Context, user: User): Promise<void> {
    try {
      const projects = await this.projectRepository.findByUserId(user.id!);
      
      if (projects.length === 0) {
        await ctx.reply(
          `📁 You don't have any projects yet.\n\n` +
          `A default "Personal" project will be created when you start using the bot.`
        );
        return;
      }

      let response = `📁 **Your Projects**\n\n`;
      
      for (const project of projects) {
        const taskCount = await this.taskRepository.findByProjectId(project.id!);
        response += `• **${project.name}**`;
        
        if (project.description) {
          response += ` - ${project.description}`;
        }
        
        response += ` (${taskCount.length} tasks)\n`;
      }

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error listing projects:', error);
      await ctx.reply('❌ Failed to load projects. Please try again.');
    }
  }

  private async handleCreateTask(ctx: Context, text: string, user: User): Promise<void> {
    try {
      // Remove /create command from text
      const taskText = text.replace(/^\/create\s*/i, '').trim();
      
      if (!taskText) {
        await ctx.reply('Please provide task details. Example: /create Buy groceries');
        return;
      }

      // Get user's first project (or create default)
      let projects = await this.projectRepository.findByUserId(user.id!);
      if (projects.length === 0) {
        // Create default project
        const defaultProject = Project.create({
          name: 'Personal',
          description: 'Personal tasks',
          ownerId: user.id!,
          settings: {
            isPublic: false,
            allowTaskCreation: true,
            requireApproval: false,
            defaultPriority: 'medium'
          },
          isActive: true
        });
        const savedProject = await this.projectRepository.save(defaultProject);
        projects = [savedProject];
      }

      // Extract task details using AI
      const extractedData = await this.messageProcessor.extractTaskFromMessage(taskText, {
        userId: user.id!,
        projectId: projects[0].id
      });

      // Create the task
      const result = await this.createTaskUseCase.createFromMessage(
        extractedData,
        user.id!,
        projects[0].id
      );

      if (result.success && result.task) {
        let response = `✅ Task created: "${result.task.title}"\n`;
        response += `📁 Project: ${projects[0].name}\n`;

        if (result.task.priority) {
          response += `${this.getPriorityEmoji(result.task.priority)} Priority: ${result.task.priority.toString()}\n`;
        }

        if (result.task.dueDate) {
          response += `📅 Due: ${new Date(result.task.dueDate).toLocaleDateString()}\n`;
        }

        await ctx.reply(response);
      } else {
        const errorMessage = result.errors?.join(', ') || 'Unknown error';
        await ctx.reply(`❌ Failed to create task: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      await ctx.reply('❌ Failed to create task. Please try again.');
    }
  }

  private async handleNaturalLanguage(ctx: Context, text: string, user: User): Promise<void> {
    try {
      // Process with AI
      const processed = await this.messageProcessor.processUserMessage(text, {
        userId: user.id!
      });

      console.log(`Intent: ${processed.intent}, Confidence: ${processed.confidence}`);

      // If high confidence, take action
      if (processed.confidence > 0.7) {
        switch (processed.intent) {
          case 'create_task':
            await this.handleCreateTask(ctx, text, user);
            break;

          case 'list_tasks':
            await this.handleListTasks(ctx, user);
            break;

          case 'list_now_tasks':
            await this.handleNowTasks(ctx, user);
            break;

          case 'list_next_tasks':
            await this.handleNextTasks(ctx, user);
            break;

          case 'list_later_tasks':
            await this.handleLaterTasks(ctx, user);
            break;

          case 'pick_now_tasks':
            await this.handlePickTasks(ctx, user);
            break;

          case 'schedule_task_now':
          case 'schedule_task_next':
          case 'schedule_task_later':
            await this.handleScheduleTaskNaturalLanguage(ctx, processed, user);
            break;

          default:
            await ctx.reply(
              `I think you want to ${processed.intent.replace('_', ' ')}, ` +
              `but this feature isn't implemented yet.\n\n` +
              `Try:\n• Creating a task: "Buy milk tomorrow"\n• Listing tasks: /list`
            );
        }
      } else {
        // Low confidence, ask for clarification
        await ctx.reply(
          `🤔 I'm not sure what you want to do.\n\n` +
          `You can:\n` +
          `• Create a task: "Buy groceries"\n` +
          `• List tasks: "Show my tasks" or /list\n` +
          `• Get help: /help`
        );
      }
    } catch (error) {
      console.error('Error processing natural language:', error);
      await ctx.reply(
        `I couldn't process that message. Try:\n` +
        `• /create <task> - Create a task\n` +
        `• /list - Show your tasks\n` +
        `• /help - Get help`
      );
    }
  }

  private async handleCompleteTask(ctx: Context, text: string, user: User): Promise<void> {
    try {
      // Extract arguments from command
      const args = text.split(' ').slice(1);

      if (args.length === 0) {
        await ctx.reply(
          '✅ **Complete a Task**\n\n' +
          'Specify a task by number or description:\n' +
          '• `/complete 1` - Complete task #1\n' +
          '• `/complete Buy groceries` - Find by title\n\n' +
          'Use /list to see numbered tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const input = args.join(' ');
      let task: Task | null = null;

      // Try to parse as number first
      const taskNumber = parseInt(input);
      if (!isNaN(taskNumber)) {
        task = this.taskCache.getTaskByNumber(user.id!, taskNumber);
        if (!task) {
          await ctx.reply(
            `❌ Task #${taskNumber} not found.\n\n` +
            `Use /list to see your numbered tasks (task numbers expire after 30 minutes).`
          );
          return;
        }
      } else {
        // Try to find by description
        const matches = this.taskCache.findAllMatchingTasks(user.id!, input);

        if (matches.length === 0) {
          await ctx.reply(
            `❌ No tasks found matching "${input}".\n\n` +
            `Use /list to see your tasks.`
          );
          return;
        } else if (matches.length > 1) {
          // Multiple matches - ask user to be more specific
          let response = `🤔 Found ${matches.length} matching tasks:\n\n`;
          for (let i = 0; i < Math.min(matches.length, 5); i++) {
            const taskNum = this.taskCache.getTaskNumber(user.id!, matches[i].id);
            response += `${taskNum}. ${matches[i].title}\n`;
          }
          response += `\nPlease use the task number: \`/complete ${this.taskCache.getTaskNumber(user.id!, matches[0].id)}\``;

          await ctx.reply(response, { parse_mode: 'Markdown' });
          return;
        }

        task = matches[0];
      }

      // Show confirmation dialog
      await this.showCompleteConfirmation(ctx, task, user);
    } catch (error) {
      console.error('Error completing task:', error);
      await ctx.reply('❌ Failed to complete task. Please try again.');
    }
  }

  private async handleDeleteTask(ctx: Context, text: string, user: User): Promise<void> {
    try {
      // Extract arguments from command
      const args = text.split(' ').slice(1);

      if (args.length === 0) {
        await ctx.reply(
          '🗑️ **Delete a Task**\n\n' +
          'Specify a task by number or description:\n' +
          '• `/delete 1` - Delete task #1\n' +
          '• `/delete Buy groceries` - Find by title\n\n' +
          '⚠️ **Warning:** This action cannot be undone!\n\n' +
          'Use /list to see numbered tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const input = args.join(' ');
      let task: Task | null = null;

      // Try to parse as number first
      const taskNumber = parseInt(input);
      if (!isNaN(taskNumber)) {
        task = this.taskCache.getTaskByNumber(user.id!, taskNumber);
        if (!task) {
          await ctx.reply(
            `❌ Task #${taskNumber} not found.\n\n` +
            `Use /list to see your numbered tasks (task numbers expire after 30 minutes).`
          );
          return;
        }
      } else {
        // Try to find by description
        const matches = this.taskCache.findAllMatchingTasks(user.id!, input);

        if (matches.length === 0) {
          await ctx.reply(
            `❌ No tasks found matching "${input}".\n\n` +
            `Use /list to see your tasks.`
          );
          return;
        } else if (matches.length > 1) {
          // Multiple matches - ask user to be more specific
          let response = `🤔 Found ${matches.length} matching tasks:\n\n`;
          for (let i = 0; i < Math.min(matches.length, 5); i++) {
            const taskNum = this.taskCache.getTaskNumber(user.id!, matches[i].id);
            response += `${taskNum}. ${matches[i].title}\n`;
          }
          response += `\nPlease use the task number: \`/delete ${this.taskCache.getTaskNumber(user.id!, matches[0].id)}\``;

          await ctx.reply(response, { parse_mode: 'Markdown' });
          return;
        }

        task = matches[0];
      }

      // Show confirmation dialog
      await this.showDeleteConfirmation(ctx, task, user);
    } catch (error) {
      console.error('Error deleting task:', error);
      await ctx.reply('❌ Failed to delete task. Please try again.');
    }
  }

  private async handleStatus(ctx: Context, user: User): Promise<void> {
    try {
      // Get all user's projects
      const projects = await this.projectRepository.findByUserId(user.id!);

      if (projects.length === 0) {
        await ctx.reply('You don\'t have any projects yet. Use /start to get started.');
        return;
      }

      // Get task summary across all projects
      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      let todoTasks = 0;
      let overdueTasks = 0;

      for (const project of projects) {
        const tasks = await this.taskRepository.findByProjectId(project.id!);
        totalTasks += tasks.length;

        for (const task of tasks) {
          const statusStr = typeof task.status === 'string' ? task.status : task.status.toString();

          if (statusStr === 'done' || statusStr === 'completed') {
            completedTasks++;
          } else if (statusStr === 'in_progress') {
            inProgressTasks++;
          } else if (statusStr === 'todo') {
            todoTasks++;
          }

          if (task.dueDate && new Date(task.dueDate) < new Date() && statusStr !== 'done') {
            overdueTasks++;
          }
        }
      }

      let response = '📊 **Your Task Summary**\n\n';
      response += `📋 Total Tasks: ${totalTasks}\n`;
      response += `✅ Completed: ${completedTasks}\n`;
      response += `🔄 In Progress: ${inProgressTasks}\n`;
      response += `📝 To Do: ${todoTasks}\n`;

      if (overdueTasks > 0) {
        response += `\n🚨 **${overdueTasks} tasks are overdue!**\n`;
      }

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error getting status:', error);
      await ctx.reply('❌ Failed to get status. Please try again.');
    }
  }

  private async handleSettings(ctx: Context, user: User): Promise<void> {
    await ctx.reply(
      '⚙️ **Settings**\n\n' +
      '🚧 User settings management is coming soon!\n\n' +
      'Planned features:\n' +
      '• Timezone configuration\n' +
      '• Notification preferences\n' +
      '• Default project settings\n' +
      '• Language selection',
      { parse_mode: 'Markdown' }
    );
  }

  private async handleWebView(ctx: Context, user: User): Promise<void> {
    try {
      // Generate magic link token
      const token = Buffer.from(
        JSON.stringify({
          telegram_id: user.telegramId,
          exp: Date.now() + 3600000 // 1 hour expiry
        })
      ).toString('base64url');

      const webAppUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
      const magicLink = `${webAppUrl}/auth/telegram?token=${token}`;

      await ctx.reply(
        '🌐 **Web Dashboard**\n\n' +
        '✨ View your tasks in a beautiful web interface!\n\n' +
        `Click the link below to access your dashboard:\n` +
        `${magicLink}\n\n` +
        `⏱ This link expires in 1 hour.\n\n` +
        `💡 Tip: Bookmark the page after logging in for quick access!`,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );
    } catch (error) {
      console.error('Error generating web view link:', error);
      await ctx.reply('❌ Failed to generate web dashboard link. Please try again later.');
    }
  }

  private async showCompleteConfirmation(ctx: Context, task: Task, user: User): Promise<void> {
    const taskNum = this.taskCache.getTaskNumber(user.id!, task.id) || '#';
    const message =
      `✅ **Complete Task?**\n\n` +
      `${taskNum}. ${task.title}\n\n` +
      `Are you sure you want to mark this task as complete?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Yes, Complete', callback_data: `confirm_complete:${task.id}` },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]
        ]
      }
    });
  }

  private async showDeleteConfirmation(ctx: Context, task: Task, user: User): Promise<void> {
    const taskNum = this.taskCache.getTaskNumber(user.id!, task.id) || '#';
    const message =
      `🗑️ **Delete Task?**\n\n` +
      `${taskNum}. ${task.title}\n\n` +
      `⚠️ **Warning:** This action cannot be undone!\n\n` +
      `Are you sure you want to delete this task?`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🗑️ Yes, Delete', callback_data: `confirm_delete:${task.id}` },
            { text: '❌ Cancel', callback_data: 'cancel' }
          ]
        ]
      }
    });
  }

  private async handleCallbackQuery(ctx: Context): Promise<void> {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = ctx.callbackQuery.data;
      const telegramId = String(ctx.from?.id);

      // Answer the callback query to remove loading state
      await ctx.answerCbQuery();

      // Get user
      const user = await this.userRepository.findByTelegramId(telegramId);
      if (!user) {
        await ctx.reply('❌ User not found. Please use /start first.');
        return;
      }

      // Handle cancel
      if (data === 'cancel') {
        await ctx.editMessageText('❌ Cancelled.');
        return;
      }

      // Handle complete confirmation
      if (data.startsWith('confirm_complete:')) {
        const taskId = data.replace('confirm_complete:', '');
        const result = await this.completeTaskUseCase.markComplete(taskId, user.id!);

        if (result.success) {
          await ctx.editMessageText(
            `✅ **Task Completed!**\n\n📋 ${result.task.title}\n\nGreat work! 🎉`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await ctx.editMessageText(`❌ Failed to complete task: ${result.errors?.join(', ')}`);
        }
        return;
      }

      // Handle delete confirmation
      if (data.startsWith('confirm_delete:')) {
        const taskId = data.replace('confirm_delete:', '');
        const result = await this.deleteTaskUseCase.execute({ taskId, userId: user.id! });

        if (result.success) {
          await ctx.editMessageText(
            `🗑️ **Task Deleted!**\n\n📋 ${result.taskTitle}\n\nThe task has been permanently removed.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await ctx.editMessageText(`❌ Failed to delete task: ${result.errors?.join(', ')}`);
        }
        return;
      }

    } catch (error) {
      console.error('Error handling callback query:', error);
      await ctx.reply('❌ An error occurred. Please try again.');
    }
  }

  // GTD Command Handlers
  private async handleNowTasks(ctx: Context, user: User): Promise<void> {
    try {
      const nowTasks = await this.taskRepository.findByUserAndGTDStatus(user.id!, 'now');
      const activeTasks = nowTasks.filter(t => {
        const statusStr = typeof t.status === 'string' ? t.status : t.status.toString();
        return statusStr !== 'done' && statusStr !== 'cancelled';
      });

      let response = '⚡ **NOW Tasks** (Today\'s Focus)\n\n';

      if (activeTasks.length === 0) {
        response += '✨ You have no NOW tasks!\n\n';
        response += 'Use /pick to select up to 3 tasks to focus on today.';
      } else {
        for (const task of activeTasks) {
          const statusStr = typeof task.status === 'string' ? task.status : task.status.toString();
          const status = statusStr === 'done' ? '✅' : '⏳';
          const priority = this.getPriorityEmoji(task.priority);

          response += `${status} ${priority} **${task.title}**\n`;

          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            const isOverdue = dueDate < new Date() && statusStr !== 'done';
            response += `   ${isOverdue ? '🚨' : '📅'} ${dueDate.toLocaleDateString()}\n`;
          }

          response += '\n';
        }

        response += `\n💡 You have ${activeTasks.length}/3 NOW tasks.`;
      }

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in /now command:', error);
      await ctx.reply('❌ Failed to get NOW tasks');
    }
  }

  private async handleNextTasks(ctx: Context, user: User): Promise<void> {
    try {
      const nextTasks = await this.taskRepository.findByUserAndGTDStatus(user.id!, 'next');
      const activeTasks = nextTasks.filter(t => {
        const statusStr = typeof t.status === 'string' ? t.status : t.status.toString();
        return statusStr !== 'done' && statusStr !== 'cancelled';
      });

      let response = '📅 **NEXT Tasks** (Upcoming)\n\n';

      if (activeTasks.length === 0) {
        response += 'No NEXT tasks found.\n\n';
        response += 'Tasks scheduled for NEXT will appear here.';
      } else {
        for (const task of activeTasks.slice(0, 10)) {
          const statusStr = typeof task.status === 'string' ? task.status : task.status.toString();
          const status = statusStr === 'done' ? '✅' : '⏳';
          const priority = this.getPriorityEmoji(task.priority);

          response += `${status} ${priority} **${task.title}**\n`;

          if (task.scheduledDate) {
            const scheduledDate = new Date(task.scheduledDate);
            response += `   📅 ${scheduledDate.toLocaleDateString()}\n`;
          }

          response += '\n';
        }

        if (activeTasks.length > 10) {
          response += `... and ${activeTasks.length - 10} more NEXT tasks\n`;
        }
      }

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in /next command:', error);
      await ctx.reply('❌ Failed to get NEXT tasks');
    }
  }

  private async handleLaterTasks(ctx: Context, user: User): Promise<void> {
    try {
      const laterTasks = await this.taskRepository.findByUserAndGTDStatus(user.id!, 'later');
      const activeTasks = laterTasks.filter(t => {
        const statusStr = typeof t.status === 'string' ? t.status : t.status.toString();
        return statusStr !== 'done' && statusStr !== 'cancelled';
      });

      let response = '🔮 **LATER Tasks** (Backlog)\n\n';

      if (activeTasks.length === 0) {
        response += 'No LATER tasks found.\n\n';
        response += 'Tasks deferred to LATER will appear here.';
      } else {
        for (const task of activeTasks.slice(0, 15)) {
          const statusStr = typeof task.status === 'string' ? task.status : task.status.toString();
          const status = statusStr === 'done' ? '✅' : '⏳';
          const priority = this.getPriorityEmoji(task.priority);

          response += `${status} ${priority} **${task.title}**\n\n`;
        }

        if (activeTasks.length > 15) {
          response += `... and ${activeTasks.length - 15} more LATER tasks\n`;
        }
      }

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in /later command:', error);
      await ctx.reply('❌ Failed to get LATER tasks');
    }
  }

  private async handlePickTasks(ctx: Context, user: User): Promise<void> {
    try {
      // Check current NOW tasks
      const nowTasks = await this.taskRepository.findByUserAndGTDStatus(user.id!, 'now');
      const activeNowTasks = nowTasks.filter(t => {
        const statusStr = typeof t.status === 'string' ? t.status : t.status.toString();
        return statusStr !== 'done' && statusStr !== 'cancelled';
      });

      const availableSlots = 3 - activeNowTasks.length;

      if (availableSlots <= 0) {
        await ctx.reply(
          '⚡ **NOW Tasks Full**\n\n' +
          'You already have 3 NOW tasks. Complete or defer some tasks first.\n\n' +
          'Use /now to see your current NOW tasks.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Get NEXT tasks to pick from
      const nextTasks = await this.taskRepository.findByUserAndGTDStatus(user.id!, 'next');
      const activeNextTasks = nextTasks.filter(t => {
        const statusStr = typeof t.status === 'string' ? t.status : t.status.toString();
        return statusStr !== 'done' && statusStr !== 'cancelled';
      });

      if (activeNextTasks.length === 0) {
        await ctx.reply(
          `📌 **Pick NOW Tasks**\n\n` +
          `You have ${availableSlots} available slot(s) for NOW tasks.\n\n` +
          `No NEXT tasks available. Create some tasks first or check your LATER list.`,
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Store tasks in cache for selection
      this.taskCache.setUserTasks(user.id!, activeNextTasks);

      let response = `📌 **Pick NOW Tasks**\n\n`;
      response += `You have ${availableSlots} available slot(s).\n\n`;
      response += `**Available NEXT Tasks:**\n\n`;

      let taskNum = 1;
      for (const task of activeNextTasks.slice(0, 5)) {
        const priority = this.getPriorityEmoji(task.priority);
        response += `${taskNum}. ${priority} **${task.title}**\n`;
        if (task.scheduledDate) {
          response += `   📅 ${task.scheduledDate.toLocaleDateString()}\n`;
        }
        response += '\n';
        taskNum++;
      }

      response += `\n💡 Use: \`/schedule [task-number] now\` to promote a task to NOW\n`;
      response += `Example: \`/schedule 1 now\``;

      await ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error in /pick command:', error);
      await ctx.reply('❌ Failed to pick tasks');
    }
  }

  private async handleDeferTask(ctx: Context, text: string, user: User): Promise<void> {
    try {
      const args = text.split(' ').slice(1);

      if (args.length < 2) {
        await ctx.reply(
          '⏭️ **Defer Task**\n\n' +
          'Usage: `/defer [task-number] [next|later]`\n\n' +
          '**Examples:**\n' +
          '• `/defer 1 next` - Move to NEXT\n' +
          '• `/defer 2 later` - Move to LATER\n\n' +
          'Use /list to see task numbers.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const taskInput = args[0];
      const target = args[1].toLowerCase();

      if (target !== 'next' && target !== 'later') {
        await ctx.reply(
          '❌ Invalid target. Use "next" or "later".\n\nExample: `/defer 1 next`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Try to find task by number or description
      const taskNumber = parseInt(taskInput);
      let task: Task | null = null;

      if (!isNaN(taskNumber)) {
        task = this.taskCache.getTaskByNumber(user.id!, taskNumber);
      }

      if (!task) {
        await ctx.reply(
          `❌ Task not found.\n\nUse /list to see task numbers (task numbers expire after 30 minutes).`
        );
        return;
      }

      const result = await this.scheduleTaskUseCase.defer(
        task.id,
        user.id!,
        target as 'next' | 'later'
      );

      if (result.success) {
        const emoji = target === 'next' ? '📅' : '🔮';
        await ctx.reply(
          `${emoji} **Task Deferred to ${target.toUpperCase()}**\n\n` +
          `📋 ${task.title}\n\n` +
          `The task has been moved to your ${target.toUpperCase()} list.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ Failed to defer task: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      console.error('Error in /defer command:', error);
      await ctx.reply('❌ Failed to defer task');
    }
  }

  private async handleScheduleTask(ctx: Context, text: string, user: User): Promise<void> {
    try {
      const args = text.split(' ').slice(1);

      if (args.length < 2) {
        await ctx.reply(
          '📅 **Schedule Task**\n\n' +
          'Usage: `/schedule [task-number] [now|next|later]`\n\n' +
          '**Examples:**\n' +
          '• `/schedule 1 now` - Add to NOW (today\'s focus)\n' +
          '• `/schedule 2 next` - Add to NEXT (upcoming)\n' +
          '• `/schedule 3 later` - Add to LATER (backlog)\n\n' +
          'Use /list to see task numbers.',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      const taskInput = args[0];
      const target = args[1].toLowerCase();

      if (target !== 'now' && target !== 'next' && target !== 'later') {
        await ctx.reply(
          '❌ Invalid target. Use "now", "next", or "later".\n\nExample: `/schedule 1 next`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Try to find task by number
      const taskNumber = parseInt(taskInput);
      let task: Task | null = null;

      if (!isNaN(taskNumber)) {
        task = this.taskCache.getTaskByNumber(user.id!, taskNumber);
      }

      if (!task) {
        await ctx.reply(
          `❌ Task not found.\n\nUse /list to see task numbers (task numbers expire after 30 minutes).`
        );
        return;
      }

      let scheduledDate: Date | undefined;
      if (target === 'now') {
        scheduledDate = new Date();
        scheduledDate.setHours(0, 0, 0, 0);
      } else if (target === 'next') {
        scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        scheduledDate.setHours(0, 0, 0, 0);
      }

      const result = await this.scheduleTaskUseCase.execute({
        taskId: task.id,
        userId: user.id!,
        gtdStatus: target as 'now' | 'next' | 'later',
        scheduledDate
      });

      if (result.success) {
        const emoji = target === 'now' ? '⚡' : target === 'next' ? '📅' : '🔮';
        await ctx.reply(
          `${emoji} **Task Scheduled as ${target.toUpperCase()}**\n\n` +
          `📋 ${task.title}\n\n` +
          `The task has been added to your ${target.toUpperCase()} list.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ Failed to schedule task: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      console.error('Error in /schedule command:', error);
      await ctx.reply('❌ Failed to schedule task');
    }
  }

  private async handleScheduleTaskNaturalLanguage(ctx: Context, processed: any, user: User): Promise<void> {
    try {
      const taskReference = processed.extractedData.taskReference;
      const gtdStatus = processed.extractedData.gtdStatus;

      if (!taskReference || !gtdStatus) {
        await ctx.reply(
          '🤔 I couldn\'t identify which task you want to schedule.\n\n' +
          'Try using: `/schedule [task-number] [now|next|later]`\n' +
          'Example: `/schedule 1 now`'
        );
        return;
      }

      // Find matching tasks
      const allTasks = await this.taskRepository.findAll({
        createdById: user.id!,
        limit: 100
      });

      // Search for tasks matching the reference
      const lowerRef = taskReference.toLowerCase();
      const matches = allTasks.filter(t => {
        const statusStr = typeof t.status === 'string' ? t.status : t.status.toString();
        if (statusStr === 'done' || statusStr === 'cancelled') return false;

        return t.title.toLowerCase().includes(lowerRef);
      });

      if (matches.length === 0) {
        await ctx.reply(
          `❌ I couldn't find any tasks matching "${taskReference}".\n\n` +
          `Use /list to see your tasks, then use:\n` +
          `\`/schedule [task-number] ${gtdStatus}\``
        );
        return;
      }

      if (matches.length > 1) {
        let response = `🤔 I found ${matches.length} tasks matching "${taskReference}":\n\n`;
        this.taskCache.setUserTasks(user.id!, matches);

        for (let i = 0; i < Math.min(matches.length, 5); i++) {
          response += `${i + 1}. ${matches[i].title}\n`;
        }

        response += `\n💡 Use: \`/schedule [number] ${gtdStatus}\``;

        await ctx.reply(response, { parse_mode: 'Markdown' });
        return;
      }

      // Single match - schedule it
      const task = matches[0];
      let scheduledDate: Date | undefined;

      if (gtdStatus === 'now') {
        scheduledDate = new Date();
        scheduledDate.setHours(0, 0, 0, 0);
      } else if (gtdStatus === 'next') {
        scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        scheduledDate.setHours(0, 0, 0, 0);
      }

      const result = await this.scheduleTaskUseCase.execute({
        taskId: task.id,
        userId: user.id!,
        gtdStatus,
        scheduledDate
      });

      if (result.success) {
        const emoji = gtdStatus === 'now' ? '⚡' : gtdStatus === 'next' ? '📅' : '🔮';
        await ctx.reply(
          `${emoji} **Task Scheduled as ${gtdStatus.toUpperCase()}**\n\n` +
          `📋 ${task.title}\n\n` +
          `The task has been added to your ${gtdStatus.toUpperCase()} list.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ Failed to schedule task: ${result.errors?.join(', ')}`);
      }
    } catch (error) {
      console.error('Error scheduling task via natural language:', error);
      await ctx.reply('❌ Failed to schedule task. Try using the command format instead.');
    }
  }

  private getPriorityEmoji(priority: Priority | string): string {
    // Handle both Priority objects and string values
    let priorityStr: string;
    if (typeof priority === 'string') {
      priorityStr = priority;
    } else {
      priorityStr = priority.toString();
    }

    switch (priorityStr.toLowerCase()) {
      case 'urgent': return '🔵';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
}