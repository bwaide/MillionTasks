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
    const taskReference = this.extractTaskReference(message);
    const gtdStatus = this.extractGTDStatus(message);

    return {
      title: cleanTitle,
      priority,
      tags,
      taskReference,
      gtdStatus,
    };
  }

  private classifyIntentFallback(message: string): MessageIntent {
    const lowerMessage = message.toLowerCase();

    // GTD intents (check first, more specific)
    if (this.containsScheduleNowKeywords(lowerMessage)) {
      return MessageIntent.SCHEDULE_TASK_NOW;
    }

    if (this.containsScheduleNextKeywords(lowerMessage)) {
      return MessageIntent.SCHEDULE_TASK_NEXT;
    }

    if (this.containsScheduleLaterKeywords(lowerMessage)) {
      return MessageIntent.SCHEDULE_TASK_LATER;
    }

    if (this.containsDeferKeywords(lowerMessage)) {
      return MessageIntent.DEFER_TASK;
    }

    if (this.containsListNowKeywords(lowerMessage)) {
      return MessageIntent.LIST_NOW_TASKS;
    }

    if (this.containsListNextKeywords(lowerMessage)) {
      return MessageIntent.LIST_NEXT_TASKS;
    }

    if (this.containsListLaterKeywords(lowerMessage)) {
      return MessageIntent.LIST_LATER_TASKS;
    }

    if (this.containsPickKeywords(lowerMessage)) {
      return MessageIntent.PICK_NOW_TASKS;
    }

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

  // GTD keyword detection helpers
  private containsScheduleNowKeywords(message: string): boolean {
    const hasScheduleWord = message.includes('schedule') || message.includes('set') || message.includes('add') || message.includes('move');
    const hasNowWord = message.includes('now') || message.includes('today') || message.includes('current');
    const hasTaskReference = message.includes('task') || message.includes('the ') || message.includes('this ');

    return hasScheduleWord && hasNowWord && hasTaskReference;
  }

  private containsScheduleNextKeywords(message: string): boolean {
    const hasScheduleWord = message.includes('schedule') || message.includes('set') || message.includes('add') || message.includes('move');
    const hasNextWord = message.includes('next') || message.includes('upcoming') || message.includes('soon');
    const hasTaskReference = message.includes('task') || message.includes('the ') || message.includes('this ');

    return hasScheduleWord && hasNextWord && hasTaskReference;
  }

  private containsScheduleLaterKeywords(message: string): boolean {
    const hasScheduleWord = message.includes('schedule') || message.includes('set') || message.includes('add') || message.includes('move');
    const hasLaterWord = message.includes('later') || message.includes('backlog') || message.includes('someday');
    const hasTaskReference = message.includes('task') || message.includes('the ') || message.includes('this ');

    return hasScheduleWord && hasLaterWord && hasTaskReference;
  }

  private containsDeferKeywords(message: string): boolean {
    const deferKeywords = ['defer', 'postpone', 'push back', 'delay'];
    return deferKeywords.some(keyword => message.includes(keyword));
  }

  private containsListNowKeywords(message: string): boolean {
    const hasListWord = message.includes('show') || message.includes('list') || message.includes('what') || message.includes('view');
    const hasNowWord = message.includes('now') || message.includes('today') || message.includes('current');

    return hasListWord && hasNowWord && message.includes('task');
  }

  private containsListNextKeywords(message: string): boolean {
    const hasListWord = message.includes('show') || message.includes('list') || message.includes('what') || message.includes('view');
    const hasNextWord = message.includes('next') || message.includes('upcoming');

    return hasListWord && hasNextWord && message.includes('task');
  }

  private containsListLaterKeywords(message: string): boolean {
    const hasListWord = message.includes('show') || message.includes('list') || message.includes('what') || message.includes('view');
    const hasLaterWord = message.includes('later') || message.includes('backlog') || message.includes('someday');

    return hasListWord && hasLaterWord && message.includes('task');
  }

  private containsPickKeywords(message: string): boolean {
    const pickKeywords = ['pick', 'select', 'choose', 'promote'];
    return pickKeywords.some(keyword => message.includes(keyword));
  }

  private extractTaskReference(message: string): string | undefined {
    // Remove schedule/gtd keywords to isolate task reference
    let taskRef = message
      .replace(/^(schedule|set|add|move|defer)\s+/i, '')
      .replace(/\s+(to|for|as)\s+(now|next|later|today|upcoming|backlog)\s*$/i, '')
      .replace(/^(the\s+)?(task\s+)?/i, '')
      .trim();

    // If we have a meaningful reference (not empty and not just keywords)
    if (taskRef && taskRef.length > 3 && !taskRef.match(/^(now|next|later|today)$/i)) {
      return taskRef;
    }

    return undefined;
  }

  private extractGTDStatus(message: string): 'now' | 'next' | 'later' | undefined {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('now') || lowerMessage.includes('today')) {
      return 'now';
    }

    if (lowerMessage.includes('next') || lowerMessage.includes('upcoming') || lowerMessage.includes('soon')) {
      return 'next';
    }

    if (lowerMessage.includes('later') || lowerMessage.includes('backlog') || lowerMessage.includes('someday')) {
      return 'later';
    }

    return undefined;
  }
}