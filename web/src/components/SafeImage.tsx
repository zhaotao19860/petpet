import { useEffect, useMemo, useState } from 'react';

function unique(items: string[]) {
  return items.filter((item, index, list) => item && list.indexOf(item) === index);
}

export function buildImageFallbacks(src?: string) {
  const primary = src ?? '/assets/scenes/media-fallback.png';
  const fallbacks: string[] = [];
  const fullSizePrimary = primary.includes('/thumbs/') ? primary.replace('/thumbs/', '/') : primary;

  if (fullSizePrimary !== primary) {
    fallbacks.push(fullSizePrimary);
  }
  if (/\.webp($|\?)/.test(fullSizePrimary)) {
    fallbacks.push(fullSizePrimary.replace(/\/([^/]+\.webp)$/, '/thumbs/$1'));
    fallbacks.push(fullSizePrimary.replace(/\.webp($|\?)/, '.png$1'));
    fallbacks.push(fullSizePrimary.replace(/\.webp($|\?)/, '.svg$1'));
  }
  if (/\.webp($|\?)/.test(primary)) {
    fallbacks.push(primary.replace(/\.webp($|\?)/, '.png$1'));
    fallbacks.push(primary.replace(/\.webp($|\?)/, '.svg$1'));
  }
  if (/\.png($|\?)/.test(primary)) {
    fallbacks.push(primary.replace(/\.png($|\?)/, '.svg$1'));
  }
  fallbacks.push('/assets/scenes/media-fallback.svg');

  return unique([primary, ...fallbacks]);
}

export function SafeImage({ src, alt, className, loading = 'lazy' }: { src?: string; alt: string; className?: string; loading?: 'eager' | 'lazy' }) {
  const sources = useMemo(() => buildImageFallbacks(src), [src]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const currentSrc = sources[Math.min(sourceIndex, sources.length - 1)];

  useEffect(() => {
    setSourceIndex(0);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        setSourceIndex((current) => Math.min(current + 1, sources.length - 1));
      }}
    />
  );
}
