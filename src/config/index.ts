/**
 * Configuration loader
 * Loads and validates configuration from environment variables
 */

import * as dotenv from 'dotenv';
import { AppConfig, defaultConfig } from './config.schema';

// Load environment variables
dotenv.config();

/**
 * Validates that required environment variables are set
 */
function validateRequiredEnvVars(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`);
    console.warn('   Please copy .env.example to .env and fill in the values');
    
    // Don't exit in development, just warn
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

/**
 * Loads configuration from environment variables
 */
export function loadConfig(): AppConfig {
  validateRequiredEnvVars();

  const config: AppConfig = {
    database: {
      supabase: {
        url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || 'placeholder-service-key',
      }
    },
    messengers: {
      telegram: {
        enabled: process.env.TELEGRAM_BOT_TOKEN ? true : false,
        token: process.env.TELEGRAM_BOT_TOKEN || 'placeholder-telegram-token',
        webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET,
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      }
    },
    ai: {
      provider: (process.env.AI_PROVIDER as 'anthropic' | 'openai') || 'anthropic',
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder-anthropic-key',
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'placeholder-openai-key',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      },
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500'),
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
      intentConfidenceThreshold: parseFloat(process.env.AI_INTENT_CONFIDENCE_THRESHOLD || '0.7'),
    },
    server: {
      nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || 'localhost',
      apiPrefix: process.env.API_PREFIX || '/api',
      apiVersion: process.env.API_VERSION || 'v1',
    },
    features: {
      naturalLanguage: process.env.ENABLE_NATURAL_LANGUAGE !== 'false',
      commandFallback: process.env.ENABLE_COMMAND_FALLBACK !== 'false',
      autoReminders: process.env.ENABLE_AUTO_REMINDERS !== 'false',
      timezoneDetection: process.env.ENABLE_TIMEZONE_DETECTION !== 'false',
      voiceMessages: process.env.ENABLE_VOICE_MESSAGES === 'true',
      recurringTasks: process.env.ENABLE_RECURRING_TASKS === 'true',
    },
    notifications: {
      defaultReminderMinutes: parseInt(process.env.DEFAULT_REMINDER_MINUTES || '15'),
      dailySummaryTime: process.env.DAILY_SUMMARY_TIME || '09:00',
    },
    logging: {
      level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' | 'trace') || 'info',
      sentryDsn: process.env.SENTRY_DSN,
    },
    security: {
      sessionSecret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
      rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      corsOrigin: process.env.CORS_ORIGIN,
    }
  };

  return { ...defaultConfig, ...config };
}

// Export singleton config instance
export const config = loadConfig();

// Helper function to check if we have valid credentials
export function hasValidCredentials(): {
  supabase: boolean;
  telegram: boolean;
  ai: boolean;
} {
  return {
    supabase: !config.database.supabase.url.includes('placeholder'),
    telegram: !config.messengers.telegram.token.includes('placeholder'),
    ai: config.ai.provider === 'anthropic' 
      ? !config.ai.anthropic!.apiKey.includes('placeholder')
      : !config.ai.openai!.apiKey.includes('placeholder')
  };
}