# Multi-Chain NFT Platform (Sui, Aptos, Solana)

Welcome to the Multi-Chain NFT Marketplace platform! This repository contains a production-quality, scalable NFT marketplace implemented across three high-performance blockchains: **Sui**, **Aptos**, and **Solana**.

This project explores and leverages the unique architectural benefits of each chain—such as real-time state synchronization, object-oriented ownership, and high throughput—to deliver a seamless, decentralized trading experience without relying on centralized backends.

##  Key Features

- **Multi-Chain Architecture**: Dedicated, complete implementations for Solana, Sui, and Aptos.
- **Real-Time On-Chain State**: Direct interaction with blockchain state via WebSockets for instantaneous UI updates (no centralized database).
- **Creator Royalties & Loyalty**: Built-in, on-chain royalty enforcement for creators and loyalty point systems for buyers (e.g., in the Sui implementation).
- **Secure Escrow & Trading**: Trustless escrow mechanisms ensuring that only owners can list and buyers get guaranteed delivery.
- **AI Integration**: AI-assisted NFT name and description generation during the minting process.
- **Analytics & Research**: Comprehensive market analysis and security audit reports comparing the scalable chains.

##  Repository Structure

The repository is modularized by blockchain ecosystem. Each directory is a standalone project with its own smart contracts, frontend, and specific tooling.

```text
├── aptos/       # Aptos Marketplace Implementation
│   ├── contracts/ # Aptos Move smart contracts
│   ├── frontend/  # React/Vite web application
│   └── backend/   # Supporting backend services
├── docs/        # Research, Analysis, and Audits
│   ├── Aptos_market_analysis.pdf
│   ├── Solona_marketplace_analysis.pdf
│   ├── Sui_marketplace_analysis.pdf
│   ├── Final_Comparison_Report.pdf
│   └── Security Audit Report.pdf
├── solana/      # Solana Marketplace Implementation
│   ├── anchor/    # Solana Anchor smart contracts
│   └── src/       # Real-time React frontend (no-backend architecture)
└── sui/         # Sui Marketplace Implementation
    ├── sui_contracts/ # Sui Move smart contracts (Royalty & Loyalty features)
    └── frontend/      # React/Vite frontend using Mysten dApp Kit
```

##  Getting Started

###  Solana Implementation
A fully decentralized marketplace where the chain acts as the backend. Features live floor/volume analytics and sweep-the-floor capabilities.
- **Navigate to:** `cd solana`
- **Smart Contracts:** Built with Anchor (`anchor/`)
- **Frontend:** React + Vite
- **Run Locally:** `npm install` followed by `npm run dev`
- **Details:** See the [Solana README](./solana/README.md) for Devnet deployment instructions and real-time syncing details.

###  Sui Implementation
An object-centric marketplace featuring strict on-chain royalty enforcement and a loyalty points system for buyers.
- **Navigate to:** `cd sui`
- **Smart Contracts:** Built with Sui Move (`sui_contracts/`)
- **Frontend:** React + Vite + Mysten dApp Kit
- **Run Locally:** `cd frontend && npm install` followed by `npm run dev`
- **Details:** See the [Sui README](./sui/README.md) for contract deployment steps and frontend configuration.

###  Aptos Implementation
A scalable marketplace utilizing Aptos Move for secure and fast NFT trading.
- **Navigate to:** `cd aptos`
- **Explore:** Check the `contracts/` and `frontend/` directories for deployment and execution scripts.

##  Research and Analysis

The `docs/` directory contains extensive research conducted during the development of this platform:
- Individual market analysis reports for **Solana**, **Sui**, and **Aptos**.
- A **Final Comparison Report** contrasting the performance, developer experience, and scalability of the three chains.
- A **Security Audit Report** detailing vulnerability checks and security considerations across the implementations.

##  Security Considerations

- **Trustless Execution**: All trades are atomic. Payment and NFT transfers happen simultaneously.
- **Object/Account Validation**: Smart contracts validate ownership, prevent double-spending, and enforce strict state transitions.
- **No Private Keys on Server**: All transactions are signed directly by the user's self-custodial wallet (Phantom, Sui Wallet, Martian, etc.).

##  License
This project is licensed under the MIT License. See individual subdirectory documentation for specific acknowledgments and library licenses.
