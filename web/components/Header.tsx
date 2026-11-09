/**
 * Header Component
 * Navigation header with minimalist design
 */

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface HeaderProps {
  userName?: string
}

export function Header({ userName }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
        background: 'var(--color-bg-elevated)',
        borderBottom: '1px solid var(--color-border-subtle)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-3) var(--spacing-page-margin-mobile)',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            letterSpacing: 'var(--letter-spacing-tight)',
          }}
        >
          MillionTasks
        </Link>

        {/* User Info */}
        {userName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {userName}
            </span>
          </div>
        )}
      </div>
    </motion.header>
  )
}
