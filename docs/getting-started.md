# Getting Started with MillionTasks

This guide will help you set up and run MillionTasks locally in just a few minutes.

## 🚀 Quick Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Database

1. **Go to Supabase Console**: Open [app.supabase.com/project/lwpnmhbuhtppvwijnhug/sql/new](https://app.supabase.com/project/lwpnmhbuhtppvwijnhug/sql/new)

2. **Run the Database Migration**: 

   **Quick Method**: Copy the SQL from the Supabase migration file:
   ```bash
   # Copy migration content to clipboard
   cat supabase/migrations/20251005094538_initial_schema.sql
   ```
   
   Then paste it into the [Supabase SQL Editor](https://app.supabase.com/project/lwpnmhbuhtppvwijnhug/sql/new) and click "Run".

   **Alternative CLI Method**: If you have your database password, see [Database Setup Guide](docs/database-setup.md) for CLI instructions.

3. **Verify Tables Created**: After running the SQL, you should see the following tables in your Supabase database:
   - users
   - user_channels
   - projects
   - tasks
   - permissions
   - conversation_context
   - message_log
   - notifications

### Step 3: Configure Environment

Your `.env` file is already configured with your credentials. The system is ready to use!

### Step 4: Start the Application

```bash
npm run dev
```

You should see output like:
```
🚀 Starting MillionTasks...
📋 Credential check:
    supabase: ✅
    telegram: ✅ 
    ai: ✅
🗄️  Connecting to database...
✅ Database connected
🤖 Initializing AI service...
✅ AI service connected
📱 Initializing Telegram bot...
🎯 Starting Telegram bot...

✅ MillionTasks is running!
📱 Send messages to your Telegram bot to get started
🛑 Press Ctrl+C to stop
```

## 🎯 Test Your Bot

1. **Find your bot on Telegram**: Search for your bot's username
2. **Start a conversation**: Send `/start`
3. **Create your first task**: Try "Create a task to buy groceries"

### Example Conversation

```
You: /start
Bot: Welcome to MillionTasks! 🎯

I'm your AI-powered task manager. I understand natural language, so you can just tell me what you need to do.

Try saying:
• "Create a task to call John tomorrow"
• "What do I have today?"
• "Mark grocery shopping as done"

Let's get started! What would you like to do?

You: Create a task to review the quarterly report by Friday
Bot: ✅ Created task: "Review the quarterly report"
📅 Due: Friday at 5:00 PM
📁 Project: Personal
🏷️ Tags: work, review

I'll remind you on Friday morning. Anything else?

You: What tasks do I have?
Bot: Here are your current tasks:

📋 **Personal Project**
1. 📄 Review the quarterly report
   Due: Friday 5:00 PM
   
🎯 1 task total • 0 completed today

Reply with a task number to mark it done, or tell me what else you'd like to do!
```

## 🔧 Troubleshooting

### Database Issues
If you see "Database connection failed":
1. Verify your Supabase credentials in `.env`
2. Make sure you ran the SQL migration above
3. Check that your Supabase project is active

### Bot Not Responding
If your Telegram bot doesn't respond:
1. Check your `TELEGRAM_BOT_TOKEN` in `.env`
2. Make sure you sent `/start` to initialize the bot
3. Verify the bot is running (check console output)

### AI Service Issues
If you see AI-related errors:
1. Verify your `OPENAI_API_KEY` in `.env`
2. Check that you have credits in your OpenAI account
3. Ensure `AI_PROVIDER=openai` is set

### Still Having Issues?
1. Check the console output for error details
2. Ensure all credentials are correctly set in `.env`
3. Try restarting the application: `Ctrl+C` then `npm run dev`

## 🎉 You're Ready!

Your MillionTasks bot is now running and ready to help you manage tasks through natural language conversation on Telegram!

### Next Steps
- Try creating tasks with different priorities: "High priority: fix the bug"
- Test date parsing: "Meeting with Sarah tomorrow at 3pm"
- Explore project management: "Create a new project called Work"
- Test task completion: "Done with grocery shopping"

### Advanced Features
- **Hashtags**: "Review PR #urgent #backend"
- **Due dates**: "Call dentist next Monday at 2pm"
- **Priorities**: "URGENT: Fix production issue"
- **Projects**: Switch between Personal, Work, and custom projects

Happy task managing! 🎯