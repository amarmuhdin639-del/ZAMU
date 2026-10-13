// Client-side media prep + upload.
//
// Why this exists: Netlify serverless functions cap request bodies at ~6 MB.
// Modern phone photos are 3-10 MB and videos are 20-100 MB, so big files
// silently failed to upload. Two fixes live here:
//   1. Images are resized in the browser (max 1600 px long edge, JPEG ~82%),
//      which lands almost every photo well under 1 MB.
//   2. Anything still too big (videos, huge images) is uploaded in ~4 MB
//      chunks that the server reassembles into the MediaAsset database.
// Videos, animated GIFs, small images and anything that fails to decode
// pass through compression untouched.

const MAX_EDGE = 1600
const QUALITY = 0.82
const PASSTHROUGH_TYPES = new Set(['image/gif'])
// Stay safely under Netlify's ~6 MB function body cap.
const CHUNK_SIZE = 4 * 1024 * 1024

export type UploadResult = { url: string; type: string }

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

// One entry point for every admin upload (product media, hero/site, categories).
export async function uploadMedia(file: File, target: 'products' | 'site' | 'categories'): Promise<UploadResult> {
  const prepared = await compressForUpload(file)
  if (prepared.size <= CHUNK_SIZE) return singleShot(prepared, target)
  return chunkedUpload(prepared, target)
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function singleShot(file: File, target: string): Promise<UploadResult> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('target', target)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  const data = await parseJson(res)
  if (!res.ok || !data.url) throw new Error((data.error as string) ?? 'Upload failed — please try again')
  return { url: String(data.url), type: String(data.type ?? 'image') }
}

async function chunkedUpload(file: File, target: string): Promise<UploadResult> {
  const cryptoObj = globalThis.crypto
  const rawId =
    cryptoObj && typeof cryptoObj.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`
  const chunkId = rawId.replace(/-/g, '')
  const total = Math.ceil(file.size / CHUNK_SIZE)

  for (let index = 0; index < total; index++) {
    const blob = file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE))
    const fd = new FormData()
    fd.append('chunkId', chunkId)
    fd.append('index', String(index))
    fd.append('total', String(total))
    fd.append('chunk', blob, 'chunk.bin')
    const res = await fetch('/api/admin/upload-chunk', { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await parseJson(res)
      throw new Error((data.error as string) ?? `Chunk ${index + 1}/${total} failed — please retry`)
    }
  }

  const res = await fetch('/api/admin/upload-final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chunkId, filename: file.name, mime: file.type, size: file.size, target }),
  })
  const data = await parseJson(res)
  if (!res.ok || !data.url) throw new Error((data.error as string) ?? 'Upload failed — please try again')
  return { url: String(data.url), type: String(data.type ?? 'video') }
}
