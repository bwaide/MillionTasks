# MillionTasks PMF Sprint Specification
## Rapid Validation Through Real-World Usage

*Version 1.0 | October 2025*

---

## Executive Summary

### Why These 3 Features Unlock PMF

MillionTasks has successfully built a working Telegram bot with natural language task management. Now we need to validate product-market fit with real users in production scenarios. The first user pair (busy professional + assistant) has identified three critical gaps that block daily usage:

1. **Web View** - "I need to check tasks during meetings when I can't use Telegram"
2. **Sharing System** - "My assistant needs to see and update my tasks"
3. **Smart Reminders** - "I forget to check the app - it needs to proactively remind me"

These features represent the minimum viable bridge between "interesting prototype" and "daily productivity tool." Without them, users cannot integrate MillionTasks into their real workflows.

### Success Criteria for Validation

**Quantitative Metrics (4-week target):**
- Daily active usage by both users for 20+ days
- 50+ tasks created and managed
- 10+ tasks shared between users
- 80%+ reminder engagement rate
- Zero days with system downtime

**Qualitative Signals:**
- User voluntarily recommends to others
- Requests for additional features (shows investment)
- Integration into daily routine (morning check-in pattern)
- Reduction in alternative tool usage

### Timeline Estimate

**Total Duration: 3 weeks development + 1 week testing**

- **Week 1:** Web View (read-only) + Authentication
- **Week 2:** Sharing System + Permissions
- **Week 3:** Smart Reminders + Notification Engine
- **Week 4:** Integration testing + User onboarding

This aggressive timeline is achievable because:
- Database schema already supports these features
- Existing Supabase infrastructure handles auth/realtime
- Features build on current architecture patterns
- We're prioritizing MVP scope over perfection

---

## Feature Specifications

### 1. Web View - "See Tasks Anywhere"

#### User Stories

**Story 1: Quick Meeting Reference**
```
Alex is in a video call discussing project priorities.
- Opens milliontasks.app on laptop browser
- Sees current task list without switching from call
- Can reference task details and due dates
- Shares screen to show team the task breakdown
```

**Story 2: Morning Planning Ritual**
```
Sarah starts her day at her desk with coffee.
- Opens web dashboard on large monitor
- Reviews all tasks across projects in one view
- Identifies top 3 priorities for the day
- Keeps dashboard open as reference while working
```

**Story 3: Mobile Emergency Check**
```
Mike is at lunch when client texts about urgent item.
- Opens web app on phone browser
- Quickly checks if task is already captured
- Sees it's assigned to team member with deadline
- Responds confidently without opening Telegram
```

#### Functional Requirements

**MVP Scope (Week 1):**
- **Authentication:** Magic link via Telegram (no passwords)
- **Views:** Task list, Task detail, Project list
- **Actions:** Read-only (view tasks, projects, status)
- **Responsive:** Works on mobile, tablet, desktop
- **Real-time:** Live updates via Supabase subscriptions

**Post-MVP Enhancements:**
- Task creation/editing via web
- Drag-and-drop prioritization
- Calendar view
- File attachments
- Bulk operations

#### User Experience Flow

**Authentication Flow:**
1. User visits `app.milliontasks.com`
2. Enters Telegram username or phone
3. Receives magic link in Telegram
4. Clicks link → Authenticated for 30 days
5. Optional: Set device as trusted

**Main Dashboard:**
```
┌─────────────────────────────────────┐
│ MillionTasks     Hi Sarah    Logout │
├─────────────────────────────────────┤
│ Today (3)  Week (8)  All (15)  [+]  │
├─────────────────────────────────────┤
│ ⚡ URGENT - Review contract          │
│    Due in 2 hours · Work Project    │
│                                      │
│ 📋 Prepare meeting agenda           │
│    Due today 5pm · Shared w/ John   │
│                                      │
│ 🔄 Follow up with client            │
│    Due tomorrow · Sales Project     │
├─────────────────────────────────────┤
│ Projects: Work (8) Personal (4) ... │
└─────────────────────────────────────┘
```

