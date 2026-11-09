/**
 * Landing Page
 * Simple authentication entry point
 */

export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-page-margin-mobile)',
        background: 'var(--color-bg-primary)',
      }}
    >
      <main
        style={{
          textAlign: 'center',
          maxWidth: '600px',
        }}
      >
        {/* Logo/Title */}
        <h1
          style={{
            fontSize: 'var(--font-size-3xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-3)',
            letterSpacing: 'var(--letter-spacing-tight)',
          }}
        >
          MillionTasks
        </h1>

        {/* Tagline */}
        <p
          className="text-balance"
          style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-6)',
            lineHeight: 'var(--line-height-relaxed)',
          }}
        >
          AI-powered task management that lives in your messenger
        </p>

        {/* Instructions */}
        <div
          style={{
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-4)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: 'var(--shadow-default)',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Get Started
          </h2>
          <ol
            style={{
              textAlign: 'left',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-secondary)',
              lineHeight: 'var(--line-height-relaxed)',
              paddingLeft: 'var(--spacing-3)',
            }}
          >
            <li style={{ marginBottom: 'var(--spacing-1)' }}>
              Open Telegram and find <strong>@MillionTasksBot</strong>
            </li>
            <li style={{ marginBottom: 'var(--spacing-1)' }}>
              Send <code style={{
                background: 'var(--color-bg-secondary)',
                padding: '0.125rem 0.375rem',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--font-size-sm)',
              }}>/start</code> to create your account
            </li>
            <li>
              Request a magic link to view your tasks on the web
            </li>
          </ol>
        </div>

        {/* Features */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--spacing-3)',
            marginTop: 'var(--spacing-6)',
          }}
        >
          <div
            style={{
              padding: 'var(--spacing-3)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xl)',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              ✨
            </div>
            <h3
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              AI-First
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                lineHeight: 'var(--line-height-relaxed)',
              }}
            >
              Natural language processing powered by Claude
            </p>
          </div>

          <div
            style={{
              padding: 'var(--spacing-3)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xl)',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              📱
            </div>
            <h3
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              Messenger-First
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                lineHeight: 'var(--line-height-relaxed)',
              }}
            >
              Manage tasks without leaving Telegram
            </p>
          </div>

          <div
            style={{
              padding: 'var(--spacing-3)',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-xl)',
                marginBottom: 'var(--spacing-1)',
              }}
            >
              🔄
            </div>
            <h3
              style={{
                fontSize: 'var(--font-size-base)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: '0.25rem',
              }}
            >
              Real-Time
            </h3>
            <p
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                lineHeight: 'var(--line-height-relaxed)',
              }}
            >
              Instant sync across all devices
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
