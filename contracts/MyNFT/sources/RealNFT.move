module MyNFT::RealNFT {

    use std::signer;
    use std::string;

    use aptos_std::table;

    friend MyNFT::Marketplace;

    struct NFT has store, drop {
        id: u64,
        name: string::String,
        uri: string::String,
        owner: address
    }

    struct NFTStore has key {
        next_id: u64,
        nfts: table::Table<u64, NFT>
    }

    public entry fun init(
        account: &signer
    ) {
        let addr = signer::address_of(account);

        if (!exists<NFTStore>(addr)) {

            move_to(
                account,
                NFTStore {
                    next_id: 0,
                    nfts: table::new<u64, NFT>()
                }
            );
        };
    }

    public entry fun mint(
        account: &signer,
        name: string::String,
        uri: string::String
    ) acquires NFTStore {

        let owner =
            signer::address_of(account);

        assert!(
            exists<NFTStore>(owner),
            100
        );

        let store =
            borrow_global_mut<NFTStore>(
                owner
            );

        let id = store.next_id;

        let nft = NFT {
            id,
            name,
            uri,
            owner
        };

        table::add(
            &mut store.nfts,
            id,
            nft
        );

        store.next_id = id + 1;
    }

    public fun has_nft(
        owner: address,
        nft_id: u64
    ): bool acquires NFTStore {

        if (!exists<NFTStore>(owner)) {
            return false
        };

        let store =
            borrow_global<NFTStore>(
                owner
            );

        table::contains(
            &store.nfts,
            nft_id
        )
    }

    public(friend) fun marketplace_transfer(
        seller: address,
        buyer: address,
        nft_id: u64
    ) acquires NFTStore {

        let seller_store =
    borrow_global_mut<NFTStore>(
        seller
         );

        assert!(
        table::contains(
        &seller_store.nfts,
        nft_id
        ),
        102
);

let nft =
    table::remove(
        &mut seller_store.nfts,
        nft_id
    );

        assert!(
    exists<NFTStore>(buyer),
    101
);

let buyer_store =
    borrow_global_mut<NFTStore>(
        buyer
    );

assert!(
    !table::contains(
        &buyer_store.nfts,
        nft_id
    ),
    103
);

let transferred = NFT {
    id: nft.id,
    name: nft.name,
    uri: nft.uri,
    owner: buyer
};

table::add(
    &mut buyer_store.nfts,
    nft_id,
    transferred
);