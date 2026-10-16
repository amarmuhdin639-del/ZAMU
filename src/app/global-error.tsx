'use client'

/**
 * Root crash screen — renders its own <html>/<body>, so it cannot rely on
 * the app's fonts, Tailwind or providers. Inline styles only, on brand.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#141412',
          color: '#f4f1e6',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          margin: 0,
        }}
      >
        <div>
          <p style={{ letterSpacing: '0.35em', fontSize: 11, fontWeight: 700, color: '#e0a458' }}>
            ZAMU
          </p>
          <h1 style={{ fontSize: 30, margin: '14px 0 10px', letterSpacing: '-0.01em' }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.7, fontSize: 14, margin: 0 }}>የሆነ ችግር ተከስቷል።</p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '12px 26px',
              borderRadius: 999,
              border: '1px solid #f4f1e6',
              background: 'transparent',
              color: '#f4f1e6',
              fontWeight: 700,
              letterSpacing: '0.15em',
              fontSize: 12,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
