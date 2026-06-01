import { supabase } from '@/lib/supabase'

export async function uploadToBucket(
  bucket: 'book-covers' | 'book-pdfs',
  path: string,
  file: File,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