#### Technical Implementation

**Frontend Stack:**
- **Framework:** Next.js 14 (App Router)
- **UI:** Tailwind CSS + shadcn/ui components
- **State:** Zustand + React Query
- **Auth:** Supabase Auth with custom Telegram provider
- **Hosting:** Vercel (auto-deploy from Git)

**Key Components:**
```typescript
// pages/app/dashboard.tsx
- TaskList (real-time subscribed)
- TaskFilters (today/week/project)
- ProjectSwitcher
- NotificationBell (upcoming reminders)

// lib/auth/telegram-magic-link.ts
- Generate secure token
- Send via Telegram bot
- Validate and create session

// hooks/useRealtimeTasks.ts
- Subscribe to task changes
- Optimistic updates
- Offline queue
```

**Database Integration:**
- Reuses existing Supabase tables
- Adds `auth.sessions` table for web sessions
- Leverages Row Level Security policies

#### Edge Cases & Error Handling

- **Offline Mode:** Cache last state, show stale indicator
- **Session Expiry:** Smooth re-auth flow with return URL
- **Data Conflicts:** Last-write-wins with conflict notification
- **Rate Limiting:** Implement request throttling
- **Browser Support:** Fallback for older browsers

---

### 2. Sharing System - "Delegate with Confidence"

#### User Stories

**Story 1: Assistant Task Delegation**
```
Manager creates project "Q4 Planning" and shares with assistant.
- Types: "share Q4 Planning with @emma_assistant"
- Chooses permission: "Can add and complete tasks"
- Emma receives notification with join link
- Emma sees all Q4 tasks in her Telegram
- Both see real-time updates when either makes changes
```

**Story 2: Team Project Collaboration**
```
Team lead shares "Product Launch" project with 3 members.
- Each member has different permissions
- Designer: Can add design tasks
- Developer: Can complete tech tasks
- Stakeholder: View-only access
- All updates broadcast to relevant members
```

**Story 3: Temporary Contractor Access**
```
Freelancer needs access for 2-week project.
- Share with expiring permissions
- Auto-revoke after project deadline
- Audit log of all contractor actions
- Clean separation when project ends
```

#### Functional Requirements

**Permission Levels:**
1. **Viewer** - See tasks, projects, status
2. **Commenter** - Above + add notes (future)
3. **Contributor** - Above + complete tasks
4. **Editor** - Above + create/edit/delete tasks
5. **Admin** - Above + manage permissions

**Sharing Mechanisms:**
- **Via Telegram:** "@username" or phone number
- **Via Link:** Generate invite with embedded permissions
- **Via Email:** Future enhancement
- **Bulk Invite:** Share with multiple users at once

**Notification Rules:**
- Task created → Notify assignee + watchers
- Task completed → Notify creator + assignee
- Due soon → Notify assignee only
- Permission change → Notify affected user
- Project shared → Welcome message with guide

#### User Experience Flow

**Sharing via Telegram:**
```
You: share current project with @john can edit
Bot: 🔗 Sharing "Work Project" with @john...

✅ @john now has edit access to Work Project
They'll receive an invitation message.

Current team:
• You (Owner)
• @john (Editor) - Just added
• @sarah (Viewer)

Manage permissions: /permissions
```

**Receiving Share Invitation:**
```
Bot: 🎉 Sarah shared "Q4 Planning" with you!

You can now:
✅ View all tasks
✅ Complete tasks
✅ Add new tasks
❌ Delete tasks (requires edit access)

13 active tasks in this project.

[View Tasks] [Accept] [Decline]
```

#### Technical Implementation

