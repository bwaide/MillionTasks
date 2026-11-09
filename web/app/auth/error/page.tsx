/**
 * Authentication Error Page
 */

export default function AuthError({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ padding: 'var(--spacing-page-margin-mobile)' }}>
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Authentication Error
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {searchParams.message || 'An error occurred during authentication'}
        </p>
        <p className="mt-4" style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
          Please try again or contact support if the issue persists.
        </p>
      </div>
    </div>
  )
}
