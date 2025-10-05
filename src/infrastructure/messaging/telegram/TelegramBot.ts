import { Telegraf, Context, NarrowedContext } from 'telegraf';
import { Update, Message } from 'telegraf/typings/core/types/typegram';
import { 
  INotificationProvider, 
  NotificationMessage, 
  NotificationChannel 
} from '@application/services/NotificationService.js';

export type TelegramContext = NarrowedContext<Context<Update>, Update.MessageUpdate<Message.TextMessage>>;

export interface TelegramBotConfig {
  token: string;
  webhookUrl?: string;
  polling?: boolean;
}

export interface MessageHandler {
  handle(ctx: TelegramContext): Promise<void>;
}

export interface CommandHandler {
  command: string;
  description: string;
  handle(ctx: TelegramContext): Promise<void>;
}

export class TelegramBot implements INotificationProvider {
  private bot: Telegraf;
  private messageHandlers: MessageHandler[] = [];
  private commandHandlers: Map<string, CommandHandler> = new Map();

  constructor(private config: TelegramBotConfig) {
    this.bot = new Telegraf(config.token);
    this.setupMiddleware();
  }

  // Notification Provider Implementation
  async send(message: NotificationMessage): Promise<void> {
    try {
      const telegramId = this.extractTelegramId(message.recipient);
      if (!telegramId) {
        throw new Error('No Telegram ID found for user');
      }

      const formattedMessage = this.formatNotificationMessage(message);
      await this.bot.telegram.sendMessage(telegramId, formattedMessage, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
      throw error;
    }
  }

  supports(channel: NotificationChannel): boolean {
    return channel === NotificationChannel.TELEGRAM;
  }

  // Bot Management
  async start(): Promise<void> {
    console.log('Setting up command handlers...');
    this.setupCommandHandlers();
    console.log('Setting up message handlers...');
    this.setupMessageHandlers();
    
    if (this.config.webhookUrl) {
      await this.bot.telegram.setWebhook(this.config.webhookUrl);
      console.log(`Telegram webhook set to: ${this.config.webhookUrl}`);
    } else if (this.config.polling) {
      console.log('Launching bot with polling...');
      this.bot.launch();  // Remove await - launch() doesn't need to be awaited
      console.log('✅ Telegram bot started with polling');
    } else {
      throw new Error('Either webhookUrl or polling must be configured');
    }
  }

  async stop(): Promise<void> {
    if (this.config.webhookUrl) {
      await this.bot.telegram.deleteWebhook();
    }
    this.bot.stop();
    console.log('Telegram bot stopped');
  }

  // Handler Registration
  addMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  addCommandHandler(handler: CommandHandler): void {
    this.commandHandlers.set(handler.command, handler);
  }

  // Utility Methods
  async sendMessage(
    chatId: number | string, 
    text: string, 
    options?: {
      parseMode?: 'HTML' | 'Markdown';
      replyMarkup?: any;
      disableWebPagePreview?: boolean;
    }
  ): Promise<Message.TextMessage> {
    return await this.bot.telegram.sendMessage(chatId, text, {
      parse_mode: options?.parseMode || 'HTML',
      reply_markup: options?.replyMarkup,
      disable_web_page_preview: options?.disableWebPagePreview ?? true,
    });
  }

  async editMessage(
    chatId: number | string,
    messageId: number,
    text: string,
    options?: {
      parseMode?: 'HTML' | 'Markdown';
      replyMarkup?: any;
    }
  ): Promise<boolean> {
    try {
      await this.bot.telegram.editMessageText(chatId, messageId, undefined, text, {
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
      });
      return true;
    } catch (error) {
      console.error('Failed to edit message:', error);
      return false;
    }
  }

  async deleteMessage(chatId: number | string, messageId: number): Promise<boolean> {
    try {
      await this.bot.telegram.deleteMessage(chatId, messageId);
      return true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  }

  // Keyboard Helpers
  createInlineKeyboard(buttons: Array<Array<{ text: string; callback_data: string }>>): any {
    return {
      inline_keyboard: buttons,
    };
  }

  createReplyKeyboard(
    buttons: Array<Array<string>>, 
    options?: { resize?: boolean; oneTime?: boolean; selective?: boolean }
  ): any {
    return {
      keyboard: buttons.map(row => row.map(text => ({ text }))),
      resize_keyboard: options?.resize ?? true,
      one_time_keyboard: options?.oneTime ?? false,
      selective: options?.selective ?? false,
    };
  }

  removeKeyboard(): any {
    return { remove_keyboard: true };
  }

  // Private Methods
  private setupMiddleware(): void {
    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Telegram bot error:', err);
      ctx.reply('Sorry, something went wrong. Please try again.').catch(console.error);
    });

    // Logging middleware
    this.bot.use(async (ctx, next) => {
      const start = Date.now();
      
      console.log('Incoming update:', {
        updateId: ctx.update.update_id,
        type: this.getUpdateType(ctx.update),
        from: ctx.from?.username || ctx.from?.first_name,
        chat: ctx.chat?.type,
      });

      await next();

      const duration = Date.now() - start;
      console.log(`Processed update ${ctx.update.update_id} in ${duration}ms`);
    });
  }

