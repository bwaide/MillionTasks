import { Task } from '@domain/entities/Task.js';
import { Priority } from '@domain/value-objects/Priority.js';
import { TaskStatus } from '@domain/value-objects/TaskStatus.js';

export interface ProcessedMessage {
  intent: MessageIntent;
  extractedData: ExtractedTaskData;
  confidence: number;
  originalMessage: string;
}

export interface ExtractedTaskData {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
  tags?: string[];
  assignee?: string;
  projectHint?: string;
}

export enum MessageIntent {
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  COMPLETE_TASK = 'complete_task',
  DELETE_TASK = 'delete_task',
  LIST_TASKS = 'list_tasks',
  ASSIGN_TASK = 'assign_task',
  SET_PRIORITY = 'set_priority',
  SET_DUE_DATE = 'set_due_date',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
  QUERY_STATUS = 'query_status',
  HELP = 'help',
  UNKNOWN = 'unknown',
}

export interface IAIService {
  processMessage(message: string, context?: MessageContext): Promise<ProcessedMessage>;
  extractTaskData(message: string): Promise<ExtractedTaskData>;
  classifyIntent(message: string): Promise<MessageIntent>;
}

export interface MessageContext {
  userId: string;
  projectId?: string;
  conversationHistory?: string[];
  userPreferences?: {
    timezone: string;
    language: string;
  };
}

export class MessageProcessor {
  constructor(private readonly aiService: IAIService) {}

  async processUserMessage(
    message: string,
    context: MessageContext
  ): Promise<ProcessedMessage> {
    try {
      // Preprocess the message
      const cleanedMessage = this.preprocessMessage(message);
      
      // Use AI service to process the message
      const processedMessage = await this.aiService.processMessage(cleanedMessage, context);
      
      // Post-process and validate the result
      return this.postProcessMessage(processedMessage, context);
    } catch (error) {
      console.error('Error processing message:', error);
      return this.createUnknownIntentResponse(message);
    }
  }

  async extractTaskFromMessage(
    message: string,
    context: MessageContext
  ): Promise<ExtractedTaskData> {
    try {
      const extractedData = await this.aiService.extractTaskData(message);
      return this.validateAndEnhanceTaskData(extractedData, context);
    } catch (error) {
      console.error('Error extracting task data:', error);
      throw new Error('Failed to extract task information from message');
    }
  }

  async classifyUserIntent(message: string): Promise<MessageIntent> {
    try {
      return await this.aiService.classifyIntent(message);
    } catch (error) {
      console.error('Error classifying intent:', error);
      return MessageIntent.UNKNOWN;
    }
  }

  private preprocessMessage(message: string): string {
    // Clean up common message artifacts
    return message
      .trim()
      .replace(/^\//g, '') // Remove leading slashes (bot commands)
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-_.,!?@#$%&*()]/g, ''); // Remove special characters except common ones
  }

  private postProcessMessage(
    processedMessage: ProcessedMessage,
    context: MessageContext
  ): ProcessedMessage {
    // Enhance extracted data with context
    const enhancedData = this.enhanceWithContext(processedMessage.extractedData, context);
    
    return {
      ...processedMessage,
      extractedData: enhancedData,
    };
  }

  private enhanceWithContext(
    data: ExtractedTaskData,
    context: MessageContext
  ): ExtractedTaskData {
    const enhanced = { ...data };

    // Apply user timezone for due dates
    if (enhanced.dueDate && context.userPreferences?.timezone) {
      enhanced.dueDate = this.adjustDateToTimezone(enhanced.dueDate, context.userPreferences.timezone);
    }

    // Add project context if available
    if (context.projectId && !enhanced.projectHint) {
      enhanced.projectHint = context.projectId;
    }

    return enhanced;
  }

  private validateAndEnhanceTaskData(
    data: ExtractedTaskData,
    context: MessageContext
  ): ExtractedTaskData {
    // Validate required fields
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    // Ensure title is not too long
    if (data.title.length > 500) {
      data.title = data.title.substring(0, 500);
    }

    // Validate and normalize priority
    if (data.priority && !this.isValidPriority(data.priority)) {
      data.priority = Priority.MEDIUM;
    }

    // Validate due date
    if (data.dueDate && data.dueDate < new Date()) {
      // If due date is in the past, assume it's for tomorrow at the same time
      const tomorrow = new Date(data.dueDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      data.dueDate = tomorrow;
    }

    // Clean and validate tags
    if (data.tags) {
      data.tags = data.tags
        .filter(tag => tag.trim().length > 0)
        .map(tag => tag.trim().toLowerCase())
        .slice(0, 10); // Limit to 10 tags
    }

    return data;
  }

  private isValidPriority(priority: Priority): boolean {
    return Priority.getAllPriorities().some(p => p.equals(priority));
  }

  private adjustDateToTimezone(date: Date, timezone: string): Date {
    try {
      // Simple timezone adjustment - in production, use a proper timezone library
      const utcDate = new Date(date.toISOString());
      return utcDate;
    } catch (error) {
      console.warn('Failed to adjust timezone, using original date');
      return date;
    }
  }

  private createUnknownIntentResponse(message: string): ProcessedMessage {
    return {
      intent: MessageIntent.UNKNOWN,
      extractedData: {
        title: message,
      },
      confidence: 0,
      originalMessage: message,
    };
  }

  // Helper methods for intent-specific processing
  isTaskCreationIntent(intent: MessageIntent): boolean {
    return intent === MessageIntent.CREATE_TASK;
  }

  isTaskModificationIntent(intent: MessageIntent): boolean {
    return [
      MessageIntent.UPDATE_TASK,
      MessageIntent.COMPLETE_TASK,
      MessageIntent.ASSIGN_TASK,
      MessageIntent.SET_PRIORITY,
      MessageIntent.SET_DUE_DATE,
      MessageIntent.ADD_TAG,
      MessageIntent.REMOVE_TAG,
    ].includes(intent);
  }

  isQueryIntent(intent: MessageIntent): boolean {
    return [
      MessageIntent.LIST_TASKS,
      MessageIntent.QUERY_STATUS,
    ].includes(intent);
  }

  requiresHighConfidence(intent: MessageIntent): boolean {
    return [
      MessageIntent.DELETE_TASK,
      MessageIntent.COMPLETE_TASK,
    ].includes(intent);
  }
}