**Database Changes:**
```sql
-- Already exists in current schema
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  permission_level TEXT, -- 'view', 'complete', 'add', 'edit', 'admin'
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);

-- New: Invitation tracking
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  invited_by UUID REFERENCES users(id),
  invitation_code TEXT UNIQUE,
  telegram_username TEXT,
  permission_level TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, declined, expired
  expires_at TIMESTAMP,
  created_at TIMESTAMP
);

-- New: Activity audit log
CREATE TABLE activity_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  action TEXT, -- task_created, task_completed, permission_granted, etc
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP
);
```

**Permission Check Flow:**
```typescript
// application/services/PermissionService.ts
class PermissionService {
  async canUserAccessProject(userId: string, projectId: string): boolean
  async canUserEditTask(userId: string, taskId: string): boolean
  async grantPermission(grantedBy: string, userId: string, projectId: string, level: string)
  async revokePermission(projectId: string, userId: string)
  async getProjectTeam(projectId: string): TeamMember[]
}

// Modified command handler
async handleMessage(message) {
  const permission = await permissionService.getUserProjectPermission(userId, projectId);

  if (!permission.canCreate && message.isCreateCommand) {
    return "❌ You don't have permission to create tasks in this project";
  }

  // Process command with permission context
}
```

**Share Command Parser:**
```typescript
// Parse: "share [project] with @username [permission]"
interface ShareIntent {
  projectName?: string; // defaults to current
  username: string;
  permissionLevel: 'view' | 'complete' | 'add' | 'edit';
}

// Smart defaults based on context
// "share with @john" → current project, 'add' permission
// "share Sales with @emma edit" → Sales project, 'edit' permission
```

#### Edge Cases & Error Handling

- **User Not Found:** Provide invitation link alternative
- **Duplicate Share:** Show current permissions, offer to modify
- **Permission Conflicts:** Owner overrides all
- **Circular Dependencies:** Prevent permission loops
- **Orphaned Projects:** Transfer to most active admin
- **Rate Limiting:** Max 10 shares per minute

---

### 3. Smart Reminders - "Never Miss What Matters"

#### User Stories

**Story 1: Morning Briefing**
```
Every day at 8:30 AM, Sarah receives:
"☀️ Good morning! Here's your day:

🔴 Urgent (1):
• Contract review - Due 11 AM

📋 Today (3):
• Team standup - 10 AM
• Email campaign draft - 2 PM
• Call with vendor - 4 PM

📊 This week: 12 tasks remaining

Reply 'more' for full list or 'focus' to see only urgent items."
```

**Story 2: Smart Deadline Warnings**
```
System detects task "Submit report" due tomorrow at 5 PM.
Based on task complexity and user patterns:

Today 5 PM: "📝 Reminder: Report due tomorrow. Need ~2 hours. Start tonight?"
Tomorrow 9 AM: "⚠️ Report due today 5 PM. Block calendar?"
Tomorrow 3 PM: "🚨 2 hours until report deadline. Status?"
```

**Story 3: Contextual Nudges**
```
User creates task "Buy milk" with no date.
System learns user shops on Saturdays.

Saturday 10 AM: "🛒 Heading out? Don't forget: Buy milk"

User often completes admin tasks on Friday afternoons.
Friday 2 PM: "📋 Good time for admin tasks? You have 3 pending."
```

#### Functional Requirements

**Reminder Types:**
1. **Time-based**
   - X minutes/hours before due date
   - Daily digest at set time
   - Weekly preview on Sunday evening

2. **Event-based**
   - When task becomes urgent (24h)
   - When assigned new task
   - When shared task is updated

3. **Smart/Contextual**
   - Pattern-based (learns optimal times)
   - Location-based (future)
   - Workflow-based (after completing related task)

**User Preferences:**
```yaml
reminders:
  daily_digest:
    enabled: true
    time: "08:30"
    days: ["mon", "tue", "wed", "thu", "fri"]
    include_completed: false

  deadline_warnings:
    first_warning: "1 day"
    second_warning: "2 hours"
    final_warning: "30 minutes"

  quiet_hours:
    enabled: true
    start: "22:00"
    end: "07:00"
    allow_urgent: true

  smart_nudges:
    enabled: true
    learning_period: "2 weeks"
```

