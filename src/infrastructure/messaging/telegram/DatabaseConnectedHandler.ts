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
import { MessageProcessor } from '../../../application/services/MessageProcessor.js';
import { User } from '../../../domain/entities/User.js';
import { Project } from '../../../domain/entities/Project.js';
import { Priority } from '../../../domain/value-objects/Priority.js';

export class DatabaseConnectedHandler implements MessageHandler {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly listTasksUseCase: ListTasksUseCase,
    private readonly messageProcessor: MessageProcessor
  ) {}

  async handle(ctx: Context): Promise<void> {
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
        await this.handleCreateTask(ctx, text, user);
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
      `**Bot Commands:**\n` +
      `/start - Initialize your account\n` +
      `/help - Show this help\n` +
      `/list - Show your tasks\n` +
      `/projects - Show your projects\n` +
      `/create <text> - Create a task\n\n` +
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

      for (const [projectId, tasks] of tasksByProject) {
        // Get project name
        const project = await this.projectRepository.findById(projectId);
        const projectName = project?.name || 'No Project';
        
        response += `📁 **${projectName}**\n`;
        
        for (const task of tasks) {
          const statusStr = typeof task.status === 'string' ? task.status : task.status.toString();
          const status = (statusStr === 'done' || statusStr === 'completed') ? '✅' : '⏳';
          const priority = this.getPriorityEmoji(task.priority);
          response += `${status} ${priority} ${task.title}`;
          
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            response += ` (Due: ${dueDate.toLocaleDateString()})`;
          }
          
          response += '\n';
        }
        response += '\n';
      }

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