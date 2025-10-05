# MillionTasks

> Your AI-powered task manager that lives in your messenger

MillionTasks is an intelligent task management system that works entirely through messaging apps - no new software to install, no new interfaces to learn. Simply chat with it like you would with a colleague, and it understands what you need to do, when, and with whom.

## 🌟 Features

- **Natural Language Processing**: No commands to memorize. Just write what you're thinking
- **Multi-Messenger Support**: Start with Telegram, expand to Signal, Slack, or any messaging platform
- **Smart Collaboration**: Share projects with others using simple commands
- **Context-Aware AI**: Remembers your active project and learns your patterns
- **Zero Friction**: No login screens. No app switching. No synchronization issues

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Supabase account ([supabase.com](https://supabase.com))
- A Telegram bot token (from [@BotFather](https://t.me/botfather))
- An OpenAI API key ([platform.openai.com](https://platform.openai.com))

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd MillionTasks
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials (see Configuration Guide below)
   ```

3. **Set up database**:
   ```bash
   # Copy migration SQL
   cat supabase/migrations/20251005094538_initial_schema.sql
   
   # Then paste into Supabase SQL Editor and run
   # See docs/database-setup.md for detailed instructions
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

Your bot is now running! Send a message to your Telegram bot to get started.

## 📋 Configuration Guide

### Required Credentials

#### 1. Supabase (Database)
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Add to `.env`:
   ```
   SUPABASE_URL=your-project-url
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```

#### 2. Telegram Bot
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow prompts
3. Add token to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your-bot-token
   ```

#### 3. OpenAI API
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env`:
   ```
   OPENAI_API_KEY=your-api-key
   AI_PROVIDER=openai
   ```

### Optional Configuration

See [`docs/configuration.md`](docs/configuration.md) for complete configuration options.

## 🎯 Usage Examples

### Basic Task Management

```
You: "Meeting with Sarah tomorrow at 3pm about the budget"
Bot: ✅ Added task: 'Meeting with Sarah about the budget' 
     📅 Tomorrow at 3:00 PM
     📁 Project: Work (current)
     
     I'll remind you 15 minutes before.
```

```
You: "what's on my plate?"
Bot: Here's what you have today:
     
     🔴 High Priority:
     1. Submit quarterly report (due 5 PM)
     
     🟡 Normal:
     2. Meeting with Sarah about budget (3 PM)
     3. Review pull requests
     
     💭 Tomorrow:
     • Dentist appointment (9 AM)
```

### Project Collaboration

```
You: "share this project with john@email.com"
Bot: I'll share the 'Work' project with John.
     What can he do?
     
     👀 View only
     ✅ Complete tasks  
     ➕ Add new tasks
     ✏️ Full edit access
```

### Smart Features

- **Natural Language**: "Buy milk on the way home" → Creates task with location context
- **Priority Detection**: "URGENT: Fix production bug" → High priority task
- **Date Parsing**: "Call dentist next Monday" → Sets due date
- **Hashtag Support**: "Review PR #backend #urgent" → Tags task automatically

## 🛠 Development

### Project Structure

```
src/
├── domain/              # Business logic (framework-agnostic)
│   ├── entities/       # Core business entities
│   ├── value-objects/  # Immutable value objects
│   └── repositories/   # Repository interfaces
├── application/        # Use cases and application services
│   ├── use-cases/     # Business use cases
│   └── services/      # Application services
├── infrastructure/    # External concerns
│   ├── database/     # Database implementations
│   ├── ai/          # AI service implementations
│   └── messaging/   # Communication services
└── interfaces/      # External interfaces
    └── http/       # HTTP API implementation
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:coverage # Run tests with coverage
npm run lint         # Lint code
npm run typecheck    # Type check
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Task.test.ts

# Watch mode during development
npm test -- --watch
```

## 📚 Documentation

- [Configuration Guide](docs/configuration.md) - Complete setup instructions
- [API Documentation](docs/api.md) - REST API reference
- [Architecture Guide](docs/architecture.md) - System design and patterns
- [Contributing Guide](docs/contributing.md) - Development guidelines

## 🚀 Deployment

### Development (Local)
Already configured! The app runs with polling in development mode.

### Production (Webhook)
1. Deploy to your hosting platform (Vercel, Railway, etc.)
2. Set webhook URL in your `.env`:
   ```
   TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhooks/telegram
   ```
3. The bot will automatically configure webhooks on startup

### Docker (Optional)
```bash
docker build -t milliontasks .
docker run --env-file .env -p 3000:3000 milliontasks
```

## 🧪 MVP Status

**Phase 1 (✅ Complete)**: Telegram-only with basic task creation/completion
- ✅ Natural language task creation
- ✅ List tasks for today
- ✅ Mark tasks complete
- ✅ Basic AI intent recognition

**Phase 2 (🚧 In Progress)**: Project management and sharing
- ✅ Project switching
- ✅ Due dates and reminders
- 🚧 Share projects with permissions
- ✅ Improved AI with context

**Phase 3 (📋 Planned)**: Multi-platform and advanced features
- 📋 Signal integration
- 📋 Task assignments
- 📋 Priority levels
- 📋 Recurring tasks
- 📋 AI learns from corrections

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Run migrations manually
npm run db:migrate -- --manual
# Then copy the SQL to your Supabase SQL editor
```

**Bot Not Responding**
1. Check Telegram token is correct
2. Ensure bot is started (`/start` command)
3. Check server logs for errors

**AI Service Errors**
1. Verify OpenAI API key is valid
2. Check API rate limits
3. Ensure sufficient credits

### Getting Help

1. Check the [troubleshooting guide](docs/troubleshooting.md)
2. Review server logs: `npm run dev` shows detailed logging
3. Create an issue with logs and configuration (remove sensitive data)

## 📄 License

MIT - see [LICENSE](LICENSE) for details

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](docs/contributing.md) for guidelines.

---

**Made with ❤️ as part of the MillionBrains ecosystem**