/**
 * TaskList Component
 * Groups and displays tasks by project/status
 */

'use client'

import { TaskCard } from './TaskCard'
import type { Task } from '@/lib/types/database'

interface TaskListProps {
  tasks: Task[]
  groupBy?: 'project' | 'status' | 'priority'
  emptyMessage?: string
}

export function TaskList({ tasks, groupBy = 'status', emptyMessage }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 'var(--spacing-8) var(--spacing-4)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-2xl)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          ✓
        </div>
        <h3
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          {emptyMessage || 'No tasks yet'}
        </h3>
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Your tasks will appear here
        </p>
      </div>
    )
  }

  // Group tasks
  const grouped = tasks.reduce((acc, task) => {
    const key = task[groupBy === 'project' ? 'project_id' : groupBy] || 'none'
    if (!acc[key]) acc[key] = []
    acc[key].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-6)',
      }}
    >
      {Object.entries(grouped).map(([group, groupTasks]) => (
        <section key={group}>
          {/* Group Header */}
          <h2
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-wide)',
              color: 'var(--color-text-tertiary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {group === 'none' ? 'Uncategorized' : group.replace('_', ' ')}
            <span
              style={{
                marginLeft: 'var(--spacing-1)',
                fontWeight: 'var(--font-weight-normal)',
              }}
            >
              ({groupTasks.length})
            </span>
          </h2>

          {/* Task Cards */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            {groupTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
