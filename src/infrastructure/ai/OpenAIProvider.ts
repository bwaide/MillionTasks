import OpenAI from 'openai';
import { AIProvider } from './AIService.js';
import { 
  ProcessedMessage, 
  ExtractedTaskData, 
  MessageIntent, 
  MessageContext 
} from '../../application/services/MessageProcessor.js';
import { Priority } from '../../domain/value-objects/Priority.js';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({ apiKey });
    this.model = options?.model || 'gpt-4';
  }

  async processMessage(message: string, context?: MessageContext): Promise<ProcessedMessage> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userPrompt = this.buildProcessingPrompt(message, context);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseProcessingResponse(content, message);
    } catch (error) {
      console.error('OpenAI processing failed:', error);
      throw error;
    }
  }

  async extractTaskData(message: string): Promise<ExtractedTaskData> {
    const systemPrompt = `You are a task extraction assistant. Extract task information from user messages.
    
    Return a JSON object with:
    - title: string (required, max 200 chars)
    - description: string (optional, detailed description)
    - priority: "low" | "medium" | "high" | "urgent" (optional)
    - dueDate: ISO date string (optional, only if explicitly mentioned)
    - tags: string[] (optional, hashtags or inferred categories)
    - assignee: string (optional, only if @mention or "for X" is used)
    
    Examples:
    "Fix the login bug #urgent #bug" -> {"title": "Fix the login bug", "priority": "urgent", "tags": ["urgent", "bug"]}
    "Call John tomorrow at 2pm" -> {"title": "Call John", "dueDate": "2024-01-15T14:00:00Z"}
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseTaskData(content);
    } catch (error) {
      console.error('OpenAI task extraction failed:', error);
      throw error;
    }
  }

  async classifyIntent(message: string): Promise<MessageIntent> {
    const systemPrompt = `You are an intent classifier for a task management system.
    
    Classify the user's intent from these options:
    - create_task: Creating a new task
    - update_task: Modifying an existing task
    - complete_task: Marking a task as done
    - delete_task: Removing a task
    - list_tasks: Showing tasks
    - assign_task: Assigning a task to someone
    - set_priority: Changing task priority
    - set_due_date: Setting or changing due date
    - add_tag: Adding tags to a task
    - remove_tag: Removing tags from a task
    - query_status: Asking about task status
    - help: Asking for help or commands
    - unknown: Unclear intent
    
    Return only the intent name, nothing else.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 50,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseIntent(content);
    } catch (error) {
      console.error('OpenAI intent classification failed:', error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1,
      });
      
      return !!response.choices[0];
    } catch {
      return false;
    }
  }

  private buildSystemPrompt(context?: MessageContext): string {
    let prompt = `You are an AI assistant for a task management system called MillionTasks.
    
    Your job is to process user messages and extract:
    1. Intent (what the user wants to do)
    2. Task data (title, description, priority, etc.)
    3. Confidence level (0-1)
    
    Guidelines:
    - Be concise and precise
    - Extract dates relative to current time
    - Infer priority from language (urgent, asap, important, etc.)
    - Extract hashtags as tags
    - Handle natural language flexibly`;

    if (context?.userPreferences?.timezone) {
      prompt += `\n\nUser timezone: ${context.userPreferences.timezone}`;
    }

    if (context?.userPreferences?.language) {
      prompt += `\nUser language: ${context.userPreferences.language}`;
    }

    return prompt;
  }

  private buildProcessingPrompt(message: string, context?: MessageContext): string {
    let prompt = `Process this message: "${message}"
    
    Return a JSON object with:
    {
      "intent": "create_task|update_task|complete_task|delete_task|list_tasks|assign_task|set_priority|set_due_date|add_tag|remove_tag|query_status|help|unknown",
      "extractedData": {
        "title": "string",
        "description": "string (optional)",
        "priority": "low|medium|high|urgent (optional)",
        "dueDate": "ISO date string (optional)",
        "tags": ["array of strings (optional)"],
        "assignee": "string (optional)"
      },
      "confidence": 0.8
    }`;

    if (context?.projectId) {
      prompt += `\n\nCurrent project: ${context.projectId}`;
    }

    return prompt;
  }

  private parseProcessingResponse(content: string, originalMessage: string): ProcessedMessage {
    try {
      const parsed = JSON.parse(content);
      
      return {
        intent: this.parseIntent(parsed.intent),
        extractedData: this.normalizeExtractedData(parsed.extractedData),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
        originalMessage,
      };
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      throw new Error('Invalid response format from AI');
    }
  }

  private parseTaskData(content: string): ExtractedTaskData {
    try {
      const parsed = JSON.parse(content);
      return this.normalizeExtractedData(parsed);
    } catch (error) {
      console.error('Failed to parse task data:', error);
      throw new Error('Invalid task data format from AI');
    }
  }

  private parseIntent(intentString: string): MessageIntent {
    const intent = intentString.toLowerCase().replace(/[^a-z_]/g, '');
    
    switch (intent) {
      case 'create_task': return MessageIntent.CREATE_TASK;
      case 'update_task': return MessageIntent.UPDATE_TASK;
      case 'complete_task': return MessageIntent.COMPLETE_TASK;
      case 'delete_task': return MessageIntent.DELETE_TASK;
      case 'list_tasks': return MessageIntent.LIST_TASKS;
      case 'assign_task': return MessageIntent.ASSIGN_TASK;
      case 'set_priority': return MessageIntent.SET_PRIORITY;
      case 'set_due_date': return MessageIntent.SET_DUE_DATE;
      case 'add_tag': return MessageIntent.ADD_TAG;
      case 'remove_tag': return MessageIntent.REMOVE_TAG;
      case 'query_status': return MessageIntent.QUERY_STATUS;
      case 'help': return MessageIntent.HELP;
      default: return MessageIntent.UNKNOWN;
    }
  }

  private normalizeExtractedData(data: any): ExtractedTaskData {
    const result: ExtractedTaskData = {
      title: this.normalizeTitle(data.title),
    };

    if (data.description) {
      result.description = String(data.description).trim();
    }

    if (data.priority) {
      try {
        result.priority = Priority.fromString(data.priority);
      } catch {
        // Invalid priority, ignore
      }
    }

    if (data.dueDate) {
      try {
        result.dueDate = new Date(data.dueDate);
      } catch {
        // Invalid date, ignore
      }
    }

    if (Array.isArray(data.tags)) {
      result.tags = data.tags
        .filter(tag => typeof tag === 'string')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
        .slice(0, 10);
    }

    if (data.assignee && typeof data.assignee === 'string') {
      result.assignee = data.assignee.trim();
    }

    if (data.projectHint && typeof data.projectHint === 'string') {
      result.projectHint = data.projectHint.trim();
    }

    return result;
  }

  private normalizeTitle(title: any): string {
    if (!title || typeof title !== 'string') {
      return 'Untitled task';
    }

    const normalized = title.trim();
    if (normalized.length === 0) {
      return 'Untitled task';
    }

    if (normalized.length > 200) {
      return normalized.substring(0, 200).trim();
    }

    return normalized;
  }
}