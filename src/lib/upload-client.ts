// Client-side image prep before upload.
//
// Why: Netlify serverless functions cap request bodies at ~6 MB, and modern
// phone photos are 3-10 MB - so big photos silently fail to upload. The
// browser resizes them here (max 1600 px on the long edge, JPEG ~82%)
// before they travel, which lands almost every photo well under 1 MB.
// Videos, animated GIFs, small images and anything that fails to decode
// pass through untouched.

const MAX_EDGE = 1600
const QUALITY = 0.82
const PASSTHROUGH_TYPES = new Set(['image/gif'])

export async function compressForUpload(file: File): Promise<File> {
  try {
    if (!file.type.startsWith('image/') || PASSTHROUGH_TYPES.has(file.type)) return file
    // small files go as-is; PNGs up to 3 MB keep their transparency untouched
    if (file.size <= 1024 * 1024) return file
    if (file.type === 'image/png' && file.size <= 3 * 1024 * 1024) return file
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY)
    )
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file // never block an upload because pre-processing failed
  }
}
