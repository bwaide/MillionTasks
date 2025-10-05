/**
 * Simple Telegram Handler
 * Handles basic bot commands and messages
 */

import { Context } from 'telegraf';
import { MessageHandler } from './TelegramBot.js';

export class SimpleTelegramHandler implements MessageHandler {
  async handle(ctx: Context): Promise<void> {
    // Check if it's a text message
    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    const text = ctx.message.text;
    const userId = ctx.from?.id;
    const username = ctx.from?.username || ctx.from?.first_name || 'User';

    console.log(`📨 Message from ${username} (${userId}): ${text}`);

    // Handle commands
    if (text.startsWith('/')) {
      await this.handleCommand(ctx, text);
    } else {
      // Handle natural language
      await this.handleNaturalLanguage(ctx, text);
    }
  }

  private async handleCommand(ctx: Context, text: string): Promise<void> {
    const command = text.split(' ')[0].toLowerCase();
    
    switch (command) {
      case '/start':
        await ctx.reply(
          `👋 Welcome to MillionTasks!\n\n` +
          `I'm your AI-powered task manager. I understand natural language, so you can just tell me what you need to do.\n\n` +
          `Try saying:\n` +
          `• "Create a task to call John tomorrow"\n` +
          `• "What do I have today?"\n` +
          `• "Mark grocery shopping as done"\n\n` +
          `Let's get started! What would you like to do?`
        );
        break;

      case '/help':
        await ctx.reply(
          `🤖 MillionTasks Help\n\n` +
          `**Natural Language Commands:**\n` +
          `Just type what you want to do!\n\n` +
          `Examples:\n` +
          `• "Add task: Review quarterly report"\n` +
          `• "Meeting with Sarah at 3pm tomorrow"\n` +
          `• "Show my tasks"\n` +
          `• "Complete task #1"\n\n` +
          `**Bot Commands:**\n` +
          `/start - Start the bot\n` +
          `/help - Show this help\n` +
          `/list - Show your tasks\n` +
          `/projects - Show your projects\n\n` +
          `Just send me a message and I'll help you manage your tasks!`
        );
        break;

      case '/list':
        await ctx.reply(
          `📋 Your Tasks\n\n` +
          `You don't have any tasks yet. Try creating one by saying:\n` +
          `"Create a task to buy groceries"`
        );
        break;

      case '/projects':
        await ctx.reply(
          `📁 Your Projects\n\n` +
          `• Personal (default)\n` +
          `• Work\n\n` +
          `To switch projects, say "switch to Work project"`
        );
        break;

      default:
        await ctx.reply(`❓ Unknown command: ${command}\n\nType /help to see available commands.`);
    }
  }

  private async handleNaturalLanguage(ctx: Context, text: string): Promise<void> {
    // For now, just acknowledge the message
    await ctx.reply(
      `📝 I received your message: "${text}"\n\n` +
      `In the full version, I would:\n` +
      `1. Use AI to understand your intent\n` +
      `2. Extract task details\n` +
      `3. Create or manage your tasks\n\n` +
      `For now, try these commands:\n` +
      `/help - See what I can do\n` +
      `/list - Show your tasks`
    );
  }
}