  private setupCommandHandlers(): void {
    // Register dynamic command handlers
    for (const [command, handler] of this.commandHandlers) {
      this.bot.command(command, async (ctx) => {
        try {
          await handler.handle(ctx as TelegramContext);
        } catch (error) {
          console.error(`Error handling command /${command}:`, error);
          await ctx.reply('Sorry, there was an error processing your command.');
        }
      });
    }

    // Handle callback queries (inline keyboard presses)
    this.bot.on('callback_query', async (ctx) => {
      try {
        await ctx.answerCbQuery();
        // Delegate to appropriate handler based on callback_data
        const data = ctx.callbackQuery.data;
        if (data) {
          await this.handleCallbackQuery(ctx, data);
        }
      } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCbQuery('Error processing your request');
      }
    });
  }

  private setupMessageHandlers(): void {
    this.bot.on('text', async (ctx) => {
      try {
        // Process through all message handlers
        for (const handler of this.messageHandlers) {
          await handler.handle(ctx);
        }
      } catch (error) {
        console.error('Error handling text message:', error);
        await ctx.reply('Sorry, I couldn\'t process your message. Please try again.');
      }
    });
  }

  private async handleCallbackQuery(ctx: any, data: string): Promise<void> {
    // Parse callback data and route to appropriate handler
    const [action, ...params] = data.split(':');
    
    switch (action) {
      case 'task_complete':
        await this.handleTaskComplete(ctx, params[0]);
        break;
      case 'task_edit':
        await this.handleTaskEdit(ctx, params[0]);
        break;
      case 'project_join':
        await this.handleProjectJoin(ctx, params[0]);
        break;
      default:
        await ctx.editMessageText('Unknown action');
    }
  }

  private async handleTaskComplete(ctx: any, taskId: string): Promise<void> {
    // This would be implemented by the application layer
    await ctx.editMessageText(`Task ${taskId} marked as complete! ✅`);
  }

  private async handleTaskEdit(ctx: any, taskId: string): Promise<void> {
    // This would be implemented by the application layer
    await ctx.editMessageText(`Editing task ${taskId}...`);
  }

  private async handleProjectJoin(ctx: any, projectId: string): Promise<void> {
    // This would be implemented by the application layer
    await ctx.editMessageText(`Joining project ${projectId}...`);
  }

  private extractTelegramId(user: any): string | null {
    // Extract Telegram ID from user entity
    return user.telegramId || null;
  }

  private formatNotificationMessage(message: NotificationMessage): string {
    let formatted = `<b>${message.title}</b>\n\n${message.content}`;

    // Add priority indicator
    switch (message.priority) {
      case 'urgent':
        formatted = `🚨 ${formatted}`;
        break;
      case 'high':
        formatted = `⚠️ ${formatted}`;
        break;
      case 'medium':
        formatted = `📌 ${formatted}`;
        break;
      case 'low':
        formatted = `ℹ️ ${formatted}`;
        break;
    }

    return formatted;
  }

  private getUpdateType(update: Update): string {
    if ('message' in update) return 'message';
    if ('callback_query' in update) return 'callback_query';
    if ('inline_query' in update) return 'inline_query';
    if ('chosen_inline_result' in update) return 'chosen_inline_result';
    if ('edited_message' in update) return 'edited_message';
    return 'unknown';
  }

  // Webhook support for Express.js
  getWebhookHandler() {
    return this.bot.webhookCallback('/webhook/telegram');
  }

  // Graceful shutdown
  setupGracefulShutdown(): void {
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
  }
}