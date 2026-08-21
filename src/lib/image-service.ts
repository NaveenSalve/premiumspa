import { db } from '../db/index.ts';
import { imageAssets } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { supabase, IMAGES_BUCKET, ensureBucketExists } from './supabase.ts';
import {
  processImage,
  uploadImageVariants,
  deleteImageVariants,
  generateStoragePath,
  getPublicUrl,
  ImageType,
  ImageVariantsResult,
} from './image-processing.ts';

export interface UploadImageOptions {
  file: Buffer;
  originalName: string;
  mimeType: string;
  entityType: 'service' | 'therapist' | 'site_setting' | 'hero';
  entityId: string;
  entityField: string;
  imageType?: ImageType;
}

export interface ImageAssetRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  storagePath: string;
  bucket: string;
  variants: Record<string, { url: string; width: number; height: number; format: string; size: number }>;
  entityType: string | null;
  entityId: string | null;
  entityField: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function uploadAndProcessImage(
  options: UploadImageOptions
): Promise<{ asset: ImageAssetRecord; urls: Record<string, string> }> {
  if (!supabase) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  await ensureBucketExists();
  
  const imageType = options.imageType || 
    (options.entityType === 'hero' ? 'hero' : 
     options.entityType === 'site_setting' && options.entityField.includes('Logo') ? 'logo' : 
     'general');
  
  const result: ImageVariantsResult = await processImage(options.file, imageType);
  
  const urls = await uploadImageVariants(
    supabase,
    IMAGES_BUCKET,
    options.entityType,
    options.entityId,
    options.originalName,
    result
  );
  
  const variantsMeta: Record<string, { url: string; width: number; height: number; format: string; size: number }> = {};
  for (const [suffix, variant] of Object.entries(result.variants)) {
    variantsMeta[suffix] = {
      url: urls[suffix],
      width: variant.width,
      height: variant.height,
      format: variant.format,
      size: variant.size,
    };
  }
  variantsMeta.original = {
    url: urls.original,
    width: result.original.width,
    height: result.original.height,
    format: result.original.format,
    size: result.original.size,
  };
  
  const assetId = `img-${crypto.randomUUID()}`;
  const storagePath = generateStoragePath(options.entityType, options.entityId, options.originalName, 'original', 'webp');
  
  await db.insert(imageAssets).values({
    id: assetId,
    originalName: options.originalName,
    mimeType: options.mimeType,
    size: options.file.length,
    width: result.original.width,
    height: result.original.height,
    storagePath,
    bucket: IMAGES_BUCKET,
    variants: JSON.stringify(variantsMeta),
    entityType: options.entityType,
    entityId: options.entityId,
    entityField: options.entityField,
  });
  
  const asset: ImageAssetRecord = {
    id: assetId,
    originalName: options.originalName,
    mimeType: options.mimeType,
    size: options.file.length,
    width: result.original.width,
    height: result.original.height,
    storagePath,
    bucket: IMAGES_BUCKET,
    variants: variantsMeta,
    entityType: options.entityType,
    entityId: options.entityId,
    entityField: options.entityField,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  return { asset, urls };
}

export async function getImageAsset(id: string): Promise<ImageAssetRecord | null> {
  const rows = await db.select().from(imageAssets).where(eq(imageAssets.id, id)).limit(1);
  if (!rows[0]) return null;
  
  const row = rows[0];
  return {
    ...row,
    variants: JSON.parse(row.variants),
  };
}

export async function getImageAssetsByEntity(
  entityType: string,
  entityId: string
): Promise<ImageAssetRecord[]> {
  const rows = await db
    .select()
    .from(imageAssets)
    .where(and(eq(imageAssets.entityType, entityType), eq(imageAssets.entityId, entityId)));
  
  return rows.map(row => ({
    ...row,
    variants: JSON.parse(row.variants),
  }));
}

export async function deleteImageAsset(id: string): Promise<boolean> {
  if (!supabase) return false;
  
  const asset = await getImageAsset(id);
  if (!asset) return false;
  
  await deleteImageVariants(supabase, asset.bucket, asset.entityType || 'general', asset.entityId || asset.id);
  
  await db.delete(imageAssets).where(eq(imageAssets.id, id));
  
  return true;
}

export async function deleteImagesByEntity(entityType: string, entityId: string): Promise<number> {
  if (!supabase) return 0;
  
  const assets = await getImageAssetsByEntity(entityType, entityId);
  let deleted = 0;
  
  for (const asset of assets) {
    await deleteImageVariants(supabase, asset.bucket, entityType, entityId);
    await db.delete(imageAssets).where(eq(imageAssets.id, asset.id));
    deleted++;
  }
  
  return deleted;
}

export async function replaceImageAsset(
  oldAssetId: string,
  options: UploadImageOptions
): Promise<{ asset: ImageAssetRecord; urls: Record<string, string> }> {
  await deleteImageAsset(oldAssetId);
  return uploadAndProcessImage(options);
}

export function getResponsiveImageSrcSet(asset: ImageAssetRecord, type: 'thumbnail' | 'card' | 'full' | 'large' = 'card'): string {
  const variants = asset.variants;
  const entries: string[] = [];
  
  const suffixMap: Record<string, string[]> = {
    thumbnail: ['thumb', 'thumb-avif'],
    card: ['card', 'card-avif'],
    full: ['full', 'full-avif'],
    large: ['large', 'large-avif'],
  };
  
  const suffixes = suffixMap[type] || ['card', 'card-avif'];
  
  for (const suffix of suffixes) {
    const variant = variants[suffix];
    if (variant) {
      entries.push(`${variant.url} ${variant.width}w`);
    }
  }
  
  return entries.join(', ');
}

export function getResponsiveImageSources(asset: ImageAssetRecord): {
  webp: { srcSet: string; sizes: string };
  avif: { srcSet: string; sizes: string };
  fallback: string;
} {
  const variants = asset.variants;
  
  const webpEntries: string[] = [];
  const avifEntries: string[] = [];
  
  for (const [suffix, variant] of Object.entries(variants)) {
    if (suffix === 'original') continue;
    if (variant.format === 'webp') {
      webpEntries.push(`${variant.url} ${variant.width}w`);
    } else if (variant.format === 'avif') {
      avifEntries.push(`${variant.url} ${variant.width}w`);
    }
  }
  
  const fallback = variants.full?.url || variants.card?.url || variants.original?.url || '';
  
  return {
    webp: { srcSet: webpEntries.join(', '), sizes: '(max-width: 400px) 150px, (max-width: 800px) 400px, (max-width: 1200px) 800px, 1200px' },
    avif: { srcSet: avifEntries.join(', '), sizes: '(max-width: 400px) 150px, (max-width: 800px) 400px, (max-width: 1200px) 800px, 1200px' },
    fallback,
  };
}

export function getPreloadLinks(asset: ImageAssetRecord): string[] {
  const variants = asset.variants;
  const links: string[] = [];
  
  const priorityVariants = ['large', 'large-avif', 'desktop', 'desktop-avif', 'full', 'full-avif'];
  
  for (const suffix of priorityVariants) {
    const variant = variants[suffix];
    if (variant && (variant.format === 'webp' || variant.format === 'avif')) {
      links.push(`<${variant.url}>; rel=preload; as=image; type=image/${variant.format}`);
    }
  }
  
  return links;
}