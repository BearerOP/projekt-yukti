use anchor_lang::prelude::*;

declare_id!("3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C");

// Platform fee: 2% on winning payouts
const PLATFORM_FEE_BPS: u64 = 200; // 200 basis points = 2%
const BPS_DENOMINATOR: u64 = 10_000;

// 1 SOL in lamports (avoid importing native_token to keep compatibility)
const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

// Minimum and maximum bet amounts (in lamports)
const MIN_BET_AMOUNT: u64 = LAMPORTS_PER_SOL / 100; // 0.01 SOL
const MAX_BET_AMOUNT: u64 = LAMPORTS_PER_SOL * 100; // 100 SOL

#[program]
pub mod opinion_trading {
    use super::*;

    /// Initialize a new prediction poll/market
    /// This creates the on-chain state and escrow vault for the poll
    pub fn initialize_poll(
        ctx: Context<InitializePoll>,
        poll_id: String,
        title: String,
        option_a_text: String,
        option_b_text: String,
        end_timestamp: i64,
    ) -> Result<()> {
        require!(poll_id.len() <= 64, ErrorCode::PollIdTooLong);
        require!(title.len() <= 256, ErrorCode::TitleTooLong);
        require!(option_a_text.len() <= 128, ErrorCode::OptionTextTooLong);
        require!(option_b_text.len() <= 128, ErrorCode::OptionTextTooLong);
        require!(
            end_timestamp > Clock::get()?.unix_timestamp,
            ErrorCode::InvalidEndTime
        );

        let poll = &mut ctx.accounts.poll;
        poll.authority = ctx.accounts.authority.key();
        poll.poll_id = poll_id;
        poll.title = title;
        poll.option_a_text = option_a_text;
        poll.option_b_text = option_b_text;
        poll.option_a_stake = 0;
        poll.option_b_stake = 0;
        poll.total_pool = 0;
        poll.option_a_odds = 5000; // 50% initial odds (in basis points)
        poll.option_b_odds = 5000; // 50% initial odds
        poll.end_timestamp = end_timestamp;
        poll.status = PollStatus::Active;
        poll.winner = None;
        poll.vault_bump = ctx.bumps.vault;
        poll.bump = ctx.bumps.poll;
        poll.next_bid_index = 0;

        emit!(PollCreated {
            poll: poll.key(),
            authority: poll.authority,
            poll_id: poll.poll_id.clone(),
            title: poll.title.clone(),
            end_timestamp: poll.end_timestamp,
        });

        Ok(())
    }

    /// Place a bid on a poll option with AMM odds adjustment
    pub fn place_bid(
        ctx: Context<PlaceBid>,
        amount: u64,
        option: BidOption,
        timestamp: i64,
        bid_index: u64,
    ) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        // Ensure provided bid index matches poll's next index
        require!(bid_index == poll.next_bid_index, ErrorCode::InvalidBidIndex);

        // Validations
        require!(
            poll.status == PollStatus::Active,
            ErrorCode::PollNotActive
        );
        require!(
            Clock::get()?.unix_timestamp < poll.end_timestamp,
            ErrorCode::PollEnded
        );
        require!(
            amount >= MIN_BET_AMOUNT && amount <= MAX_BET_AMOUNT,
            ErrorCode::InvalidBetAmount
        );

        // Get current odds before updating
        let current_odds = match option {
            BidOption::OptionA => poll.option_a_odds,
            BidOption::OptionB => poll.option_b_odds,
        };

        // Calculate potential win based on current odds
        // potential_win = (amount * BPS_DENOMINATOR) / odds
        let potential_win = (amount as u128)
            .checked_mul(BPS_DENOMINATOR as u128)
            .unwrap()
            .checked_div(current_odds as u128)
            .unwrap() as u64;

        // Transfer SOL from bettor to vault (escrow)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.bettor.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        // Update poll state
        match option {
            BidOption::OptionA => {
                poll.option_a_stake = poll.option_a_stake.checked_add(amount).unwrap();
            }
            BidOption::OptionB => {
                poll.option_b_stake = poll.option_b_stake.checked_add(amount).unwrap();
            }
        }
        poll.total_pool = poll.total_pool.checked_add(amount).unwrap();

