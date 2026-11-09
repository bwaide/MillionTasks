/**
 * Dashboard Client Component
 * Handles real-time updates and interactivity
 */

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/Header'
import { TaskList } from '@/components/TaskList'
import type { Task, User } from '@/lib/types/database'

interface DashboardClientProps {
  initialTasks: Task[]
  user: User
  userId: string
}

export function DashboardClient({ initialTasks, user, userId }: DashboardClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'done'>('all')
  const supabase = createClient()

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `created_by=eq.${userId}`,
        },
        (payload) => {
          console.log('Task change:', payload)

          if (payload.eventType === 'INSERT') {
            setTasks((current) => [payload.new as Task, ...current])
          } else if (payload.eventType === 'UPDATE') {
            setTasks((current) =>
              current.map((task) =>
                task.id === payload.new.id ? (payload.new as Task) : task
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTasks((current) =>
              current.filter((task) => task.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  // Filter tasks
  const filteredTasks =
    filter === 'all'
      ? tasks
      : tasks.filter((task) => task.status === filter)

  // Calculate stats
  const stats = {
    total: tasks.length,
    open: tasks.filter((t) => t.status === 'open').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      <Header userName={user.username} />

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'var(--spacing-6) var(--spacing-page-margin-mobile)',
        }}
      >
        {/* Page Header */}
        <div style={{ marginBottom: 'var(--spacing-6)' }}>
          <h1
            style={{
              fontSize: 'var(--font-size-3xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            Your Tasks
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {stats.total} total • {stats.open} open • {stats.inProgress} in progress • {stats.done} done
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-2)',
            marginBottom: 'var(--spacing-4)',
            borderBottom: '1px solid var(--color-border-subtle)',
            paddingBottom: 'var(--spacing-2)',
          }}
        >
          {(['all', 'open', 'in_progress', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: 'var(--spacing-1) var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                color:
                  filter === f
                    ? 'var(--color-accent-primary)'
                    : 'var(--color-text-secondary)',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  filter === f
                    ? '2px solid var(--color-accent-primary)'
                    : '2px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Task List */}
        <TaskList
          tasks={filteredTasks}
          groupBy="status"
          emptyMessage={
            filter === 'all'
              ? 'No tasks yet'
              : `No ${filter.replace('_', ' ')} tasks`
          }
        />
      </main>
    </div>
  )
}
