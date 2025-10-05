#!/usr/bin/env tsx

/**
 * Simple Telegram Bot Test
 * Tests basic bot connectivity with minimal complexity
 */

import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in .env');
    return;
  }

  console.log('🤖 Starting simple test bot...');
  
  const bot = new Telegraf(token);

  // Add basic command handlers
  bot.start((ctx) => {
    console.log('📨 Received /start from:', ctx.from?.username || ctx.from?.id);
    ctx.reply('👋 Hello! MillionTasks bot is working!\n\nTry these commands:\n• /help - Show help\n• /test - Test message');
  });

  bot.help((ctx) => {
    console.log('📨 Received /help from:', ctx.from?.username || ctx.from?.id);
    ctx.reply('🤖 MillionTasks Bot Help\n\nAvailable commands:\n• /start - Start the bot\n• /help - Show this help\n• /test - Test bot response\n\nYou can also send any text message!');
  });

  bot.command('test', (ctx) => {
    console.log('📨 Received /test from:', ctx.from?.username || ctx.from?.id);
    ctx.reply('✅ Bot is working! Your message was received.');
  });

  // Handle any text message
  bot.on('text', (ctx) => {
    const text = ctx.message.text;
    console.log('📨 Received text message:', text, 'from:', ctx.from?.username || ctx.from?.id);
    
    // Echo the message back
    ctx.reply(`You said: "${text}"\n\nIn the full app, I would process this as a task!`);
  });

  // Start bot with polling
  bot.launch();
  console.log('✅ Bot started with polling mode');
  console.log('📱 Send a message to your bot to test it!');

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(error => {
  console.error('❌ Bot failed to start:', error);
});