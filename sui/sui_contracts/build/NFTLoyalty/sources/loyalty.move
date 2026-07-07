module nftloyalty::loyalty {
    /// The Loyalty Object representing user points and tier
    public struct Loyalty has key, store {
        id: UID,
        user: address,
        points: u64,
        tier: u8,
    }

    /// Error codes
    const EInsufficientPoints: u64 = 1;

    /// Create a new loyalty profile for a user
    public fun create_profile(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let loyalty = Loyalty {
            id: object::new(ctx),
            user: sender,
            points: 0,
            tier: 1, // Tier 1: 0-100
        };
        transfer::public_transfer(loyalty, sender);
    }

    /// Update tier based on points
    public fun update_tier(points: u64): u8 {
        if (points > 500) {
            3
        } else if (points > 100) {
            2
        } else {
            1
        }
    }

    /// Earn points (called by marketplace module upon purchase)
    public(package) fun earn_points(loyalty: &mut Loyalty, amount: u64) {
        loyalty.points = loyalty.points + amount;
        loyalty.tier = update_tier(loyalty.points);
    }

    /// Redeem points
    public fun redeem_points(
        loyalty: &mut Loyalty, 
        amount: u64, 
        _ctx: &mut TxContext
    ) {
        assert!(loyalty.points >= amount, EInsufficientPoints);
        loyalty.points = loyalty.points - amount;
        loyalty.tier = update_tier(loyalty.points);
    }

    // Accessors
    public fun points(loyalty: &Loyalty): u64 {
        loyalty.points
    }

    public fun tier(loyalty: &Loyalty): u8 {
        loyalty.tier
    }
}