#### User Experience Flow

**Setting Up Reminders:**
```
You: /reminders
Bot: ⏰ Reminder Settings

Daily Digest: ✅ 8:30 AM
Deadline Warnings: ✅ Enabled
Smart Nudges: ✅ Learning your patterns

Quick settings:
[Morning Brief - 8 AM] [Evening Review - 6 PM]
[Aggressive] [Balanced] [Minimal]

Or customize: /reminders custom
```

**Creating Task with Reminder:**
```
You: Review presentation due tomorrow 3pm remind me 1 hour before
Bot: ✅ Created task with reminder

📋 Review presentation
📅 Due: Tomorrow 3:00 PM
⏰ Reminder: Tomorrow 2:00 PM

Additional reminders:
[Morning] [30 min before] [No thanks]
```

**Smart Nudge Learning:**
```
Bot: 🤖 I noticed you often complete reports on Thursday afternoons.
Would you like a weekly Thursday 2 PM reminder for pending reports?

[Yes, set it] [No thanks] [Ask later]
```

#### Technical Implementation

**Reminder Engine Architecture:**
```typescript
// Background job runs every minute
class ReminderEngine {
  async processReminders() {
    // 1. Fetch due reminders from queue
    const due = await this.fetchDueReminders();

    // 2. Check user preferences and quiet hours
    const filtered = this.applyUserPreferences(due);

    // 3. Batch by user and channel
    const batched = this.batchReminders(filtered);

    // 4. Send via notification service
    await this.sendBatched(batched);

    // 5. Record delivery and update next reminder
    await this.recordDelivery(batched);
  }
}

// Smart pattern detection
class PatternLearner {
  async analyzeUserPatterns(userId: string) {
    // Query historical task completion times
    // Identify patterns (day of week, time of day)
    // Generate smart reminder suggestions
  }
}
```

**Database Schema Updates:**
```sql
-- Reminder queue table
CREATE TABLE reminder_queue (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  task_id UUID REFERENCES tasks(id),
  reminder_type TEXT, -- 'deadline', 'daily_digest', 'smart_nudge'
  scheduled_for TIMESTAMP NOT NULL,
  message_template TEXT,
  metadata JSONB,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  attempts INTEGER DEFAULT 0,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User reminder preferences
CREATE TABLE user_reminder_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  daily_digest_time TIME,
  daily_digest_days TEXT[],
  deadline_warning_intervals JSONB,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  smart_nudges_enabled BOOLEAN DEFAULT TRUE,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pattern learning data
CREATE TABLE user_activity_patterns (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  pattern_type TEXT, -- 'task_completion', 'active_hours', 'task_creation'
  day_of_week INTEGER,
  hour_of_day INTEGER,
  frequency INTEGER,
  confidence DECIMAL,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_reminder_queue_scheduled ON reminder_queue(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_reminder_queue_user ON reminder_queue(user_id, status);
```

**Reminder Templates:**
```typescript
const templates = {
  daily_digest: {
    morning: "☀️ Good morning! You have {count} tasks today:\n{task_list}\n\nReply 'help' for commands",
    evening: "🌙 Tomorrow's agenda ({count} tasks):\n{task_list}\n\nRest well!",
  },

  deadline: {
    first: "📅 Task '{title}' is due {relative_time}",
    urgent: "⚠️ '{title}' due in {hours}h {minutes}m",
    overdue: "🚨 '{title}' was due {time_ago}. Update status?",
  },

  smart: {
    pattern: "📊 Based on your patterns, good time for:\n{suggested_tasks}",
    location: "📍 Near {location}? Remember: {task}",
  }
};
```

**Cron Jobs:**
```typescript
// Using node-cron or similar
schedule.scheduleJob('*/1 * * * *', async () => {
  // Every minute: Process immediate reminders
  await reminderEngine.processImmediate();
});

schedule.scheduleJob('0 * * * *', async () => {
  // Every hour: Calculate upcoming reminders
  await reminderEngine.queueUpcoming();
});

schedule.scheduleJob('0 0 * * *', async () => {
  // Daily: Update pattern learning
  await patternLearner.updateAllUsers();
});
```

