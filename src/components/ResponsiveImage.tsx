import React from 'react';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

interface ImageVariant {
  url: string;
  width: number;
  height: number;
  format: 'webp' | 'avif';
}

function generateSrcSet(variants: ImageVariant[]): string {
  return variants
    .filter(v => v.url)
    .map(v => `${v.url} ${v.width}w`)
    .join(', ');
}

function getVariantUrls(src: string, width: number, height: number): ImageVariant[] {
  if (!src) return [];
  
  const baseUrl = src.split('?')[0];
  const isSupabaseUrl = baseUrl.includes('supabase.co') || baseUrl.includes('supabase.in');
  
  if (!isSupabaseUrl) {
    return [{ url: src, width, height, format: 'webp' }];
  }
  
  const ext = baseUrl.split('.').pop() || 'webp';
  const basePath = baseUrl.replace(/\.[^.]+$/, '');
  
  const variants: ImageVariant[] = [];
  
  const sizes = [150, 400, 800, 1200];
  for (const size of sizes) {
    if (size <= width * 1.5) {
      variants.push(
        { url: `${basePath}-${size}w.webp`, width: size, height: Math.round(size * height / width), format: 'webp' },
        { url: `${basePath}-${size}w.avif`, width: size, height: Math.round(size * height / width), format: 'avif' }
      );
    }
  }
  
  variants.push({ url: src, width, height, format: 'webp' });
  
  return variants;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  width = 800,
  height = 600,
  className = '',
  priority = false,
  sizes = '(max-width: 400px) 150px, (max-width: 800px) 400px, (max-width: 1200px) 800px, 1200px',
  loading = 'lazy',
  placeholder,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [showPlaceholder, setShowPlaceholder] = React.useState(!!placeholder && !priority);
  
  const variants = React.useMemo(() => getVariantUrls(src, width, height), [src, width, height]);
  const webpVariants = variants.filter(v => v.format === 'webp');
  const avifVariants = variants.filter(v => v.format === 'avif');
  
  const handleLoad = () => {
    setIsLoaded(true);
    setShowPlaceholder(false);
    onLoad?.();
  };
  
  const handleError = () => {
    setHasError(true);
    setShowPlaceholder(false);
    onError?.();
  };
  
  if (hasError && placeholder) {
    return (
      <div className={className} style={{ width, height, backgroundColor: '#f0f0f0' }}>
        <img
          src={placeholder}
          alt=""
          className="w-full h-full object-cover opacity-50"
        />
      </div>
    );
  }
  
  return (
    <picture className={className}>
      {avifVariants.length > 0 && (
        <source
          type="image/avif"
          srcSet={generateSrcSet(avifVariants)}
          sizes={sizes}
        />
      )}
      {webpVariants.length > 0 && (
        <source
          type="image/webp"
          srcSet={generateSrcSet(webpVariants)}
          sizes={sizes}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        sizes={sizes}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${showPlaceholder ? 'opacity-0' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        style={{ opacity: isLoaded || hasError ? 1 : 0 }}
      />
      {showPlaceholder && placeholder && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-500"
          style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
        />
      )}
    </picture>
  );
};

export const HeroImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}> = ({ src, alt, className = '', placeholder }) => {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={1600}
      height={900}
      priority={true}
      loading="eager"
      sizes="100vw"
      className={className}
      placeholder={placeholder}
    />
  );
};

export const CardImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
}> = ({ src, alt, className = '', aspectRatio = 'landscape' }) => {
  const dimensions = {
    square: { width: 400, height: 400 },
    landscape: { width: 400, height: 300 },
    portrait: { width: 300, height: 400 },
  };
  
  const { width, height } = dimensions[aspectRatio];
  
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={`(max-width: 640px) ${width}px, ${width}px`}
    />
  );
};

export const ThumbnailImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  size?: number;
}> = ({ src, alt, className = '', size = 150 }) => {
  return (
    <ResponsiveImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      sizes={`${size}px`}
    />
  );
};

export function generatePreloadLinks(images: Array<{ src: string; as?: 'image' | 'fetch' }>): React.ReactElement[] {
  return images.map(({ src, as = 'image' }, index) => (
    <link
      key={index}
      rel="preload"
      as={as}
      href={src}
      type={src.includes('.avif') ? 'image/avif' : src.includes('.webp') ? 'image/webp' : 'image/jpeg'}
    />
  ));
}