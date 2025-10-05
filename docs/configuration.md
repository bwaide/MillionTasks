# Configuration Guide

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`

3. Start the application:
   ```bash
   npm run dev
   ```

## Required Credentials

### 1. Supabase (Database)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy the following values to your `.env`:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_ANON_KEY`: The `anon` public key
   - `SUPABASE_SERVICE_KEY`: The `service_role` secret key

### 2. Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to:
   - Choose a name for your bot
   - Choose a username (must end in `bot`)
4. Copy the token to `TELEGRAM_BOT_TOKEN` in your `.env`

### 3. AI Service

Choose one of the following:

#### Option A: Anthropic Claude (Recommended)

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Generate an API key
3. Add to `.env`:
   ```
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your-key-here
   ```

#### Option B: OpenAI

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Generate an API key
3. Add to `.env`:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=your-key-here
   ```

## Configuration Options

### Feature Flags

Control which features are enabled:

```env
ENABLE_NATURAL_LANGUAGE=true    # AI interprets messages
ENABLE_COMMAND_FALLBACK=true    # Falls back to commands if AI fails
ENABLE_AUTO_REMINDERS=true      # Automatic task reminders
ENABLE_TIMEZONE_DETECTION=true  # Detect user timezone
ENABLE_VOICE_MESSAGES=false     # Process voice messages (future)
ENABLE_RECURRING_TASKS=false    # Support recurring tasks (future)
```

### AI Settings

Fine-tune the AI behavior:

```env
AI_MAX_TOKENS=500                    # Max response length
AI_TEMPERATURE=0.3                   # Creativity (0=focused, 1=creative)
AI_INTENT_CONFIDENCE_THRESHOLD=0.7  # Min confidence for AI actions
```

### Notification Settings

```env
DEFAULT_REMINDER_MINUTES=15  # Minutes before task due date
DAILY_SUMMARY_TIME=09:00    # Time for daily summary (24h format)
```

### Development Settings

```env
NODE_ENV=development  # development | production | test
PORT=3000            # Server port
LOG_LEVEL=info       # error | warn | info | debug | trace
DEBUG=false          # Enable debug mode
DEBUG_SQL=false      # Log SQL queries
```

## Security Notes

- **Never commit `.env` to version control**
- Keep `SUPABASE_SERVICE_KEY` secret - it bypasses Row Level Security
- Rotate tokens regularly in production
- Use strong, unique values for `SESSION_SECRET` and `TELEGRAM_WEBHOOK_SECRET`

## Testing Configuration

For testing without real credentials:

1. The system will use placeholder values if credentials are missing
2. You'll see warnings in the console about missing credentials
3. Core functionality can be tested with mock services

## Webhook Configuration (Production)

For production deployment with webhooks:

```env
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhooks/telegram
TELEGRAM_WEBHOOK_SECRET=generate-random-secret-here
```

The webhook secret ensures only Telegram can send messages to your endpoint.

## Environment-Specific Files

You can create environment-specific files:

- `.env.local` - Local development overrides
- `.env.production` - Production settings
- `.env.test` - Test environment settings

These files are loaded in order, with later files overriding earlier ones.

## Troubleshooting

### Missing Credentials Warning

If you see warnings about missing credentials:
1. Check that `.env` file exists
2. Verify all required fields are filled
3. Restart the application after changes

### Invalid Credentials

If credentials are rejected:
1. Verify they're copied correctly (no extra spaces)
2. Check the service dashboard for the correct values
3. Ensure API keys are active and have proper permissions

### Rate Limiting

If you hit rate limits:
1. Adjust `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`
2. Consider upgrading AI service tier
3. Implement caching for repeated queries