#### Edge Cases & Error Handling

- **Failed Delivery:** Retry 3x with exponential backoff
- **Timezone Handling:** Store user TZ, calculate in local time
- **Duplicate Reminders:** Dedupe by task + time window
- **Reminder Storm:** Max 5 reminders per hour per user
- **Opt-out:** Quick unsubscribe via "STOP" command
- **Vacation Mode:** Pause all reminders temporarily

---

## Implementation Roadmap

### Week 1: Web View Foundation
**Monday-Tuesday: Setup & Auth**
- [ ] Initialize Next.js project with TypeScript
- [ ] Configure Supabase Auth with custom provider
- [ ] Implement Telegram magic link flow
- [ ] Create base layout and routing

**Wednesday-Thursday: Core Views**
- [ ] Build TaskList component with real-time subscription
- [ ] Implement task filtering (today/week/all)
- [ ] Create responsive mobile/desktop layouts
- [ ] Add project switcher

**Friday: Polish & Deploy**
- [ ] Error handling and loading states
- [ ] Deploy to Vercel
- [ ] Configure custom domain
- [ ] End-to-end testing

**Deliverable:** Working read-only web app with Telegram auth

### Week 2: Sharing System
**Monday-Tuesday: Permissions Backend**
- [ ] Implement PermissionService
- [ ] Add permission checks to all operations
- [ ] Create invitation system
- [ ] Update Telegram handlers

**Wednesday-Thursday: Sharing Commands**
- [ ] Build share command parser
- [ ] Implement invitation flow
- [ ] Add team view to web UI
- [ ] Create activity logging

**Friday: Notifications**
- [ ] Share notifications
- [ ] Permission change alerts
- [ ] Testing with multiple users
- [ ] Documentation

**Deliverable:** Full sharing system with permissions

### Week 3: Smart Reminders
**Monday-Tuesday: Reminder Engine**
- [ ] Build reminder queue processor
- [ ] Implement scheduling logic
- [ ] Create reminder templates
- [ ] Setup cron jobs

**Wednesday-Thursday: User Preferences**
- [ ] Preference management commands
- [ ] Daily digest implementation
- [ ] Deadline warning system
- [ ] Quiet hours logic

**Friday: Smart Features**
- [ ] Pattern learning algorithm
- [ ] Smart nudge system
- [ ] Testing and tuning
- [ ] Performance optimization

**Deliverable:** Complete reminder system with smart features

### Week 4: Integration & Launch
**Monday-Tuesday: Integration Testing**
- [ ] End-to-end user flows
- [ ] Cross-feature testing
- [ ] Performance testing
- [ ] Security audit

**Wednesday-Thursday: User Onboarding**
- [ ] Create onboarding flow
- [ ] Write user guides
- [ ] Setup monitoring
- [ ] Prepare support docs

**Friday: Launch**
- [ ] Deploy to production
- [ ] Onboard first users
- [ ] Monitor metrics
- [ ] Gather feedback

---

## Success Metrics

### Week 1 Metrics (Post-Launch)
- [ ] Both users successfully authenticated
- [ ] 10+ tasks created
- [ ] 5+ web sessions
- [ ] 0 critical bugs

### Week 2 Metrics
- [ ] First project shared
- [ ] 5+ shared tasks
- [ ] Both users accessing shared content
- [ ] 90%+ permission checks successful

### Week 3 Metrics
- [ ] 20+ reminders sent
- [ ] 80%+ reminder engagement
- [ ] Daily digest activated
- [ ] Pattern learning initiated

### Week 4 Metrics
- [ ] 25+ consecutive days usage
- [ ] 50+ total tasks managed
- [ ] <1% error rate
- [ ] User satisfaction score >8/10

### KPIs for PMF Validation

