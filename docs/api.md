# API Documentation

MillionTasks provides both messaging interfaces and HTTP APIs for integration.

## Messaging API (Primary Interface)

The primary way to interact with MillionTasks is through messaging platforms.

### Telegram Commands

#### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/start` | Initialize your account | `/start` |
| `/help` | Show available commands | `/help` |
| `/list` | Show your tasks | `/list` or `/list today` |
| `/create` | Create a new task | `/create Buy groceries` |
| `/projects` | List your projects | `/projects` |
| `/status` | Show system status | `/status` |

#### Task Management

| Command | Description | Example |
|---------|-------------|---------|
| `/complete <id>` | Mark task as complete | `/complete 123` |
| `/delete <id>` | Delete a task | `/delete 123` |
| `/edit <id>` | Edit a task | `/edit 123` |
| `/assign <id> @user` | Assign task to user | `/assign 123 @john` |
| `/priority <id> <level>` | Set task priority | `/priority 123 high` |
| `/due <id> <date>` | Set due date | `/due 123 tomorrow 2pm` |

#### Project Management

| Command | Description | Example |
|---------|-------------|---------|
| `/project <name>` | Switch to project | `/project Work` |
| `/new-project <name>` | Create new project | `/new-project "Home Renovation"` |
| `/share <project> <email>` | Share project | `/share Work john@example.com` |
| `/leave <project>` | Leave a project | `/leave Work` |

### Natural Language Processing

MillionTasks understands natural language messages without commands:

#### Task Creation
```
"Meeting with Sarah tomorrow at 3pm"
"Buy milk and bread #shopping"
"Fix the login bug - high priority"
"Remind me to call dentist next week"
```

#### Task Queries
```
"What do I have today?"
"Show me my urgent tasks"
"What's due this week?"
"Tasks for the Home project"
```

#### Task Updates
```
"Done with grocery shopping"
"Mark the bug fix as complete"
"Change dentist appointment to Friday"
"Make the presentation high priority"
```

## HTTP API (Webhook Interface)

### Base URL
- Development: `http://localhost:3000/api/v1`
- Production: `https://your-domain.com/api/v1`

### Authentication
The HTTP API uses Supabase authentication. Include the user's JWT token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

### Endpoints

#### Tasks

**GET /tasks**
List user's tasks with filtering options.

Query Parameters:
- `project_id` (string): Filter by project
- `status` (string): Filter by status (`open`, `in_progress`, `done`)
- `priority` (number): Filter by priority (1-5)
- `due_before` (ISO date): Tasks due before date
- `due_after` (ISO date): Tasks due after date
- `tags` (string): Comma-separated list of tags
- `limit` (number): Maximum number of results (default: 50)
- `offset` (number): Pagination offset (default: 0)

Response:
```json
{
  "tasks": [
    {
      "id": "task-123",
      "title": "Buy groceries",
      "description": "Milk, bread, eggs",
      "status": "open",
      "priority": 3,
      "due_date": "2024-01-15T14:00:00Z",
      "tags": ["shopping", "urgent"],
      "project_id": "project-456",
      "created_by": "user-789",
      "assigned_to": "user-789",
      "created_at": "2024-01-14T10:00:00Z",
      "updated_at": "2024-01-14T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**POST /tasks**
Create a new task.

Request Body:
```json
{
  "title": "Task title",
  "description": "Optional description",
  "project_id": "project-456",
  "assigned_to": "user-789",
  "priority": 3,
  "due_date": "2024-01-15T14:00:00Z",
  "tags": ["tag1", "tag2"]
}
```

Response:
```json
{
  "success": true,
  "task": {
    "id": "task-123",
    "title": "Task title",
    // ... full task object
  }
}
```

**GET /tasks/:id**
Get a specific task.

**PUT /tasks/:id**
Update a task.

**DELETE /tasks/:id**
Delete a task.

**POST /tasks/:id/complete**
Mark a task as complete.

#### Projects

**GET /projects**
List user's projects.

**POST /projects**
Create a new project.

**GET /projects/:id**
Get a specific project.

**PUT /projects/:id**
Update a project.

**DELETE /projects/:id**
Delete a project.

#### Users

**GET /users/me**
Get current user information.

**PUT /users/me**
Update user preferences.

### Webhooks

MillionTasks supports webhooks for external integrations.

#### Telegram Webhook
`POST /webhooks/telegram`

Receives updates from Telegram Bot API. This endpoint is automatically configured when you set up your bot.

#### Custom Webhooks (Future)
Configure webhooks to receive notifications about task updates:

```json
{
  "event": "task.created",
  "data": {
    "task": { /* task object */ },
    "user": { /* user object */ },
    "project": { /* project object */ }
  },
  "timestamp": "2024-01-14T10:00:00Z"
}
```

Available events:
- `task.created`
- `task.updated`
- `task.completed`
- `task.deleted`
- `project.created`
- `project.shared`

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

### HTTP Status Codes
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limited
- `500 Internal Server Error`: Server error

## Rate Limiting

API endpoints are rate limited:
- **Messaging**: 100 messages per minute per user
- **HTTP API**: 1000 requests per hour per user
- **Webhooks**: 10 requests per second

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## SDK Integration

### JavaScript/TypeScript
```typescript
import { MillionTasksClient } from '@milliontasks/sdk';

const client = new MillionTasksClient({
  apiUrl: 'https://your-domain.com/api/v1',
  authToken: 'your-jwt-token'
});

// Create a task
const task = await client.tasks.create({
  title: 'Review pull request',
  project_id: 'work-project'
});

// List tasks
const tasks = await client.tasks.list({
  status: 'open',
  limit: 10
});
```

### Python
```python
from milliontasks import MillionTasksClient

client = MillionTasksClient(
    api_url='https://your-domain.com/api/v1',
    auth_token='your-jwt-token'
)

# Create a task
task = client.tasks.create(
    title='Review pull request',
    project_id='work-project'
)

# List tasks
tasks = client.tasks.list(status='open', limit=10)
```

## Testing

### Development API
When running in development mode, additional testing endpoints are available:

**POST /api/test/message**
Send a test message to the bot (useful for debugging):
```json
{
  "user_id": "test-user",
  "message": "Create a test task",
  "channel": "telegram"
}
```

**GET /api/test/health**
System health check with detailed status:
```json
{
  "status": "healthy",
  "services": {
    "database": "healthy",
    "ai": "healthy",
    "telegram": "healthy"
  },
  "version": "1.0.0"
}
```

### Postman Collection
Import our Postman collection for easy API testing:
[Download Postman Collection](../postman/milliontasks-api.json)