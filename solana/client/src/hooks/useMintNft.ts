import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useQueryClient } from '@tanstack/react-query';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import {
  createNft,
  mplTokenMetadata,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createGenericFile,
  generateSigner,
  percentAmount,
} from '@metaplex-foundation/umi';
import { config } from '../lib/config';
import { mapTxError } from '../lib/solana/errors';
import { notify } from '../lib/notifications';
import { fireConfetti } from '../lib/confetti';
import { explorerUrl } from '../lib/config';
import { queryKeys } from '../lib/queryClient';

export interface MintInput {
  name: string;
  symbol: string;
  description: string;
  royaltyPercent: number;
  /** Trait list stored in the off-chain metadata. */
  attributes: { trait_type: string; value: string }[];
  /** Upload this image file to Irys (preferred). */
  imageFile?: File | null;
  /** …or point at an already-hosted image URL. */
  imageUrl?: string;
  /**
   * Advanced: use an already-hosted metadata JSON URI directly and skip all
   * uploads. The fastest, most reliable path when you don't want to fund Irys.
   */
  metadataUri?: string;
}

export type MintStage = 'idle' | 'uploading' | 'minting' | 'confirming' | 'done' | 'error';

export interface MintStatus {
  stage: MintStage;
  error?: string;
  signature?: string;
  mintAddress?: string;
}

/**
 * Mints a real 1/1 NFT into the connected wallet using Metaplex Token Metadata.
 * This is independent of the marketplace program — it gives you something to
 * list. Off-chain metadata is either uploaded to Irys (devnet) or supplied as
 * a ready-made URI.
 */
export function useMintNft() {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MintStatus>({ stage: 'idle' });

  const reset = useCallback(() => setStatus({ stage: 'idle' }), []);

  const mint = useCallback(
    async (input: MintInput): Promise<string | null> => {
      if (!wallet.connected || !wallet.publicKey) {
        notify({ variant: 'error', title: 'Connect a wallet first.' });
        return null;
      }

      try {
        // Irys devnet vs mainnet endpoint.
        const irysAddress =
          config.network === 'mainnet-beta'
            ? 'https://node1.irys.xyz'
            : 'https://devnet.irys.xyz';

        const umi = createUmi(config.rpcUrl)
          .use(mplTokenMetadata())
          // `providerUrl` tells Irys which Solana RPC to fund the upload on —
          // without it, funding/signing can fail on Devnet.
          .use(irysUploader({ address: irysAddress, providerUrl: config.rpcUrl }))
          // Sign with the user's connected wallet adapter.
          .use(walletAdapterIdentity(wallet));

        // 1) Resolve the metadata URI.
        let uri = input.metadataUri?.trim();
        if (!uri) {
          setStatus({ stage: 'uploading' });
          try {
            let imageUri = input.imageUrl?.trim() ?? '';
            if (input.imageFile) {
              const bytes = new Uint8Array(await input.imageFile.arrayBuffer());
              const file = createGenericFile(bytes, input.imageFile.name, {
                contentType: input.imageFile.type || 'image/png',
              });
              const [uploaded] = await umi.uploader.upload([file]);
              imageUri = uploaded;
            }

            const json = {
              name: input.name,
              symbol: input.symbol,
              description: input.description,
              image: imageUri,
              attributes: input.attributes.filter((a) => a.trait_type && a.value),
              properties: {
                files: imageUri ? [{ uri: imageUri, type: input.imageFile?.type ?? 'image/png' }] : [],
                category: 'image',
              },
            };
            uri = await umi.uploader.uploadJson(json);
          } catch (uploadErr) {
            // Irys uploads can be flaky on Devnet. Surface a clear, actionable
            // message pointing at the zero-upload path.
            console.error('Irys upload failed:', uploadErr);
            throw new Error(
              "Image upload (Irys) failed on Devnet. Tip: tick 'Advanced: use an existing metadata JSON URI' to mint with no upload, or paste an image URL instead of uploading a file.",
            );
          }
        }

        // 2) Create the NFT.
        setStatus({ stage: 'minting' });
        const mintSigner = generateSigner(umi);
        const builder = createNft(umi, {
          mint: mintSigner,
          name: input.name,
          symbol: input.symbol,
          uri,
          sellerFeeBasisPoints: percentAmount(input.royaltyPercent, 2),
          isMutable: true,
          tokenOwner: umi.identity.publicKey,
        });

        setStatus({ stage: 'confirming', mintAddress: mintSigner.publicKey.toString() });
        const result = await builder.sendAndConfirm(umi, {
          confirm: { commitment: 'confirmed' },
        });

        const signature =
          typeof result.signature === 'string'
            ? result.signature
            : Buffer.from(result.signature).toString('base64');
        const mintAddress = mintSigner.publicKey.toString();

        setStatus({ stage: 'done', mintAddress, signature });
        notify({
          variant: 'success',
          title: 'NFT minted 🎉',
          description: `${input.name} is now in your wallet. List it from your Portfolio.`,
          href: explorerUrl(mintAddress, 'address'),
        });
        // Refresh owned NFTs so it appears in the portfolio immediately.
        queryClient.invalidateQueries({
          queryKey: queryKeys.ownedNfts(wallet.publicKey.toBase58()),
        });
        fireConfetti();
        return mintAddress;
      } catch (err) {
        const friendly = mapTxError(err);
        setStatus({ stage: 'error', error: friendly.message });
        if (!friendly.isUserRejection) {
          notify({ variant: 'error', title: 'Mint failed', description: friendly.message });
        } else {
          setStatus({ stage: 'idle' });
        }
        return null;
      }
    },
    [wallet, queryClient],
  );

  return { mint, status, reset };
}
