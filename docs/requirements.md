# MillionTasks
## Your AI-Powered Task Manager That Lives in Your Messenger

### What is MillionTasks?

MillionTasks is an intelligent task management system that works entirely through messaging apps - no new software to install, no new interfaces to learn. Simply chat with it like you would with a colleague, and it understands what you need to do, when, and with whom.

### The Problem We're Solving

Task management apps are everywhere, but they all require you to:
- Download yet another app
- Learn another interface  
- Remember to open it regularly
- Manually input tasks in specific formats
- Switch contexts from where you're already communicating

Meanwhile, you're already spending your day in WhatsApp, Telegram, Slack, or Signal. That's where your tasks originate - in conversations with colleagues, family, and friends. Why not manage them there too?

### How It Works

Simply message MillionTasks in natural language:
- "Meeting with Sarah tomorrow at 3pm about the budget"
- "Buy milk on the way home"
- "Check with team about deployment status"
- "What do I need to do today?"

The AI understands your intent, manages your tasks, sends reminders, and keeps you organized - all through the messaging app you already use daily.

### Key Features

**Natural Language Processing**
No commands to memorize. Just write what you're thinking, and MillionTasks understands whether you're adding a task, asking for your schedule, or marking something complete.

**Multi-Messenger Support**
Start with Telegram, expand to Signal, Slack, or any messaging platform. Your tasks follow you wherever you communicate.

**Smart Collaboration**
Share projects with others using simple commands. Team members can view tasks, mark them complete, or add new ones based on permissions you set - all without leaving their messenger.

**Context-Aware AI**
MillionTasks remembers your active project, understands relative dates ("tomorrow", "next Monday"), and learns your patterns over time.

**Zero Friction**
No login screens. No app switching. No synchronization issues. If you can send a message, you can manage your tasks.

### Use Cases

**Personal Productivity**
- Shopping lists shared with family
- Personal reminders and appointments
- Home project management

**Small Team Coordination**
- Startup task tracking
- Event planning with friends
- Family chore distribution

**Professional Quick Capture**
- Meeting action items
- Ideas on the go
- Follow-up reminders

### Why "MillionTasks"?

The name reflects our vision: whether you have a million tasks or just a few important ones, they should be as easy to manage as sending a message. Part of the MillionBrains ecosystem, MillionTasks brings AI-powered productivity to where you already are.

### Technical Foundation

Built on modern, scalable infrastructure:
- Supabase for reliable data storage
- AI-powered intent recognition
- Messenger-agnostic architecture
- Privacy-first design
- Open API for future extensions

### Vision

MillionTasks isn't trying to replace complex project management tools. It's designed for the 90% of tasks that just need to be captured, tracked, and completed. By living where you already communicate, it ensures nothing falls through the cracks.

**Coming Soon:**
- Voice message support
- Recurring tasks
- Location-based reminders
- Calendar integration
- Team analytics


## Multi-Messenger Architecture with AI Integration

### System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Telegram Bot  │────▶│                  │     │                 │
├─────────────────┤     │   Message        │     │    Supabase     │
│   Signal Bot    │────▶│   Router &       │────▶│    Database     │
├─────────────────┤     │   AI Processor   │     │                 │
│   Slack Bot     │────▶│                  │     └─────────────────┘
└─────────────────┘     └──────────────────┘
     (Future)                (Core Logic)
```

### Core Design Principles

1. **Messenger Agnostic Core**: All business logic in a central service
2. **Natural Language First**: AI interprets intent, structured commands as fallback
3. **Context-Aware**: System maintains conversation state per user
4. **Progressive Enhancement**: Start with Telegram, add channels without refactoring

### Database Schema

```sql
-- Users (messenger-agnostic)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User channels (multiple messengers per user)
CREATE TABLE user_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  channel_type TEXT, -- 'telegram', 'signal', 'slack'
  channel_identifier TEXT, -- telegram_id, phone, slack_id
  is_primary BOOLEAN DEFAULT FALSE,
  UNIQUE(channel_type, channel_identifier)
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'done'
  priority INTEGER DEFAULT 3, -- 1-5
  due_date TIMESTAMP,
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  permission_level TEXT, -- 'view', 'complete', 'add', 'edit'
  UNIQUE(project_id, user_id)
);

