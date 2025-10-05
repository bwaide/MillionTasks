# Database Setup Guide

## ✅ **Quick Setup (Manual - Recommended)**

Since the Supabase CLI requires a database password that we don't have, here's the fastest way to run the migration:

### **Step 1: Copy Migration SQL**

```bash
# Copy the migration content to clipboard
cat supabase/migrations/20251005094538_initial_schema.sql
```

### **Step 2: Run in Supabase Console**

1. **Open Supabase SQL Editor**: [https://app.supabase.com/project/lwpnmhbuhtppvwijnhug/sql/new](https://app.supabase.com/project/lwpnmhbuhtppvwijnhug/sql/new)

2. **Paste and Run**: Paste the copied SQL and click "Run"

### **Step 3: Verify Tables Created**

After running the migration, you should see these tables in your database:
- users
- user_channels  
- projects
- tasks
- permissions
- conversation_context
- message_log
- notifications

## 🔄 **Alternative: Using Supabase CLI (If You Have DB Password)**

If you know your database password, you can run:

```bash
# This will prompt for password
supabase db push
```

Or set the password in environment and run:

```bash
# Set password (replace with actual password)
export SUPABASE_DB_PASSWORD="your-db-password"

# Run migration
supabase db push --db-url "postgresql://postgres.lwpnmhbuhtppvwijnhug:${SUPABASE_DB_PASSWORD}@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"
```

## 🎯 **After Migration**

Once the migration is complete, you can start the application:

```bash
npm run dev
```

The system will automatically detect the database tables and start the Telegram bot.

## 📂 **Migration Files Created**

- ✅ `supabase/migrations/20251005094538_initial_schema.sql` - Official Supabase migration
- ✅ `database/migrations/001_initial_schema.sql` - Backup copy
- ✅ `database/README.md` - Migration documentation

Your database schema is now properly version-controlled and ready for future migrations!