        // Update AMM odds using Constant Product Market Maker formula
        update_amm_odds(poll)?;

        // Initialize bid account
        let bid = &mut ctx.accounts.bid;
        bid.bettor = ctx.accounts.bettor.key();
        bid.poll = poll.key();
        bid.amount = amount;
        bid.option = option;
        bid.odds_at_purchase = current_odds;
        bid.potential_win = potential_win;
        bid.status = BidStatus::Active;
        bid.timestamp = timestamp;
        bid.index = bid_index;
        bid.bump = ctx.bumps.bid;

        emit!(BidPlaced {
            bid: bid.key(),
            bettor: bid.bettor,
            poll: poll.key(),
            amount,
            option,
            odds: current_odds,
            potential_win,
        });

        // Increment next bid index for poll
        poll.next_bid_index = poll.next_bid_index.checked_add(1).unwrap();

        Ok(())
    }

    /// Settle the poll and declare a winner (admin only)
    pub fn settle_poll(ctx: Context<SettlePoll>, winning_option: BidOption) -> Result<()> {
        let poll = &mut ctx.accounts.poll;

        require!(
            ctx.accounts.authority.key() == poll.authority,
            ErrorCode::Unauthorized
        );
        require!(
            poll.status == PollStatus::Active,
            ErrorCode::PollNotActive
        );
        require!(
            Clock::get()?.unix_timestamp >= poll.end_timestamp,
            ErrorCode::PollNotEnded
        );

        poll.status = PollStatus::Settled;
        poll.winner = Some(winning_option);

        emit!(PollSettled {
            poll: poll.key(),
            winner: winning_option,
            total_pool: poll.total_pool,
        });

        Ok(())
    }

    /// Claim winnings for a winning bid (with 2% platform fee)
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let poll = &ctx.accounts.poll;

        require!(
            bid.bettor == ctx.accounts.bettor.key(),
            ErrorCode::Unauthorized
        );
        require!(
            poll.status == PollStatus::Settled,
            ErrorCode::PollNotSettled
        );
        require!(
            bid.status == BidStatus::Active,
            ErrorCode::BidAlreadyClaimed
        );

        // Check if this bid won
        let did_win = match (bid.option, poll.winner) {
            (BidOption::OptionA, Some(BidOption::OptionA)) => true,
            (BidOption::OptionB, Some(BidOption::OptionB)) => true,
            _ => false,
        };

        require!(did_win, ErrorCode::BidDidNotWin);

        // Calculate payout: potential_win - platform_fee (2%)
        let platform_fee = (bid.potential_win as u128)
            .checked_mul(PLATFORM_FEE_BPS as u128)
            .unwrap()
            .checked_div(BPS_DENOMINATOR as u128)
            .unwrap() as u64;

        let payout = bid.potential_win.checked_sub(platform_fee).unwrap();

        // Transfer winnings from vault to bettor
        let poll_id = poll.poll_id.as_bytes();
        let seeds = &[
            b"vault",
            poll_id,
            &[poll.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.bettor.to_account_info(),
            },
            signer_seeds,
        );
        anchor_lang::system_program::transfer(cpi_context, payout)?;

        // Transfer platform fee to treasury
        let fee_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
            signer_seeds,
        );
        anchor_lang::system_program::transfer(fee_context, platform_fee)?;

        // Mark bid as claimed
        bid.status = BidStatus::Won;

        emit!(WinningsClaimed {
            bid: bid.key(),
            bettor: bid.bettor,
            payout,
            platform_fee,
        });

        Ok(())
    }

    /// Cancel a poll and refund all bettors (admin only, emergency use)
    pub fn cancel_poll(ctx: Context<CancelPoll>) -> Result<()> {
        let poll = &mut ctx.accounts.poll;

        require!(
            ctx.accounts.authority.key() == poll.authority,
            ErrorCode::Unauthorized
        );
        require!(
            poll.status == PollStatus::Active,
            ErrorCode::PollNotActive
        );

        poll.status = PollStatus::Cancelled;

        emit!(PollCancelled {
            poll: poll.key(),
            total_pool: poll.total_pool,
        });

        Ok(())
    }

    /// Claim refund for a cancelled poll
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let bid = &mut ctx.accounts.bid;
        let poll = &ctx.accounts.poll;

        require!(
            bid.bettor == ctx.accounts.bettor.key(),
            ErrorCode::Unauthorized
        );
        require!(
            poll.status == PollStatus::Cancelled,
            ErrorCode::PollNotCancelled
        );
        require!(
            bid.status == BidStatus::Active,
            ErrorCode::BidAlreadyClaimed
        );

        let refund_amount = bid.amount;

        // Transfer refund from vault to bettor
        let poll_id = poll.poll_id.as_bytes();
        let seeds = &[
            b"vault",
            poll_id,
            &[poll.vault_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.bettor.to_account_info(),
            },
            signer_seeds,
        );
        anchor_lang::system_program::transfer(cpi_context, refund_amount)?;

        // Mark bid as refunded
        bid.status = BidStatus::Refunded;

        emit!(RefundClaimed {
            bid: bid.key(),
            bettor: bid.bettor,
            amount: refund_amount,
        });

        Ok(())
    }
}

