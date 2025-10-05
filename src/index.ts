#!/usr/bin/env tsx

/**
 * MillionTasks Application Entry Point
 * Initializes and starts the complete system
 */

import { config, hasValidCredentials } from './config/index.js';
import { createClient } from '@supabase/supabase-js';
import { AIService } from './infrastructure/ai/AIService.js';
import { OpenAIProvider } from './infrastructure/ai/OpenAIProvider.js';
import { MessageProcessor } from './application/services/MessageProcessor.js';
import { TelegramBot } from './infrastructure/messaging/telegram/TelegramBot.js';
import { DatabaseConnectedHandler } from './infrastructure/messaging/telegram/DatabaseConnectedHandler.js';
// import { TelegramMessageHandler } from './infrastructure/messaging/telegram/TelegramMessageHandler.js';
// import { TelegramCommandHandlers } from './infrastructure/messaging/telegram/TelegramCommandHandlers.js';
import { SupabaseUserRepository } from './infrastructure/database/repositories/SupabaseUserRepository.js';
import { SupabaseTaskRepository } from './infrastructure/database/repositories/SupabaseTaskRepository.js';
import { SupabaseProjectRepository } from './infrastructure/database/repositories/SupabaseProjectRepository.js';
import { CreateTaskUseCase } from './application/use-cases/tasks/CreateTaskUseCase.js';
import { ListTasksUseCase } from './application/use-cases/tasks/ListTasksUseCase.js';
import { CompleteTaskUseCase } from './application/use-cases/tasks/CompleteTaskUseCase.js';
import { NotificationService, NotificationChannel } from './application/services/NotificationService.js';

async function main() {
  console.log('🚀 Starting MillionTasks...');
  
  // Validate configuration
  const credentials = hasValidCredentials();
  console.log('📋 Credential check:', {
    supabase: credentials.supabase ? '✅' : '❌',
    telegram: credentials.telegram ? '✅' : '❌',
    ai: credentials.ai ? '✅' : '❌'
  });

  if (!credentials.supabase) {
    console.error('❌ Supabase credentials missing. Please check your .env file.');
    process.exit(1);
  }

  if (!credentials.telegram) {
    console.error('❌ Telegram bot token missing. Please check your .env file.');
    process.exit(1);
  }

  if (!credentials.ai) {
    console.error('❌ AI service credentials missing. Please check your .env file.');
    process.exit(1);
  }

  try {
    // Initialize Supabase client
    console.log('🗄️  Connecting to database...');
    const supabase = createClient(
      config.database.supabase.url,
      config.database.supabase.serviceKey,
      {
        auth: { persistSession: false }
      }
    );

    // Test database connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('💡 Run database migrations: npm run db:migrate');
      process.exit(1);
    }
    console.log('✅ Database connected');

    // Initialize repositories
    const userRepository = new SupabaseUserRepository(supabase);
    const taskRepository = new SupabaseTaskRepository(supabase);
    const projectRepository = new SupabaseProjectRepository(supabase);

    // Initialize AI service
    console.log('🤖 Initializing AI service...');
    let aiProvider;
    
    if (config.ai.provider === 'openai') {
      aiProvider = new OpenAIProvider({
        apiKey: config.ai.openai!.apiKey,
        model: config.ai.openai!.model
      });
    } else {
      throw new Error('Anthropic provider not yet implemented. Please use OpenAI for now.');
    }

    const aiService = new AIService(aiProvider);
    
    // Test AI service
    const isAIHealthy = await aiService.isHealthy();
    if (!isAIHealthy) {
      console.error('❌ AI service health check failed');
      process.exit(1);
    }
    console.log('✅ AI service connected');

    // Initialize core services
    const messageProcessor = new MessageProcessor(aiService);
    const notificationService = new NotificationService();

    // Initialize use cases
    const createTaskUseCase = new CreateTaskUseCase(
      taskRepository,
      projectRepository,
      userRepository
    );
    const listTasksUseCase = new ListTasksUseCase(taskRepository, projectRepository);
    const completeTaskUseCase = new CompleteTaskUseCase(taskRepository);

    // Initialize Telegram bot
    console.log('📱 Initializing Telegram bot...');
    const telegramBot = new TelegramBot({
      token: config.messengers.telegram.token,
      polling: true, // Force polling for local development
      webhookUrl: undefined // Don't use webhook in development
    });

    // Register notification provider
    notificationService.registerProvider(NotificationChannel.TELEGRAM, telegramBot);

    // Initialize database-connected message handler
    const databaseHandler = new DatabaseConnectedHandler(
      userRepository,
      taskRepository,
      projectRepository,
      createTaskUseCase,
      listTasksUseCase,
      messageProcessor
    );
    
    // Register handler with bot
    telegramBot.addMessageHandler(databaseHandler);
    
    // TODO: Later integrate full message processing:
    // const messageHandler = new TelegramMessageHandler(
    //   messageProcessor,
    //   createTaskUseCase,
    //   listTasksUseCase,
    //   completeTaskUseCase,
    //   userRepository
    // );

    // Start the bot
    console.log('🎯 Starting Telegram bot...');
    await telegramBot.start();

    // Setup graceful shutdown
    telegramBot.setupGracefulShutdown();
    
    process.on('SIGINT', async () => {
      console.log('\\n👋 Shutting down gracefully...');
      await telegramBot.stop();
      process.exit(0);
    });

    console.log('\\n✅ MillionTasks is running!');
    console.log('📱 Send messages to your Telegram bot to get started');
    console.log('🛑 Press Ctrl+C to stop');

    // Keep the process alive
    if (config.server.nodeEnv === 'development') {
      console.log('🔄 Running in development mode with polling');
    } else {
      console.log(`🌐 Webhook URL: ${config.messengers.telegram.webhookUrl}`);
    }

  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});