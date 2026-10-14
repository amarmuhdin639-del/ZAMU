// The ZAMU mark: a crown over a bold geometric Z.
//
// Drawn as inline SVG rather than an image file on purpose:
//  - it ships inside the JS bundle, so it cannot 404 and cannot be served
//    stale by the service worker (the old /uploads/zamu-crown-logo.webp
//    once broke for days exactly that way);
//  - it uses currentColor, so it follows the text colour of whatever it
//    sits on: ink-on-cream in the light header, cream-on-ink in the footer
//    (the old bitmap was a black box that glared on the light header);
//  - vectors stay razor sharp at every size, from the 28 px mobile bar to
//    the 64 px footer emblem.
export function CrownLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="ZAMU"
      className={'shrink-0 ' + className}
    >
      {/* crown: three peaks on a flat base */}
      <path fill="currentColor" d="M20 17 L20 11 L26 14 L32 7.5 L38 14 L44 11 L44 17 Z" />
      {/* Z: top bar */}
      <rect fill="currentColor" x="14" y="23" width="36" height="7" />
      {/* Z: diagonal */}
      <path fill="currentColor" d="M50 30 H36.5 L14 47 H27.5 Z" />
      {/* Z: bottom bar */}
      <rect fill="currentColor" x="14" y="47" width="36" height="7" />
    </svg>
  )
}

