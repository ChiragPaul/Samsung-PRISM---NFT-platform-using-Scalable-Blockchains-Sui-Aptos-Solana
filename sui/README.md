# Sui NFT Marketplace with Royalty Enforcement

A complete NFT marketplace built on the Sui blockchain, featuring NFT minting, listing, buying, and automatic royalty enforcement for creators.

## Table of Contents
- [Features](#features)
- [Smart Contracts](#smart-contracts)
  - [NFT Module](#nft-module)
  - [Marketplace Module](#marketplace-module)
  - [Loyalty Module](#loyalty-module)
- [Frontend](#frontend)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Building and Testing](#building-and-testing)
  - [Deployment](#deployment)
  - [Frontend Setup](#frontend-setup)
- [Security Considerations](#security-considerations)
- [License](#license)

## Features

✅ **NFT Minting**: Create new NFTs with customizable royalty percentages  
✅ **NFT Listing**: List your NFTs for sale on the marketplace  
✅ **NFT Purchase**: Buy NFTs with automatic royalty distribution to creators  
✅ **Royalty Enforcement**: Creators receive a configurable percentage on every secondary sale  
✅ **Loyalty Points**: Buyers earn loyalty points (1 point per SUI spent)  
✅ **Secure Escrow**: NFTs are locked in listings using Sui's object model  
✅ **Ownership Verification**: Only NFT owners can list their assets  
✅ **No Double Spending**: Guaranteed by Sui's move language and object ownership  

## Smart Contracts

The core logic is implemented in Move smart contracts located in the `sui_contracts/sources` directory.

### NFT Module (`sources/nft.move`)

Defines the NFT object and minting functionality.

#### Key Features:
- **NFT Object**: Contains `id`, `name`, `description`, `url`, `owner`, `creator`, and `royalty_bps`
- **Minting**: `mint_nft` function creates a new NFT with specified royalty basis points (bps)
- **Transfer**: `transfer_nft` function updates ownership and transfers the NFT
- **Accessors**: `creator()` and `royalty_bps()` functions for external modules

#### Data Structures:
```move
public struct NFT has key, store {
    id: UID,
    name: vector<u8>,
    description: vector<u8>,
    url: vector<u8>,
    owner: address,
    creator: address,
    royalty_bps: u64, // basis points (e.g., 500 = 5%)
}
```

#### Functions:
- `mint_nft(name, description, url, royalty_bps, ctx)`: Creates and mints a new NFT
- `transfer_nft(nft, recipient, ctx)`: Transfers NFT to a new owner
- `creator(nft)`: Returns the NFT creator address
- `royalty_bps(nft)`: Returns the royalty basis points
- `owner(nft)`: Returns the current NFT owner

### Marketplace Module (`sources/marketplace.move`)

Implements the marketplace logic with listing, buying, and canceling functionality.

#### Key Features:
- **Listing**: NFTs are locked in listing objects via dynamic object fields
- **Buying**: Automatic payment splitting between seller, creator (royalty), and buyer refund
- **Canceling**: Sellers can cancel their listings and retrieve their NFTs
- **Ownership Check**: Prevents non-owners from listing NFTs
- **Loyalty Integration**: Awards points to buyers on purchase

#### Data Structures:
```move
public struct Marketplace has key {
    id: UID,
}

public struct Listing has key, store {
    id: UID,
    nft_id: ID,
    price: u64,
    seller: address,
}
```

#### Functions:
- `init(ctx)`: Initializes and shares the marketplace object
- `list_nft(marketplace, nft, price, ctx)`: Lists an NFT for sale (owner-only)
- `buy_nft(marketplace, nft_id, payment, buyer_loyalty, ctx)`: Buys an NFT with royalty distribution
- `cancel_listing(marketplace, nft_id, ctx)`: Cancels a listing (seller-only)

#### Buy Flow:
1. Verify payment amount ≥ listing price
2. Split payment into exact price and excess (refunded to buyer)
3. Extract NFT from listing
4. Calculate royalty: `price * royalty_bps / 10000`
5. Split payment into royalty and seller amounts
6. Transfer royalty to NFT creator
7. Transfer seller amount to listing seller
8. Refund excess payment to buyer
9. Transfer NFT to buyer
10. Award loyalty points to buyer (1 point per full SUI spent)
11. Destroy listing object

### Loyalty Module (`sources/loyalty.move`)

Tracks user loyalty points and tiers.

#### Key Features:
- **Profile Creation**: Users create loyalty profiles
- **Point Earning**: Points awarded based on purchase price (1 point per SUI)
- **Tier System**: 
  - Tier 1: 0-100 points
  - Tier 2: 101-500 points
  - Tier 3: 501+ points
- **Point Redemption**: Users can redeem points (functionality included)

#### Data Structures:
```move
public struct Loyalty has key, store {
    id: UID,
    user: address,
    points: u64,
    tier: u8,
}
```

#### Functions:
- `create_profile(ctx)`: Creates a new loyalty profile for the sender
- `update_tier(points)`: Calculates tier based on points
- `earn_points(loyalty, amount)`: Adds points and updates tier (called by marketplace)
- `redeem_points(loyalty, amount, ctx)`: Redeems points if sufficient balance
- `points(loyalty)`: Returns current points
- `tier(loyalty)`: Returns current tier

## Frontend

A React-based frontend built with Vite and TypeScript, using the Mysten dApp Kit for Sui wallet integration.

### Components:
- **MintWidget** (`src/components/MintWidget.tsx`): 
  - Create new NFTs with name, description, image URL, and royalty percentage
  - Connects to wallet and executes mint transaction
- **Marketplace** (`src/components/Marketplace.tsx`):
  - Browse and list NFTs for sale
  - Buy NFTs from the marketplace
  - View owned NFTs and active listings
  - Integrated loyalty points display
- **LoyaltyDashboard** (`src/components/LoyaltyDashboard.tsx`):
  - Displays user's loyalty points and tier

### Environment Variables:
Create a `.env` file in the frontend directory with:
```
VITE_PACKAGE_ID=<your_deployed_package_id>
VITE_MARKETPLACE_ID=<your_deployed_marketplace_object_id>
VITE_LOYALTY_ID=<user's_loyalty_object_id>
```

## Getting Started

### Prerequisites
- [Sui Client](https://docs.sui.io/build/sui-client-install) (v0.27.0 or later)
- [Node.js](https://nodejs.org/) (v16 or later)
- [Git](https://git-scm.com/)
- A Sui wallet (e.g., Sui Wallet, Martian, or Neptune) configured for testnet or devnet

> **Note**: The `sui-debug.exe` provided in the repository might not be functional due to a segmentation fault. Please install the official Sui client from the [Sui GitHub releases](https://github.com/MystenLabs/sui/releases) and ensure the `sui` command is available in your PATH.



### Building and Testing

#### 1. Build the Move Contracts
```bash
cd sui_contracts
# Use the sui-dev binary from the Sui installation
sui move build
```

#### 2. Run Unit Tests
```bash
sui move test
```

> **Note**: The test suite includes:
> - Basic mint/list/buy/loyalty flow
> - Royalty distribution verification
> - Authorization checks (preventing non-owners from listing)

### Deployment

#### 1. Publish the Contracts
```bash
cd sui_contracts
sui client publish --gas-budget 100000000 --json
```
> Save the `packageId` from the output for the next step.

#### 2. Initialize the Marketplace
```bash
sui client call --package <packageId> --module marketplace --function create_marketplace --args --gas-budget 50000000 --json
```
> Save the `objectId` of the created marketplace object.

#### 3. Set Up Frontend
Update the frontend `.env` file with:
- `VITE_PACKAGE_ID`: The package ID from step 1
- `VITE_MARKETPLACE_ID`: The marketplace object ID from step 2
- `VITE_LOYALTY_ID`: Each user must create a loyalty profile (via the loyalty module's `create_profile` function) and use its object ID

### Frontend Setup

#### 1. Install Dependencies
```bash
cd frontend
npm install
```

#### 2. Configure Environment
Create a `.env` file in the frontend directory (see above).

#### 3. Start Development Server
```bash
npm run dev
```
> The app will be available at `http://localhost:5173`

## Security Considerations

1. **Ownership Enforcement**: 
   - Only NFT owners can list their assets (checked in `list_nft`)
   - Only listing sellers can cancel listings (checked in `cancel_listing`)

2. **Escrow Model**:
   - NFTs are locked in listing objects via dynamic object fields during listing
   - Prevents sellers from transferring or modifying the NFT while listed

3. **Royalty Security**:
   - Royalties are calculated and transferred atomically during purchase
   - Cannot be front-run or manipulated due to Move's transactional semantics

4. **Payment Safety**:
   - Uses Sui's coin splitting for precise payment handling
   - Excess payments are refunded to the buyer
   - Prevents overpayment and underpayment issues

5. **Object Model Benefits**:
   - Sui's object ownership prevents double-spending
   - Each NFT and listing is a unique, non-fungible object
   - No risk of reentrancy attacks due to Move's single-writer guarantee

6. **Input Validation**:
   - All move functions include proper type checking and assertions
   - Price and royalty values are validated before processing

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Sui Move](https://docs.sui.io/build/move)
- Frontend powered by [Vite](https://vitejs.dev/) and [React](https://reactjs.org/)
- Wallet integration via [Mysten dApp Kit](https://github.com/MystenLabs/dapp-kit)
