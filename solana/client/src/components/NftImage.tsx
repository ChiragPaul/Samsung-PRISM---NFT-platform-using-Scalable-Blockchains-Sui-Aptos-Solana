import { useState } from 'react';
import { cn } from '../lib/utils';

interface NftImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

/**
 * Lazy-loaded NFT image with a skeleton placeholder until it loads and a
 * graceful gradient fallback when the IPFS/Arweave asset is missing or 404s.
 */
export function NftImage({ src, alt, className }: NftImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-brand-400/20 to-accent/20 text-4xl',
          className,
        )}
        role="img"
        aria-label={`${alt} (no image available)`}
      >
        🖼️
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded && <div className="skeleton absolute inset-0" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
