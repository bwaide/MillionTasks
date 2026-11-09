/**
 * TaskCard Component
 * The atomic unit of the MillionTasks interface
 * Features physics-based animations responding to AI confidence
 */

'use client'

import { motion } from 'framer-motion'
import type { Task } from '@/lib/types/database'

interface TaskCardProps {
  task: Task
}

export function TaskCard({ task }: TaskCardProps) {
  // Determine AI confidence class
  const aiConfidence = task.ai_confidence || 0
  const confidenceClass =
    aiConfidence >= 0.9
      ? 'ai-confidence-high'
      : aiConfidence >= 0.7
      ? 'ai-confidence-medium'
      : 'ai-confidence-low'

  // Status color mapping
  const statusColors = {
    open: 'var(--color-status-todo)',
    in_progress: 'var(--color-status-in-progress)',
    done: 'var(--color-status-done)',
    cancelled: 'var(--color-status-cancelled)',
  }

  // Priority badges (1=highest, 5=lowest)
  const priorityLabels = {
    1: '⚠️⚠️⚠️',
    2: '⚠️⚠️',
    3: '⚠️',
    4: '◦',
    5: '',
  }

  return (
    <motion.article
      className={`task-card ${confidenceClass}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: 'var(--color-bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-3)',
        boxShadow: 'var(--shadow-default)',
        border: '1px solid var(--color-border-subtle)',
        cursor: 'pointer',
        position: 'relative',
      }}
      whileHover={{
        boxShadow: 'var(--shadow-elevated)',
        y: -2,
      }}
    >
      {/* Status Indicator */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderBottomLeftRadius: 'var(--radius-lg)',
          background: statusColors[task.status],
        }}
      />

      {/* Task Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--spacing-2)',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
            lineHeight: 'var(--line-height-tight)',
            flex: 1,
          }}
        >
          {task.title}
        </h3>

        {/* Priority Badge */}
        <span
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>

      {/* Task Description */}
      {task.description && (
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            lineHeight: 'var(--line-height-relaxed)',
            marginBottom: 'var(--spacing-2)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Task Metadata */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-tertiary)',
        }}
      >
        {/* Status Label */}
        <span
          style={{
            textTransform: 'capitalize',
            color: statusColors[task.status],
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {task.status.replace('_', ' ')}
        </span>

        {/* Due Date */}
        {task.due_date && (
          <>
            <span>•</span>
            <span>
              Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </>
        )}

        {/* AI Confidence Indicator (when low) */}
        {aiConfidence > 0 && aiConfidence < 0.7 && (
          <>
            <span>•</span>
            <span
              style={{
                color: 'var(--color-ai-active)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span style={{ fontSize: '0.6rem' }}>✨</span>
              AI Review
            </span>
          </>
        )}
      </div>
    </motion.article>
  )
}
