module MyNFT::NFT {
    use std::signer;
    use std::string;

    struct NFT has key, store {
        id: u64,
        name: string::String,
        uri: string::String,
        owner: address
    }

    public entry fun mint(
        account: &signer,
        name: string::String,
        uri: string::String
    ) {
        let owner = signer::address_of(account);
        assert!(!exists<NFT>(owner), 1);

        move_to(account, NFT {
            id: 0,
            name,
            uri,
            owner
        });
    }
}
