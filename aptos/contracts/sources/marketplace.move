module MyNFT::Marketplace {

    use std::signer;

    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    use aptos_std::table;

    use MyNFT::RealNFT;

    struct Listing has store, drop {
        nft_id: u64,
        seller: address,
        price: u64
    }

    struct MarketplaceStore has key {
        listings: table::Table<u64, Listing>
    }

    public entry fun init(
        account: &signer
    ) {

        let addr =
            signer::address_of(account);

        if (!exists<MarketplaceStore>(addr)) {

            move_to(
                account,
                MarketplaceStore {
                    listings:
                        table::new<u64, Listing>()
                }
            );
        };
    }

    public entry fun list_nft(
        seller: &signer,
        nft_id: u64,
        price: u64
    ) acquires MarketplaceStore {

        let seller_addr =
            signer::address_of(seller);

        assert!(
            RealNFT::has_nft(
                seller_addr,
                nft_id
            ),
            1
        );

        let market =
            borrow_global_mut<
                MarketplaceStore
            >(seller_addr);

        assert!(
            !table::contains(
                &market.listings,
                nft_id
            ),
            2
        );

        let listing = Listing {
            nft_id,
            seller: seller_addr,
            price
        };

        table::add(
            &mut market.listings,
            nft_id,
            listing
        );
    }

    public entry fun cancel_listing(
        seller: &signer,
        nft_id: u64
    ) acquires MarketplaceStore {

        let seller_addr =
            signer::address_of(seller);

        let market =
            borrow_global_mut<
                MarketplaceStore
            >(seller_addr);

        assert!(
            table::contains(
                &market.listings,
                nft_id
            ),
            3
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
            4
        );

        let market =
            borrow_global_mut<
                MarketplaceStore
            >(seller_addr);

        assert!(
            table::contains(
                &market.listings,
                nft_id
            ),
            5
        );

        let listing =
            table::remove(
                &mut market.listings,
                nft_id
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