**Engagement Metrics:**
- Daily Active Users (target: 100%)
- Tasks created per week (target: 15+)
- Feature adoption rate (target: all 3 features used)
- Session duration (web) (target: 5+ minutes)

**Retention Metrics:**
- Day 7 retention (target: 100%)
- Day 14 retention (target: 100%)
- Day 30 retention (target: 90%+)

**Quality Metrics:**
- Task completion rate (target: 60%+)
- Reminder interaction rate (target: 80%+)
- Sharing actions per week (target: 5+)
- System uptime (target: 99.9%)

**User Satisfaction Signals:**
- Voluntary feature requests
- Referral mentions
- Reduced use of alternatives
- Positive feedback unprompted

---

## Risk Assessment

### Technical Risks

**Risk 1: Telegram API Rate Limits**
- **Impact:** Reminder delivery failures
- **Mitigation:** Implement queue with rate limiting, batch messages
- **Backup:** Email delivery fallback

**Risk 2: Real-time Sync Complexity**
- **Impact:** Data conflicts between web/Telegram
- **Mitigation:** Last-write-wins with conflict detection
- **Backup:** Manual refresh option

**Risk 3: Authentication Security**
- **Impact:** Unauthorized access
- **Mitigation:** Short-lived tokens, device fingerprinting
- **Backup:** 2FA implementation ready

### Product Risks

**Risk 1: Feature Overwhelming Users**
- **Impact:** Abandonment due to complexity
- **Mitigation:** Progressive disclosure, smart defaults
- **Backup:** Simplified "basic mode"

**Risk 2: Reminder Fatigue**
- **Impact:** Users disable notifications
- **Mitigation:** Smart batching, learning optimal times
- **Backup:** Minimal reminder preset

**Risk 3: Permission Confusion**
- **Impact:** Accidental oversharing
- **Mitigation:** Clear permission descriptions, confirmation
- **Backup:** Audit log and quick revoke

### Mitigation Strategies

1. **Incremental Rollout**
   - Start with single user pair
   - Add features one at a time
   - Monitor metrics closely
   - Quick rollback capability

2. **Feature Flags**
   - Toggle features without deploy
   - A/B test configurations
   - Gradual percentage rollout
   - User-specific overrides

3. **Monitoring & Alerts**
   - Error rate monitoring
   - Performance metrics
   - User activity tracking
   - Automated alerting

4. **Feedback Loops**
   - Daily check-ins with users
   - In-app feedback command
   - Quick iteration capability
   - Support channel ready

---

## Technical Debt & Future Considerations

### Acceptable Technical Debt (for PMF)
- No automated tests initially (manual testing)
- Minimal error recovery (basic retry)
- Simple UI without polish
- English-only interface
- Single timezone support initially

### Must-Have Quality Bar
- Zero data loss
- <500ms response time
- Secure authentication
- Clear error messages
- Mobile responsive

### Future Enhancements (Post-PMF)
- Full web task management
- Voice message support
- Multi-language
- Advanced patterns (recurring tasks)
- Team analytics dashboard
- API for integrations
- Calendar sync

---

## Conclusion

This PMF Sprint focuses on the absolute minimum features needed to validate MillionTasks with real users. By implementing Web View, Sharing, and Smart Reminders in 3 weeks, we can test whether the core value proposition resonates with our target audience.

The aggressive timeline is achievable because:
1. We're building on existing, working infrastructure
2. Each feature has been scoped to MVP essentials
3. The database already supports these features
4. We can leverage Supabase for heavy lifting

Success is not measured by perfect implementation but by proving users will integrate MillionTasks into their daily workflow. Once validated, we can invest in polish, scale, and advanced features with confidence.

**Next Steps:**
1. Review and approve specification
2. Set up development environment for web app
3. Create feature branch for PMF sprint
4. Begin Week 1 implementation Monday
5. Schedule daily standups for sprint duration

*Ready to build? Let's validate MillionTasks in the real world.*