module nftloyalty::marketplace {
    use sui::dynamic_object_field as dof;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use nftloyalty::nft::{Self, NFT};
    use nftloyalty::loyalty::Loyalty;

    const EInsufficientPayment: u64 = 1;
    const ENotOwner: u64 = 2;

    public struct Marketplace has key {
        id: UID,
    }

    public struct Listing has key, store {
        id: UID,
        nft_id: ID,
        price: u64,
        seller: address,
    }

    fun create_marketplace_object(ctx: &mut TxContext) {
        transfer::share_object(Marketplace {
            id: object::new(ctx),
        });
    }

    fun init(ctx: &mut TxContext) {
        create_marketplace_object(ctx);
    }

    public entry fun create_marketplace(ctx: &mut TxContext) {
        create_marketplace_object(ctx);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        create_marketplace_object(ctx);
    }

    public fun list_nft(
        marketplace: &mut Marketplace,
        nft: NFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        let seller = tx_context::sender(ctx);
        // Only the owner can list the NFT
        let owner = nft::owner(&nft);
        assert!(owner == seller, ENotOwner);

        let nft_id = object::id(&nft);

        let mut listing = Listing {
            id: object::new(ctx),
            nft_id,
            price,
            seller,
        };

        // Attach the NFT directly into the listing
        dof::add(&mut listing.id, b"nft", nft);

        // Attach the listing to the shared marketplace object using the nft_id
        dof::add(&mut marketplace.id, nft_id, listing);
    }

    public fun buy_nft(
        marketplace: &mut Marketplace,
        nft_id: ID,
        mut payment: Coin<SUI>,
        buyer_loyalty: &mut Loyalty,
        ctx: &mut TxContext
    ) {
        let buyer = tx_context::sender(ctx);

        // Extract the listing from the marketplace
        let mut listing: Listing = dof::remove(&mut marketplace.id, nft_id);

        let price = listing.price;
        assert!(coin::value(&payment) >= price, EInsufficientPayment);

        // Process payment
        let mut paid = coin::split(&mut payment, price, ctx);

        // Extract the NFT from the listing to get creator and royalty info
        let nft: NFT = dof::remove(&mut listing.id, b"nft");

        // Calculate royalty amount (in SUI)
        let royalty_bps = nft::royalty_bps(&nft);
        let royalty_amount = (price * royalty_bps) / 10_000;
        // Split the paid coin into royalty and seller portions
        let royalty_coin = coin::split(&mut paid, royalty_amount, ctx);
        let seller_coin = paid; // remaining amount

        // Transfer royalty to creator
        let creator = nft::creator(&nft);
        transfer::public_transfer(royalty_coin, creator);

        // Transfer seller amount to seller (current owner)
        transfer::public_transfer(seller_coin, listing.seller);

        // Refund any excess payment to buyer
        transfer::public_transfer(payment, buyer);

        // Update NFT ownership and transfer to the buyer
        nft::transfer_nft(nft, buyer, ctx);

        // Award points based on SUI spent (1 point per full SUI)
        let points = price / 1_000_000_000;
        let points_to_add = if (points == 0) { 1 } else { points };
        nftloyalty::loyalty::earn_points(buyer_loyalty, points_to_add);

        // Destroy the listing cleanly
        let Listing { id, nft_id: _, price: _, seller: _ } = listing;
        object::delete(id);
    }

    public fun cancel_listing(
        marketplace: &mut Marketplace,
        nft_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let mut listing: Listing = dof::remove(&mut marketplace.id, nft_id);

        assert!(listing.seller == sender, ENotOwner);

        // Extract NFT from listing
        let nft: NFT = dof::remove(&mut listing.id, b"nft");

        // Return NFT to the seller with owner metadata updated
        nft::transfer_nft(nft, sender, ctx);

        // Clean up listing
        let Listing { id, nft_id: _, price: _, seller: _ } = listing;
        object::delete(id);
    }
}