/// Update AMM odds using Constant Product Market Maker algorithm
/// Formula: odds_a = (stake_a / total_pool) with smoothing
fn update_amm_odds(poll: &mut Poll) -> Result<()> {
    let total = poll.total_pool;

    if total == 0 {
        poll.option_a_odds = 5000; // 50%
        poll.option_b_odds = 5000; // 50%
        return Ok(());
    }

    // Calculate raw probabilities
    let stake_a = poll.option_a_stake as u128;
    let stake_b = poll.option_b_stake as u128;
    let total_u128 = total as u128;

    // Probability = stake / total (in basis points)
    let prob_a = (stake_a * BPS_DENOMINATOR as u128) / total_u128;
    let prob_b = (stake_b * BPS_DENOMINATOR as u128) / total_u128;

    // Apply smoothing to prevent extreme odds (keep between 5% and 95%)
    let min_odds = 500u128; // 5%
    let max_odds = 9500u128; // 95%

    poll.option_a_odds = prob_a.max(min_odds).min(max_odds) as u64;
    poll.option_b_odds = prob_b.max(min_odds).min(max_odds) as u64;

    Ok(())
}

// =============================================================================
// ACCOUNT STRUCTS
// =============================================================================

#[derive(Accounts)]
#[instruction(poll_id: String)]
pub struct InitializePoll<'info> {
    #[account(
        init,
        payer = authority,
        space = Poll::LEN,
        seeds = [b"poll", poll_id.as_bytes()],
        bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        seeds = [b"vault", poll_id.as_bytes()],
        bump
    )]
    /// CHECK: Vault PDA for holding SOL in escrow
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, option: BidOption, timestamp: i64, bid_index: u64)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [b"vault", poll.poll_id.as_bytes()],
        bump = poll.vault_bump
    )]
    /// CHECK: Vault PDA checked via seeds
    pub vault: SystemAccount<'info>,

    #[account(
        init,
        payer = bettor,
        space = Bid::LEN,
        seeds = [
            b"bid",
            poll.key().as_ref(),
            bettor.key().as_ref(),
            &bid_index.to_le_bytes(),
        ],
        bump
    )]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePoll<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [b"vault", poll.poll_id.as_bytes()],
        bump = poll.vault_bump
    )]
    /// CHECK: Vault PDA checked via seeds
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(mut)]
    /// CHECK: Treasury account for platform fees
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelPoll<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub poll: Account<'info, Poll>,

    #[account(
        mut,
        seeds = [b"vault", poll.poll_id.as_bytes()],
        bump = poll.vault_bump
    )]
    /// CHECK: Vault PDA checked via seeds
    pub vault: SystemAccount<'info>,

    #[account(mut)]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub bettor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// =============================================================================
