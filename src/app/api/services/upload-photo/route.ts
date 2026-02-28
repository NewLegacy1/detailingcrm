import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/permissions-server'
import { PERMISSIONS } from '@/lib/permissions'

const SERVICE_PHOTOS_BUCKET = 'service-photos'

/**
 * POST /api/services/upload-photo
 * Body: FormData with one or more file fields (e.g. "files" or "file").
 * Uses service role so upload works regardless of storage RLS.
 * Returns { urls: string[] } public URLs for the uploaded images.
 */
export async function POST(request: Request) {
  const result = await requirePermission(PERMISSIONS.SERVICES_MANAGE)
  if ('error' in result) {
    return result.error
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const files: File[] = []
  const fileList = formData.getAll('files')
  if (fileList.length > 0) {
    for (const f of fileList) if (f instanceof File) files.push(f)
  }
  if (files.length === 0) {
    const single = formData.get('file')
    if (single instanceof File) files.push(single)
  }
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided. Use "file" or "files" in FormData.' }, { status: 400 })
  }

  let supabase
  try {
    supabase = await createServiceRoleClient()
  } catch (err) {
    console.error('Service upload: createServiceRoleClient failed', err)
    return NextResponse.json(
      { error: 'Server configuration error. Ensure SUPABASE_SERVICE_ROLE_KEY is set.' },
      { status: 500 }
    )
  }

  const urls: string[] = []
  const errors: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file.type.startsWith('image/')) {
      errors.push(`${file.name}: not an image`)
      continue
    }
    const path = `${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(SERVICE_PHOTOS_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type })

    if (uploadError) {
      errors.push(`${file.name}: ${uploadError.message}`)
      continue
    }
    const { data: urlData } = supabase.storage.from(SERVICE_PHOTOS_BUCKET).getPublicUrl(uploadData.path)
    urls.push(urlData.publicUrl)
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { error: errors.length > 0 ? errors.join('; ') : 'No images could be uploaded' },
      { status: 400 }
    )
  }

  return NextResponse.json({ urls, errors: errors.length > 0 ? errors : undefined })
}