-- Conversation context for AI
CREATE TABLE conversation_context (
  user_id UUID REFERENCES users(id),
  current_project_id UUID REFERENCES projects(id),
  last_interaction TIMESTAMP DEFAULT NOW(),
  context_data JSONB, -- Recent messages, inferred preferences
  PRIMARY KEY(user_id)
);

-- Message log for learning
CREATE TABLE message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  channel_type TEXT,
  raw_message TEXT,
  interpreted_intent JSONB,
  action_taken JSONB,
  success BOOLEAN,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Message Processing Pipeline

```typescript
interface IncomingMessage {
  channelType: 'telegram' | 'signal' | 'slack';
  channelId: string;
  messageText: string;
  attachments?: Array<any>;
  metadata?: any;
}

interface ProcessedIntent {
  action: 'create_task' | 'list_tasks' | 'complete_task' | 
          'create_project' | 'share_project' | 'ask_status' | 
          'set_reminder' | 'unclear';
  entities: {
    taskTitle?: string;
    projectName?: string;
    taskId?: number;
    dueDate?: Date;
    assignee?: string;
    priority?: number;
  };
  confidence: number;
  originalMessage: string;
}

interface Response {
  message: string;
  quickActions?: Array<{label: string, command: string}>;
  formatting: 'plain' | 'markdown' | 'rich';
}
```

### AI Integration Specification

#### Natural Language Examples → Intent

```yaml
User Says: "I need to buy milk tomorrow"
AI Interprets:
  action: create_task
  entities:
    taskTitle: "Buy milk"
    dueDate: [tomorrow's date]
    priority: 3

User Says: "What do I need to do today?"
AI Interprets:
  action: list_tasks
  entities:
    filter: "today"

User Says: "Done with the milk"
AI Interprets:
  action: complete_task
  entities:
    taskSearch: "milk"
    
User Says: "Add Sarah to the home renovation project, she can add tasks"
AI Interprets:
  action: share_project
  entities:
    projectName: "home renovation"
    userName: "Sarah"
    permission: "add"

User Says: "Remind me about the dentist appointment at 3pm"
AI Interprets:
  action: create_task
  entities:
    taskTitle: "Dentist appointment"
    dueDate: [today 15:00]
    reminder: true
```

### Core Service Implementation

```python
# message_processor.py
class MessageProcessor:
    def __init__(self, ai_service, db_service):
        self.ai = ai_service
        self.db = db_service
    
    async def process(self, message: IncomingMessage) -> Response:
        # 1. Identify or create user
        user = await self.db.get_or_create_user(
            message.channelType, 
            message.channelId
        )
        
        # 2. Get conversation context
        context = await self.db.get_context(user.id)
        
        # 3. AI interprets intent
        intent = await self.ai.interpret(
            message.messageText,
            context
        )
        
        # 4. Execute action
        if intent.confidence > 0.7:
            result = await self.execute_action(intent, user, context)
        else:
            # Fall back to clarification
            result = await self.ask_clarification(intent, user)
        
        # 5. Update context
        await self.db.update_context(user.id, intent, result)
        
        # 6. Format response for channel
        return self.format_response(result, message.channelType)
    
    async def execute_action(self, intent, user, context):
        actions = {
            'create_task': self.create_task,
            'list_tasks': self.list_tasks,
            'complete_task': self.complete_task,
            # ... more actions
        }
        return await actions[intent.action](intent, user, context)
```

### AI Service Specification

```python
class AIService:
    def __init__(self):
        # Using Claude or GPT for intent recognition
        self.model = "claude-3-haiku"  # Fast, cheap for intent
        
    async def interpret(self, message: str, context: dict) -> ProcessedIntent:
        prompt = f"""
        Interpret this task management message:
        Message: "{message}"
        
        Current context:
        - Active project: {context.get('current_project')}
        - Recent tasks: {context.get('recent_tasks')}
        - User timezone: {context.get('timezone')}
        
        Return JSON with:
        - action (from allowed list)
        - entities extracted
        - confidence (0-1)
        """
        
        # Call AI API
        response = await self.call_ai(prompt)
        return ProcessedIntent.from_json(response)
```

