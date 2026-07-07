module MyNFT::Marketplace {

    use std::signer;

    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::coin;

    use aptos_std::table;

    use MyNFT::RealNFT;

    const E_NFT_NOT_OWNED: u64 = 1;
    const E_ALREADY_LISTED: u64 = 2;
    const E_LISTING_NOT_FOUND: u64 = 3;
    const E_CANNOT_BUY_OWN_NFT: u64 = 4;
    const E_LISTING_MISSING: u64 = 5;
    const E_INVALID_PRICE: u64 = 6;

    struct Listing has store, drop {
        nft_id: u64,
        seller: address,
        price: u64,
    }

    struct MarketplaceStore has key {
        listings: table::Table<u64, Listing>,
    }

    public entry fun init(
        account: &signer
    ) {
        ensure_marketplace_exists(account);
    }

    fun ensure_marketplace_exists(
        account: &signer
    ) {
        let owner = signer::address_of(account);

        if (!exists<MarketplaceStore>(owner)) {
            move_to(
                account,
                MarketplaceStore {
                    listings: table::new<u64, Listing>()
                }
            );
        };
    }

    public entry fun list_nft(
        seller: &signer,
        nft_id: u64,
        price: u64
    ) acquires MarketplaceStore {

        let seller_addr = signer::address_of(seller);

        ensure_marketplace_exists(seller);

        assert!(
            price > 0,
            E_INVALID_PRICE
        );

        assert!(
            RealNFT::has_nft(
                seller_addr,
                nft_id
            ),
            E_NFT_NOT_OWNED
        );

        let market =
            borrow_global_mut<MarketplaceStore>(
                seller_addr
            );

        assert!(
            !table::contains(
                &market.listings,
                nft_id
            ),
            E_ALREADY_LISTED
        );

        table::add(
            &mut market.listings,
            nft_id,
            Listing {
                nft_id,
                seller: seller_addr,
                price
            }
        );
    }

    public entry fun cancel_listing(
        seller: &signer,
        nft_id: u64
    ) acquires MarketplaceStore {

        let seller_addr =
            signer::address_of(seller);

        assert!(
            exists<MarketplaceStore>(
                seller_addr
            ),
            E_LISTING_NOT_FOUND
        );

        let market =
            borrow_global_mut<MarketplaceStore>(
                seller_addr
            );

        assert!(
            table::contains(
                &market.listings,
                nft_id
            ),
            E_LISTING_NOT_FOUND
        );

        table::remove(
            &mut market.listings,
            nft_id
        );
    }

    public entry fun buy_nft(
        buyer: &signer,
        seller_addr: address,
        nft_id: u64
    ) acquires MarketplaceStore {

        let buyer_addr =
            signer::address_of(buyer);

        assert!(
            buyer_addr != seller_addr,
            E_CANNOT_BUY_OWN_NFT
        );

        assert!(
            exists<MarketplaceStore>(
                seller_addr
            ),
            E_LISTING_MISSING
        );

        let market =
            borrow_global_mut<MarketplaceStore>(
                seller_addr
            );

        assert!(
            table::contains(
                &market.listings,
                nft_id
            ),
            E_LISTING_MISSING
        );

        let listing =
            table::remove(
                &mut market.listings,
                nft_id
            );

        assert!(
            listing.price > 0,
            E_INVALID_PRICE
        );

        coin::transfer<AptosCoin>(
            buyer,
            seller_addr,
            listing.price
        );

        RealNFT::marketplace_transfer(
            seller_addr,
            buyer_addr,
            nft_id
        );
    }
    
}