// STATE STRUCTS
// =============================================================================

#[account]
pub struct Poll {
    pub authority: Pubkey,          // 32
    pub poll_id: String,            // 4 + 64 = 68
    pub title: String,              // 4 + 256 = 260
    pub option_a_text: String,      // 4 + 128 = 132
    pub option_b_text: String,      // 4 + 128 = 132
    pub option_a_stake: u64,        // 8
    pub option_b_stake: u64,        // 8
    pub total_pool: u64,            // 8
    pub option_a_odds: u64,         // 8
    pub option_b_odds: u64,         // 8
    pub end_timestamp: i64,         // 8
    pub status: PollStatus,         // 1
    pub winner: Option<BidOption>,  // 1 + 1 = 2
    pub vault_bump: u8,             // 1
    pub bump: u8,                   // 1
    pub next_bid_index: u64,        // 8
}

impl Poll {
    pub const LEN: usize = 8 + 32 + 68 + 260 + 132 + 132 + 8 + 8 + 8 + 8 + 8 + 8 + 1 + 2 + 1 + 1 + 8;
}

#[account]
pub struct Bid {
    pub bettor: Pubkey,             // 32
    pub poll: Pubkey,               // 32
    pub amount: u64,                // 8
    pub option: BidOption,          // 1
    pub odds_at_purchase: u64,      // 8
    pub potential_win: u64,         // 8
    pub status: BidStatus,          // 1
    pub timestamp: i64,             // 8
    pub index: u64,                 // 8
    pub bump: u8,                   // 1
}

impl Bid {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8 + 1 + 8 + 8 + 1;
}

// =============================================================================
// ENUMS
// =============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PollStatus {
    Active,
    Settled,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BidOption {
    OptionA,
    OptionB,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BidStatus {
    Active,
    Won,
    Lost,
    Refunded,
}

// =============================================================================
// EVENTS
// =============================================================================

#[event]
pub struct PollCreated {
    pub poll: Pubkey,
    pub authority: Pubkey,
    pub poll_id: String,
    pub title: String,
    pub end_timestamp: i64,
}

#[event]
pub struct BidPlaced {
    pub bid: Pubkey,
    pub bettor: Pubkey,
    pub poll: Pubkey,
    pub amount: u64,
    pub option: BidOption,
    pub odds: u64,
    pub potential_win: u64,
}

#[event]
pub struct PollSettled {
    pub poll: Pubkey,
    pub winner: BidOption,
    pub total_pool: u64,
}

#[event]
pub struct WinningsClaimed {
    pub bid: Pubkey,
    pub bettor: Pubkey,
    pub payout: u64,
    pub platform_fee: u64,
}

#[event]
pub struct PollCancelled {
    pub poll: Pubkey,
    pub total_pool: u64,
}

#[event]
pub struct RefundClaimed {
    pub bid: Pubkey,
    pub bettor: Pubkey,
    pub amount: u64,
}

// =============================================================================
// ERRORS
// =============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Poll ID cannot exceed 64 characters")]
    PollIdTooLong,

    #[msg("Title cannot exceed 256 characters")]
    TitleTooLong,

    #[msg("Option text cannot exceed 128 characters")]
    OptionTextTooLong,

    #[msg("End time must be in the future")]
    InvalidEndTime,

    #[msg("Poll is not active")]
    PollNotActive,

    #[msg("Poll has ended")]
    PollEnded,

    #[msg("Poll has not ended yet")]
    PollNotEnded,

    #[msg("Bet amount must be between 0.01 and 100 SOL")]
    InvalidBetAmount,

    #[msg("Unauthorized action")]
    Unauthorized,

    #[msg("Poll is not settled")]
    PollNotSettled,

    #[msg("Bid has already been claimed")]
    BidAlreadyClaimed,

    #[msg("This bid did not win")]
    BidDidNotWin,

    #[msg("Poll is not cancelled")]
    PollNotCancelled,

    #[msg("Provided bid index does not match next available index")]
    InvalidBidIndex,
}