### Telegram Bot Implementation (MVP)

```python
# telegram_adapter.py
class TelegramAdapter:
    def __init__(self, processor: MessageProcessor):
        self.processor = processor
        self.bot = telegram.Bot(token=TELEGRAM_TOKEN)
    
    async def handle_message(self, update, context):
        # Convert Telegram message to generic format
        message = IncomingMessage(
            channelType='telegram',
            channelId=str(update.effective_user.id),
            messageText=update.message.text
        )
        
        # Process through core service
        response = await self.processor.process(message)
        
        # Send response with Telegram-specific formatting
        if response.quickActions:
            keyboard = self.build_inline_keyboard(response.quickActions)
            await update.message.reply_text(
                response.message,
                reply_markup=keyboard,
                parse_mode='Markdown' if response.formatting == 'markdown' else None
            )
        else:
            await update.message.reply_text(response.message)
```

### Notification System

```python
class NotificationService:
    async def send_reminder(self, user_id, task, channel_preferences):
        message = f"⏰ Reminder: {task.title}"
        
        for channel in channel_preferences:
            if channel.type == 'telegram':
                await self.telegram.send_message(channel.id, message)
            elif channel.type == 'signal':
                await self.signal.send_message(channel.id, message)
            # ... other channels
```

### MVP Features Priority

#### Phase 1 (Hour 1) - Telegram Only
1. Natural language task creation
2. List tasks for today
3. Mark tasks complete
4. Basic AI intent recognition

#### Phase 2 (Day 1)
1. Project switching
2. Due dates and reminders
3. Share projects with permissions
4. Improved AI with context

#### Phase 3 (Week 1)
1. Signal integration
2. Task assignments
3. Priority levels
4. Recurring tasks
5. AI learns from corrections

### Example Conversations

```
User: "meeting with John tomorrow at 2pm about the budget"
Bot: "✅ Added task: 'Meeting with John about the budget' 
     📅 Tomorrow at 2:00 PM
     📁 Project: Work (current)
     
     I'll remind you 15 minutes before."

User: "what's on my plate?"
Bot: "Here's what you have today:
     
     🔴 High Priority:
     1. Submit quarterly report (due 5 PM)
     
     🟡 Normal:
     2. Meeting with John about budget (2 PM)
     3. Review pull requests
     
     💭 Tomorrow:
     • Dentist appointment (9 AM)
     
     Reply with a number to mark as done."

User: "share this with miriam@email.com"
Bot: "I'll share the 'Work' project with Miriam.
     What can she do?
     
     👀 View only
     ✅ Complete tasks  
     ➕ Add new tasks
     ✏️ Full edit access"
```

### Configuration File

```yaml
# config.yaml
ai:
  provider: anthropic
  model: claude-3-haiku-20240307
  max_tokens: 500
  temperature: 0.3

messengers:
  telegram:
    enabled: true
    token: ${TELEGRAM_BOT_TOKEN}
    webhook_url: https://your-server.com/webhook/telegram
  
  signal:
    enabled: false
    phone: "+49..."
    
database:
  supabase:
    url: ${SUPABASE_URL}
    key: ${SUPABASE_KEY}

features:
  natural_language: true
  command_fallback: true
  auto_reminders: true
  timezone_detection: true
```

### Deployment Steps for MVP

1. **Set up Supabase** (5 min)
   - Create tables
   - Enable Row Level Security
   - Generate API keys

2. **Create Telegram Bot** (5 min)
   - BotFather setup
   - Get token

3. **Deploy Core Service** (20 min)
   - Single Python/Node service
   - Environment variables
   - Webhook endpoint

4. **Test Basic Flow** (10 min)
   - Create task via natural language
   - List tasks
   - Complete task

This architecture ensures you can:
- Start with Telegram in under an hour
- Add any messenger without changing core logic
- Leverage AI progressively
- Scale from personal use to team use

Want me to generate the actual implementation code for any of these components?