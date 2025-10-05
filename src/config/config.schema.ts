/**
 * Configuration Schema
 * Validates and types all configuration values
 */

export interface DatabaseConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
}

export interface MessengerConfig {
  telegram: {
    enabled: boolean;
    token: string;
    webhookSecret?: string;
    webhookUrl?: string;
  };
  signal?: {
    enabled: boolean;
    phoneNumber: string;
    password: string;
  };
  slack?: {
    enabled: boolean;
    botToken: string;
    appToken: string;
    signingSecret: string;
  };
}

export interface AIConfig {
  provider: 'anthropic' | 'openai';
  anthropic?: {
    apiKey: string;
    model: string;
  };
  openai?: {
    apiKey: string;
    model: string;
  };
  maxTokens: number;
  temperature: number;
  intentConfidenceThreshold: number;
}

export interface ServerConfig {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  host: string;
  apiPrefix: string;
  apiVersion: string;
}

export interface FeaturesConfig {
  naturalLanguage: boolean;
  commandFallback: boolean;
  autoReminders: boolean;
  timezoneDetection: boolean;
  voiceMessages: boolean;
  recurringTasks: boolean;
}

export interface NotificationConfig {
  defaultReminderMinutes: number;
  dailySummaryTime: string;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  sentryDsn?: string;
}

export interface SecurityConfig {
  sessionSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsOrigin?: string;
}

export interface AppConfig {
  database: DatabaseConfig;
  messengers: MessengerConfig;
  ai: AIConfig;
  server: ServerConfig;
  features: FeaturesConfig;
  notifications: NotificationConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
}

/**
 * Default configuration values
 */
export const defaultConfig: Partial<AppConfig> = {
  server: {
    nodeEnv: 'development',
    port: 3000,
    host: 'localhost',
    apiPrefix: '/api',
    apiVersion: 'v1'
  },
  features: {
    naturalLanguage: true,
    commandFallback: true,
    autoReminders: true,
    timezoneDetection: true,
    voiceMessages: false,
    recurringTasks: false
  },
  ai: {
    provider: 'anthropic',
    maxTokens: 500,
    temperature: 0.3,
    intentConfidenceThreshold: 0.7
  },
  notifications: {
    defaultReminderMinutes: 15,
    dailySummaryTime: '09:00'
  },
  logging: {
    level: 'info'
  },
  security: {
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100
  }
};