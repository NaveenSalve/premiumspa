import sharp from 'sharp';
import crypto from 'crypto';

export interface ImageVariant {
  width: number;
  height: number;
  format: 'webp' | 'avif';
  quality: number;
  suffix: string;
}

export interface ProcessedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ImageVariantsResult {
  original: ProcessedImageResult;
  variants: Record<string, ProcessedImageResult>;
}

const VARIANT_CONFIGS: ImageVariant[] = [
  { width: 150, height: 150, format: 'webp', quality: 75, suffix: 'thumb' },
  { width: 150, height: 150, format: 'avif', quality: 60, suffix: 'thumb-avif' },
  { width: 400, height: 300, format: 'webp', quality: 80, suffix: 'card' },
  { width: 400, height: 300, format: 'avif', quality: 65, suffix: 'card-avif' },
  { width: 800, height: 600, format: 'webp', quality: 82, suffix: 'full' },
  { width: 800, height: 600, format: 'avif', quality: 70, suffix: 'full-avif' },
  { width: 1200, height: 900, format: 'webp', quality: 85, suffix: 'large' },
  { width: 1200, height: 900, format: 'avif', quality: 75, suffix: 'large-avif' },
];

const HERO_VARIANT_CONFIGS: ImageVariant[] = [
  { width: 400, height: 300, format: 'webp', quality: 80, suffix: 'thumb' },
  { width: 400, height: 300, format: 'avif', quality: 65, suffix: 'thumb-avif' },
  { width: 800, height: 450, format: 'webp', quality: 85, suffix: 'card' },
  { width: 800, height: 450, format: 'avif', quality: 70, suffix: 'card-avif' },
  { width: 1400, height: 788, format: 'webp', quality: 88, suffix: 'laptop' },
  { width: 1400, height: 788, format: 'avif', quality: 75, suffix: 'laptop-avif' },
  { width: 1600, height: 900, format: 'webp', quality: 90, suffix: 'desktop' },
  { width: 1600, height: 900, format: 'avif', quality: 80, suffix: 'desktop-avif' },
  { width: 1920, height: 1080, format: 'webp', quality: 90, suffix: 'large' },
  { width: 1920, height: 1080, format: 'avif', quality: 80, suffix: 'large-avif' },
];

const LOGO_VARIANT_CONFIGS: ImageVariant[] = [
  { width: 100, height: 100, format: 'webp', quality: 80, suffix: 'thumb' },
  { width: 100, height: 100, format: 'avif', quality: 65, suffix: 'thumb-avif' },
  { width: 200, height: 200, format: 'webp', quality: 85, suffix: 'card' },
  { width: 200, height: 200, format: 'avif', quality: 70, suffix: 'card-avif' },
  { width: 300, height: 300, format: 'webp', quality: 90, suffix: 'full' },
  { width: 300, height: 300, format: 'avif', quality: 75, suffix: 'full-avif' },
];

export type ImageType = 'service' | 'therapist' | 'hero' | 'logo' | 'general';

export function getVariantConfigs(type: ImageType): ImageVariant[] {
  switch (type) {
    case 'hero':
      return HERO_VARIANT_CONFIGS;
    case 'logo':
      return LOGO_VARIANT_CONFIGS;
    case 'service':
    case 'therapist':
    default:
      return VARIANT_CONFIGS;
  }
}

export function generateStoragePath(
  entityType: string,
  entityId: string,
  originalName: string,
  suffix: string,
  format: string
): string {
  const ext = format === 'avif' ? 'avif' : 'webp';
  const hash = crypto.createHash('md5').update(originalName + Date.now().toString()).digest('hex').slice(0, 8);
  const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50);
  return `${entityType}/${entityId}/${baseName}-${hash}-${suffix}.${ext}`;
}

export async function processImage(
  inputBuffer: Buffer,
  type: ImageType = 'general'
): Promise<ImageVariantsResult> {
  const configs = getVariantConfigs(type);
  
  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;
  
  const originalResult = await sharp(inputBuffer)
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  
  const variants: Record<string, ProcessedImageResult> = {};
  
  for (const config of configs) {
    const processed = await sharp(inputBuffer)
      .resize(config.width, config.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      [config.format]({ quality: config.quality })
      .toBuffer({ resolveWithObject: true });
    
    variants[config.suffix] = {
      buffer: processed.data,
      width: processed.info.width,
      height: processed.info.height,
      format: config.format,
      size: processed.info.size,
    };
  }
  
  return {
    original: {
      buffer: originalResult.data,
      width: originalResult.info.width,
      height: originalResult.info.height,
      format: 'webp',
      size: originalResult.info.size,
    },
    variants,
  };
}

export async function uploadImageVariants(
  supabaseClient: any,
  bucket: string,
  entityType: string,
  entityId: string,
  originalName: string,
  result: ImageVariantsResult
): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  
  const originalPath = generateStoragePath(entityType, entityId, originalName, 'original', 'webp');
  const { error: originalError } = await supabaseClient.storage
    .from(bucket)
    .upload(originalPath, result.original.buffer, {
      contentType: 'image/webp',
      upsert: true,
    });
  
  if (originalError) {
    throw new Error(`Failed to upload original: ${originalError.message}`);
  }
  urls.original = getPublicUrl(supabaseClient, bucket, originalPath);
  
  for (const [suffix, variant] of Object.entries(result.variants)) {
    const path = generateStoragePath(entityType, entityId, originalName, suffix, variant.format);
    const contentType = variant.format === 'avif' ? 'image/avif' : 'image/webp';
    
    const { error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, variant.buffer, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error(`[image] Failed to upload variant ${suffix}:`, error);
      continue;
    }
    urls[suffix] = getPublicUrl(supabaseClient, bucket, path);
  }
  
  return urls;
}

export function getPublicUrl(client: any, bucket: string, path: string): string {
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteImageVariants(
  supabaseClient: any,
  bucket: string,
  entityType: string,
  entityId: string
): Promise<void> {
  const { data: files, error } = await supabaseClient.storage
    .from(bucket)
    .list(`${entityType}/${entityId}`);
  
  if (error || !files || files.length === 0) return;
  
  const paths = files.map(f => `${entityType}/${entityId}/${f.name}`);
  const { error: deleteError } = await supabaseClient.storage
    .from(bucket)
    .remove(paths);
  
  if (deleteError) {
    console.error('[image] Failed to delete variants:', deleteError);
  }
}