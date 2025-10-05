# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

MillionTasks is an AI-powered task management system that operates entirely through messaging platforms (Telegram, Signal, Slack, etc.). This is currently in the conceptual/planning phase with comprehensive requirements documentation but no implementation yet.

## Current State

This project exists as a requirements specification in `/docs/requirements.md`. There is no functioning codebase yet. When implementing features, refer to the requirements document for:
- Database schema design
- API specifications  
- User interaction flows
- MVP progression phases

## Architecture Overview

### Planned Technology Stack
- **Backend**: Python/FastAPI or TypeScript/Node.js (to be determined)
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude API (claude-3-haiku for intent recognition)
- **Messaging**: Telegram (MVP), then Signal and Slack
- **Authentication**: Supabase Auth

### Core Components (to be implemented)
1. **Message Router**: Central service handling incoming messages from all platforms
2. **AI Processor**: Intent recognition and entity extraction using Claude
3. **Task Manager**: CRUD operations for tasks and projects
4. **Messenger Adapters**: Platform-specific implementations for Telegram, Signal, etc.
5. **Notification Service**: Smart reminders and updates

## Development Guidelines

### When Starting Implementation

1. **Technology Stack Selection**: If not already chosen, recommend TypeScript/Node.js for better type safety and ecosystem compatibility with Supabase
2. **Project Setup**: Initialize with appropriate package manager (npm/yarn for Node.js, poetry/pip for Python)
3. **Database**: Set up Supabase project and implement migrations based on schema in requirements.md

### Database Schema

The database design is fully specified in `/docs/requirements.md`. Key tables include:
- `users` - Messenger-agnostic user accounts
- `user_channels` - Links users to their messaging platform identities
- `projects` and `tasks` - Core task management entities
- `permissions` - Collaboration and sharing controls
- `ai_conversation_context` - Maintains AI state across messages

### API Design

Follow the API specifications in requirements.md for:
- Message processing endpoints
- Task CRUD operations
- Project management
- User authentication flows

### AI Integration

When implementing Claude integration:
- Use claude-3-haiku for cost-effective intent recognition
- Maintain conversation context in database
- Structure prompts for: intent classification, entity extraction, context awareness
- Implement feedback loop for learning from user corrections

### MVP Development Phases

Follow the progression outlined in requirements:
1. **Hour 1 MVP**: Basic Telegram bot with task creation/completion
2. **Day 1 MVP**: Add projects and sharing capabilities
3. **Week 1 MVP**: Multi-platform support and advanced features

## Testing Approach

### Test-First Bug Fixing Strategy

**CRITICAL**: Whenever encountering a bug, follow this mandatory three-step process:

1. **Create a unit test that reproduces the error** - Write the test first to capture the bug
2. **Fix the bug** - Implement the fix
3. **Run the test to verify** - Ensure the test passes and the bug is resolved

This approach ensures that:
- Every bug fix is accompanied by a test
- The bug cannot reoccur without detection
- Test coverage grows organically over time
- The system becomes more robust and resilient with each fix

### General Testing Guidelines

Once implementation begins:
- Unit tests for business logic (task management, permissions)
- Integration tests for database operations
- End-to-end tests for messenger flows
- Mock external services (Telegram API, Claude API) for testing

## Security Considerations

- Never store messenger tokens in code
- Use environment variables for all secrets
- Implement rate limiting for AI calls
- Validate all user input before database operations
- Use Supabase RLS policies for data access control

## Future Development

Refer to `/docs/requirements.md` for the complete feature roadmap and architectural decisions. Key priorities:
1. Implement core message processing pipeline
2. Create Telegram adapter first
3. Add basic task CRUD operations
4. Integrate Claude for natural language processing
5. Implement project sharing and permissions