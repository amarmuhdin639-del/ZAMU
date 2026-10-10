// Shared media helpers — safe for server and client components.

const VIDEO_RE = /\.(mp4|m4v|mov|webm)(\?|#|$)/i

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false
  return VIDEO_RE.test(url)
}
