import type { ImgHTMLAttributes } from 'react';

const imageDimensions: Record<string, { width: number; height: number }> = {
  '/images/clinic_treatment_room_1793268957681.jpg': { width: 1200, height: 896 },
  '/images/hero_physiotherapy_care_1793268956879.jpg': { width: 1376, height: 768 },
  '/images/orthocare-anatomy-background.jpg': { width: 768, height: 768 },
  '/images/orthocare-clinic-front.png': { width: 987, height: 657 },
  '/images/physiotherapist_consultation_1793268957627.jpg': { width: 1200, height: 896 },
  '/images/physio_modalities_equipment_1793268959034.jpg': { width: 1200, height: 896 },
};

interface ResponsiveImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height'> {
  src: string;
  sizes?: string;
  priority?: boolean;
}

function getResponsiveSources(src: string, width: number): string {
  const responsivePath = src.replace(/^\/images\//, '/images/responsive/').replace(/\.[^.]+$/, '');
  const candidates = [...new Set([480, 800, 1200].map((candidate) => Math.min(candidate, width)))];
  return candidates.map((candidate) => `${responsivePath}-${candidate}.webp ${candidate}w`).join(', ');
}

export function ResponsiveImage({
  src,
  sizes = '100vw',
  priority = false,
  loading,
  decoding = 'async',
  ...imageProps
}: ResponsiveImageProps) {
  const dimensions = imageDimensions[src] || { width: 1200, height: 800 };
  const srcSet = src.startsWith('/images/') && !src.startsWith('/images/responsive/')
    ? getResponsiveSources(src, dimensions.width)
    : undefined;

  return (
    <picture>
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <img
        {...imageProps}
        src={src}
        width={dimensions.width}
        height={dimensions.height}
        sizes={sizes}
        loading={priority ? 'eager' : loading || 'lazy'}
        decoding={decoding}
        fetchPriority={priority ? 'high' : imageProps.fetchPriority}
      />
    </picture>
  );
}