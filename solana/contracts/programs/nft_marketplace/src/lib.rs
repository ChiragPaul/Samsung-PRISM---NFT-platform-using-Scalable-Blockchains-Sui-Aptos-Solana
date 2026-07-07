use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer as sol_transfer, Transfer as SolTransfer};
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{
        close_account, transfer as token_transfer, CloseAccount, Mint, Token, TokenAccount,
        Transfer as TokenTransfer,
    },
};

declare_id!("6MAZYi6WaiB8ztJuJjoAVkbQDxZxfuQuJR3KfrfZncih");

const MAX_FEE_BPS: u16 = 10_000;
const MARKETPLACE_SEED: &[u8] = b"marketplace";
const TREASURY_SEED: &[u8] = b"treasury";
const LISTING_SEED: &[u8] = b"listing";
const VAULT_SEED: &[u8] = b"vault";

#[program]
pub mod nft_marketplace {
    use super::*;

    /// Create the marketplace config + treasury PDA. The caller becomes authority.
    pub fn initialize_marketplace(
        ctx: Context<InitializeMarketplace>,
        name: String,
        fee_bps: u16,
    ) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, MarketplaceError::FeeTooHigh);
        require!(name.len() <= 32, MarketplaceError::NameTooLong);

        let m = &mut ctx.accounts.marketplace;
        m.authority = ctx.accounts.authority.key();
        m.treasury = ctx.accounts.treasury.key();
        m.fee_bps = fee_bps;
        m.name = name;
        m.listings_count = 0;
        m.bump = ctx.bumps.marketplace;
        m.treasury_bump = ctx.bumps.treasury;
        Ok(())
    }

    /// Escrow an NFT into the program vault and create a listing.
    pub fn list_nft(ctx: Context<ListNft>, price: u64) -> Result<()> {
        require!(price > 0, MarketplaceError::InvalidPrice);

        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.nft_mint = ctx.accounts.nft_mint.key();
        listing.price = price;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.vault = ctx.accounts.vault.key();
        listing.bump = ctx.bumps.listing;

        // Move the NFT from the seller into the program-owned vault.
        token_transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TokenTransfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        let m = &mut ctx.accounts.marketplace;
        m.listings_count = m.listings_count.checked_add(1).ok_or(MarketplaceError::Overflow)?;
        Ok(())
    }

    /// Buyer pays; the NFT moves from vault to buyer; fee goes to treasury.
    pub fn purchase_nft(ctx: Context<PurchaseNft>) -> Result<()> {
        let price = ctx.accounts.listing.price;
        let fee = (price as u128)
            .checked_mul(ctx.accounts.marketplace.fee_bps as u128)
            .and_then(|v| v.checked_div(MAX_FEE_BPS as u128))
            .ok_or(MarketplaceError::Overflow)? as u64;
        let seller_amount = price.checked_sub(fee).ok_or(MarketplaceError::Overflow)?;

        // Pay the seller and the treasury from the buyer.
        sol_transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                SolTransfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            seller_amount,
        )?;
        if fee > 0 {
            sol_transfer(
                CpiContext::new(
                    ctx.accounts.system_program.key(),
                    SolTransfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        // Transfer the NFT out of the vault, signed by the marketplace PDA.
        let name = ctx.accounts.marketplace.name.clone();
        let bump = ctx.accounts.marketplace.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[MARKETPLACE_SEED, name.as_bytes(), &[bump]]];

        token_transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TokenTransfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.marketplace.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        // Close the emptied vault, returning rent to the seller.
        close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer_seeds,
        ))?;

        let m = &mut ctx.accounts.marketplace;
        m.listings_count = m.listings_count.saturating_sub(1);
        Ok(())
    }

    /// Seller cancels: the NFT returns from the vault to the seller.
    pub fn delist_nft(ctx: Context<DelistNft>) -> Result<()> {
        let name = ctx.accounts.marketplace.name.clone();
        let bump = ctx.accounts.marketplace.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[MARKETPLACE_SEED, name.as_bytes(), &[bump]]];

        token_transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TokenTransfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.marketplace.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        close_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            CloseAccount {
                account: ctx.accounts.vault.to_account_info(),
                destination: ctx.accounts.seller.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer_seeds,
        ))?;

        let m = &mut ctx.accounts.marketplace;
        m.listings_count = m.listings_count.saturating_sub(1);
        Ok(())
    }

    /// Admin-only marketplace fee update.
    pub fn update_fee(ctx: Context<UpdateFee>, fee_bps: u16) -> Result<()> {
        require!(fee_bps <= MAX_FEE_BPS, MarketplaceError::FeeTooHigh);
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.marketplace.authority,
            MarketplaceError::Unauthorized
        );
        ctx.accounts.marketplace.fee_bps = fee_bps;
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub fee_bps: u16,
    #[max_len(32)]
    pub name: String,
    pub listings_count: u64,
    pub bump: u8,
    pub treasury_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub seller: Pubkey,
    pub nft_mint: Pubkey,
    pub price: u64,
    pub created_at: i64,
    pub vault: Pubkey,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [MARKETPLACE_SEED, name.as_bytes()],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,
    /// CHECK: PDA system account that simply holds collected fees.
    #[account(
        mut,
        seeds = [TREASURY_SEED, marketplace.key().as_ref()],
        bump
    )]
    pub treasury: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListNft<'info> {
    #[account(mut, seeds = [MARKETPLACE_SEED, marketplace.name.as_bytes()], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [LISTING_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = seller_token_account.mint == nft_mint.key(),
        constraint = seller_token_account.owner == seller.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = seller,
        seeds = [VAULT_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump,
        token::mint = nft_mint,
        token::authority = marketplace
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PurchaseNft<'info> {
    #[account(mut, seeds = [MARKETPLACE_SEED, marketplace.name.as_bytes()], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        mut,
        close = seller,
        seeds = [LISTING_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = nft_mint
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: validated via the listing's `has_one = seller`.
    #[account(mut)]
    pub seller: UncheckedAccount<'info>,
    /// CHECK: PDA treasury, validated by seeds.
    #[account(mut, seeds = [TREASURY_SEED, marketplace.key().as_ref()], bump = marketplace.treasury_bump)]
    pub treasury: SystemAccount<'info>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [VAULT_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelistNft<'info> {
    #[account(mut, seeds = [MARKETPLACE_SEED, marketplace.name.as_bytes()], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        mut,
        close = seller,
        seeds = [LISTING_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump = listing.bump,
        has_one = seller,
        has_one = nft_mint
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub nft_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [VAULT_SEED, marketplace.key().as_ref(), nft_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = seller_token_account.mint == nft_mint.key(),
        constraint = seller_token_account.owner == seller.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateFee<'info> {
    #[account(mut, seeds = [MARKETPLACE_SEED, marketplace.name.as_bytes()], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,
    pub authority: Signer<'info>,
}

#[error_code]
pub enum MarketplaceError {
    #[msg("Fee exceeds the maximum allowed (10000 bps).")]
    FeeTooHigh,
    #[msg("Signer is not the marketplace authority.")]
    Unauthorized,
    #[msg("Listing price must be greater than zero.")]
    InvalidPrice,
    #[msg("Marketplace name too long (max 32 bytes).")]
    NameTooLong,
    #[msg("Numerical overflow.")]
    Overflow,
}
