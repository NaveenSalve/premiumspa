import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn('[supabase] SUPABASE_URL not set — image upload will use fallback/local storage');
}

if (!supabaseServiceKey) {
  console.warn('[supabase] SUPABASE_SERVICE_ROLE_KEY not set — admin operations may fail');
}

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  : null;

export const supabaseAnon = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    })
  : null;

export const IMAGES_BUCKET = 'spa-images';

export async function ensureBucketExists(): Promise<void> {
  if (!supabase) return;
  
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === IMAGES_BUCKET);
  
  if (!exists) {
    const { error } = await supabase.storage.createBucket(IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    });
    
    if (error && !error.message.includes('already exists')) {
      console.error('[supabase] Failed to create bucket:', error);
    } else {
      console.log('[supabase] Created bucket:', IMAGES_BUCKET);
    }
  }
}

export function getPublicUrl(bucket: string, path: string): string {
  if (!supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}