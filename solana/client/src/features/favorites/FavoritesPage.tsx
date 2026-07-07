import { useFavoritesStore } from '../../stores/favoritesStore';
import { NftTile } from '../../components/NftTile';
import { FavoriteButton } from '../../components/FavoriteButton';
import { EmptyState } from '../../components/ui/states';
import { CollectionOrganizer } from './CollectionOrganizer';
import { Link } from 'react-router-dom';

export function FavoritesPage() {
  const favorites = useFavoritesStore((s) => s.mints);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Favorites</h1>
        <p className="text-sm text-zinc-500">
          Stored locally in your browser. Get notified when a favorited item sells or changes price.
        </p>
      </div>

      {favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on any NFT to save it here."
          icon="♥"
          action={
            <Link to="/" className="btn-primary">
              Browse marketplace
            </Link>
          }
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-400">
              All favorites ({favorites.length})
            </h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {favorites.map((mint) => (
                <div key={mint} className="card relative p-2">
                  <div className="absolute right-1 top-1 z-10">
                    <FavoriteButton mint={mint} className="h-7 w-7 text-sm" />
                  </div>
                  <NftTile mint={mint} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-zinc-400">
              Collection organizer
            </h2>
            <p className="mb-3 text-xs text-zinc-500">
              Drag favorites into custom local collections. Reorder freely — it all saves
              automatically.
            </p>
            <CollectionOrganizer />
          </section>
        </>
      )}
    </div>
  );
}
