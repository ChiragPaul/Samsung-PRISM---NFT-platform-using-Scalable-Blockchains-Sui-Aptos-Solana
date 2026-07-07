import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';
import { isValidPublicKey } from '../lib/utils';

export interface NftOwnership {
  /** Current owner's wallet address, or null if unknown. */
  owner: string | null;
  /** True when the current viewer is the owner. */
  isYou: boolean;
  isLoading: boolean;
}

/**
 * Resolves the current OWNER of an NFT — the heart of an NFT platform. Reads
 * the real on-chain holder via getTokenLargestAccounts → the token account
 * holding the 1 supply → its owner.
 */
export function useNftOwner(mint: string | null | undefined): NftOwnership {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const query = useQuery<string | null>({
    queryKey: ['owner', mint],
    enabled: Boolean(mint) && isValidPublicKey(mint ?? ''),
    queryFn: async () => {
      const mintPk = new PublicKey(mint!);
      const largest = await connection.getTokenLargestAccounts(mintPk);
      const holder = largest.value.find((a) => a.uiAmount === 1) ?? largest.value[0];
      if (!holder) return null;
      const info = await connection.getParsedAccountInfo(holder.address);
      const data = info.value?.data;
      if (data && 'parsed' in data) {
        return (data.parsed?.info?.owner as string) ?? null;
      }
      return null;
    },
  });

  const owner = query.data ?? null;
  const me = publicKey?.toBase58() ?? null;

  return {
    owner,
    isYou: Boolean(owner && me && owner === me),
    isLoading: query.isLoading,
  };
}
