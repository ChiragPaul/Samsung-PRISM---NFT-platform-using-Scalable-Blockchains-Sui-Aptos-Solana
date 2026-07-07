import { useFavoritesStore } from '../stores/favoritesStore';
import { cn } from '../lib/utils';

/** Heart toggle backed by the local-first favorites store. */
export function FavoriteButton({ mint, className }: { mint: string; className?: string }) {
  const isFavorite = useFavoritesStore((s) => s.mints.includes(mint));
  const toggle = useFavoritesStore((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(mint);
      }}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-lg backdrop-blur transition-transform hover:scale-110 dark:bg-zinc-900/80',
        className,
      )}
    >
      <span className={isFavorite ? 'text-red-500' : 'text-zinc-400'}>
        {isFavorite ? '♥' : '♡'}
      </span>
    </button>
  );
}
