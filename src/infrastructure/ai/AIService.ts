import { 
  IAIService, 
  ProcessedMessage, 
  ExtractedTaskData, 
  MessageIntent, 
  MessageContext 
} from '../../application/services/MessageProcessor.js';
import { Priority } from '../../domain/value-objects/Priority.js';
import { TaskStatus } from '../../domain/value-objects/TaskStatus.js';

export interface AIProvider {
  processMessage(message: string, context?: MessageContext): Promise<ProcessedMessage>;
  extractTaskData(message: string): Promise<ExtractedTaskData>;
  classifyIntent(message: string): Promise<MessageIntent>;
  isHealthy(): Promise<boolean>;
}

export class AIService implements IAIService {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async processMessage(message: string, context?: MessageContext): Promise<ProcessedMessage> {
    try {
      return await this.provider.processMessage(message, context);
    } catch (error) {
      console.error('AI processing failed:', error);
      return this.createFallbackResponse(message);
    }
  }

  async extractTaskData(message: string): Promise<ExtractedTaskData> {
    try {
      return await this.provider.extractTaskData(message);
    } catch (error) {
      console.error('Task extraction failed:', error);
      return this.createFallbackTaskData(message);
    }
  }

  async classifyIntent(message: string): Promise<MessageIntent> {
    try {
      return await this.provider.classifyIntent(message);
    } catch (error) {
      console.error('Intent classification failed:', error);
      return this.classifyIntentFallback(message);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      return await this.provider.isHealthy();
    } catch {
      return false;
    }
  }

  private createFallbackResponse(message: string): ProcessedMessage {
    return {
      intent: this.classifyIntentFallback(message),
      extractedData: this.createFallbackTaskData(message),
      confidence: 0.3, // Low confidence for fallback
      originalMessage: message,
    };
  }

  private createFallbackTaskData(message: string): ExtractedTaskData {
    const cleanTitle = this.extractTitleFromMessage(message);
    const priority = this.extractPriorityFromMessage(message);
    const tags = this.extractTagsFromMessage(message);

    return {
      title: cleanTitle,
      priority,
      tags,
    };
  }

  private classifyIntentFallback(message: string): MessageIntent {
    const lowerMessage = message.toLowerCase();

    // Simple rule-based classification
    if (this.containsCreateKeywords(lowerMessage)) {
      return MessageIntent.CREATE_TASK;
    }
    
    if (this.containsCompleteKeywords(lowerMessage)) {
      return MessageIntent.COMPLETE_TASK;
    }
    
    if (this.containsListKeywords(lowerMessage)) {
      return MessageIntent.LIST_TASKS;
    }
    
    if (this.containsUpdateKeywords(lowerMessage)) {
      return MessageIntent.UPDATE_TASK;
    }
    
    if (this.containsDeleteKeywords(lowerMessage)) {
      return MessageIntent.DELETE_TASK;
    }
    
    if (this.containsAssignKeywords(lowerMessage)) {
      return MessageIntent.ASSIGN_TASK;
    }
    
    if (this.containsHelpKeywords(lowerMessage)) {
      return MessageIntent.HELP;
    }

    // Default to create task for most messages
    return MessageIntent.CREATE_TASK;
  }

  private extractTitleFromMessage(message: string): string {
    // Remove common command prefixes and clean up
    let title = message
      .replace(/^(create|add|new|todo|task)\s+/i, '')
      .replace(/^(complete|done|finish)\s+/i, '')
      .replace(/^(update|edit|modify)\s+/i, '')
      .replace(/^(delete|remove)\s+/i, '')
      .trim();

    // Limit title length
    if (title.length > 200) {
      title = title.substring(0, 200).trim();
    }

    return title || 'New task';
  }

  private extractPriorityFromMessage(message: string): Priority | undefined {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('urgent') || lowerMessage.includes('emergency') || lowerMessage.includes('asap')) {
      return Priority.URGENT;
    }
    
    if (lowerMessage.includes('high priority') || lowerMessage.includes('important')) {
      return Priority.HIGH;
    }
    
    if (lowerMessage.includes('low priority') || lowerMessage.includes('when you can')) {
      return Priority.LOW;
    }

    return Priority.MEDIUM;
  }

  private extractTagsFromMessage(message: string): string[] {
    const tags: string[] = [];
    
    // Look for hashtags
    const hashtagMatches = message.match(/#(\w+)/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.substring(1).toLowerCase()));
    }
    
    // Look for common categories
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('bug') || lowerMessage.includes('fix')) {
      tags.push('bug');
    }
    if (lowerMessage.includes('feature') || lowerMessage.includes('new')) {
      tags.push('feature');
    }
    if (lowerMessage.includes('meeting') || lowerMessage.includes('call')) {
      tags.push('meeting');
    }
    if (lowerMessage.includes('review') || lowerMessage.includes('check')) {
      tags.push('review');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  // Keyword detection helpers
  private containsCreateKeywords(message: string): boolean {
    const createKeywords = ['create', 'add', 'new', 'make', 'todo', 'task', 'remind me to'];
    return createKeywords.some(keyword => message.includes(keyword));
  }

  private containsCompleteKeywords(message: string): boolean {
    const completeKeywords = ['complete', 'done', 'finish', 'finished', 'completed', 'close'];
    return completeKeywords.some(keyword => message.includes(keyword));
  }

  private containsListKeywords(message: string): boolean {
    const listKeywords = ['list', 'show', 'tasks', 'what do i have', 'my tasks', 'todo list'];
    return listKeywords.some(keyword => message.includes(keyword));
  }

  private containsUpdateKeywords(message: string): boolean {
    const updateKeywords = ['update', 'edit', 'modify', 'change', 'set priority', 'set due date'];
    return updateKeywords.some(keyword => message.includes(keyword));
  }

  private containsDeleteKeywords(message: string): boolean {
    const deleteKeywords = ['delete', 'remove', 'cancel', 'drop'];
    return deleteKeywords.some(keyword => message.includes(keyword));
  }

  private containsAssignKeywords(message: string): boolean {
    const assignKeywords = ['assign', 'give to', 'assign to', 'for'];
    return assignKeywords.some(keyword => message.includes(keyword));
  }

  private containsHelpKeywords(message: string): boolean {
    const helpKeywords = ['help', 'how', 'what can you do', 'commands', '?'];
    return helpKeywords.some(keyword => message.includes(keyword));
  }
}