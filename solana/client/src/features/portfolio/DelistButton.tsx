import { useDelistNft } from '../../hooks/useDelistNft';
import { Spinner } from '../../components/ui/Spinner';
import type { Listing } from '../../types';

/** Delist action for one of the user's own listings, with inline busy state. */
export function DelistButton({ listing }: { listing: Listing }) {
  const { delist, status } = useDelistNft();
  const isBusy = status.stage !== 'idle' && status.stage !== 'error';

  return (
    <button
      type="button"
      className="btn-danger w-full"
      disabled={isBusy}
      onClick={() => delist(listing)}
    >
      {isBusy ? <Spinner /> : 'Delist'}
    </button>
  );
}
