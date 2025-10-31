# Yukti Opinion Trading Platform - Solana Program

A decentralized prediction market platform built on Solana with AMM (Automated Market Maker) functionality.

## Features

✅ **Initialize Poll** - Create on-chain prediction markets
✅ **Place Bid** - Bet with automatic AMM odds adjustment
✅ **Settle Poll** - Admin declares winner
✅ **Claim Winnings** - Winners get payout (98% of win, 2% fee)
✅ **Cancel & Refund** - Full refunds for cancelled polls
✅ **Get Data** - Query polls, bids, and statistics

## Security & Features

- **PDA Vaults** - All funds secured in program-controlled accounts
- **AMM Algorithm** - Dynamic odds like Polymarket/PredictIt
- **Atomic Transactions** - All-or-nothing execution
- **Validations** - Amount limits, time checks, authority verification
- **Events** - Full indexing support

Platform Fee: 2% on winning payouts

## Prerequisites

1. Install Rust: https://rustup.rs/
2. Install Solana CLI: https://docs.solana.com/cli/install-solana-cli-tools
3. Install Anchor: https://www.anchor-lang.com/docs/installation

```bash
# Verify installations
rustc --version
solana --version
anchor --version
```

## Setup

### 1. Generate Admin Keypair

```bash
cd solana-program
npm run keygen
```

This creates `admin-keypair.json` - **Keep this secure!**

### 2. Configure Solana CLI

```bash
# Set to devnet for testing
solana config set --url devnet

# Set default keypair
solana config set --keypair ./admin-keypair.json

# Get airdrop for testing
npm run airdrop

# Check balance
npm run balance
```

### 3. Install Dependencies

```bash
npm install
```

## Build

```bash
# Build the program
npm run build

# Output: target/deploy/opinion_trading.so
```

## Testing

### Local Testing (Recommended for Development)

```bash
# Start local validator in one terminal
npm run localnet

# In another terminal, run tests
npm test
```

### Devnet Testing

```bash
# Deploy to devnet
npm run deploy:devnet

# Run integration tests against devnet
anchor test --provider.cluster devnet
```

## Deployment

### Devnet Deployment

```bash
# 1. Build the program
npm run build

# 2. Deploy to devnet
npm run deploy:devnet

# 3. Note the Program ID displayed
# Example output:
# Program Id: YUKTI1111111111111111111111111111111111111

# 4. Update Program ID in:
#    - Anchor.toml
#    - lib.rs (declare_id! macro)
#    - sdk/opinion-trading-sdk.ts
```

### Mainnet Deployment

⚠️ **Before deploying to mainnet:**

1. Audit the smart contract code
2. Test extensively on devnet
3. Have sufficient SOL for deployment (~10 SOL)
4. Update treasury address in SDK

```bash
# Deploy to mainnet-beta
npm run deploy:mainnet

# Verify deployment
npm run verify
```

## Program Architecture

### Accounts

#### Poll Account (685 bytes)
- Authority (admin who created poll)
- Poll ID and metadata
- Option A & B text and stakes
- Total pool and odds
- End timestamp and status
- Winner (once settled)
- Vault bump for PDA

#### Bid Account (99 bytes)
- Bettor public key
- Poll reference
- Bid amount and option
- Odds at purchase time
- Potential winnings
- Bid status
- Timestamp

### Instructions

1. **initialize_poll** - Create new prediction market
2. **place_bid** - Bet on an option (transfers SOL to vault)
3. **settle_poll** - Declare winner (admin only)
4. **claim_winnings** - Collect payout (98% after 2% fee)
5. **cancel_poll** - Emergency cancellation (admin only)
6. **claim_refund** - Get refund for cancelled poll

### AMM Algorithm

Uses Constant Product Market Maker (CPMM):

```
odds_a = stake_a / total_pool
odds_b = stake_b / total_pool

With smoothing to keep odds between 5% and 95%
```

As more people bet on an option, its odds increase (potential payout decreases), creating a self-balancing market.

## SDK Usage

The TypeScript SDK provides easy integration:

```typescript
import { OpinionTradingSDK } from './sdk/opinion-trading-sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const sdk = new OpinionTradingSDK(connection);

// Get poll data
const poll = await sdk.getPoll('poll-id-here');

// Get poll statistics
const stats = await sdk.getPollStats('poll-id-here');
console.log(`Total Volume: ${stats.totalVolume} SOL`);
console.log(`Option A Odds: ${stats.optionAOdds}%`);
```

## Backend Integration

The backend service (`backend-api/src/services/solana.service.ts`) handles:

- Creating polls on-chain when created in database
- Generating transaction instructions for mobile app
- Settling polls and distributing winnings
- Syncing on-chain data with database
- Verifying transactions

## Testing Checklist

- [ ] Initialize poll with valid parameters
- [ ] Place bids on both options
- [ ] Verify AMM odds update correctly
- [ ] Test insufficient balance error
- [ ] Test betting after poll ends (should fail)
- [ ] Settle poll and claim winnings
- [ ] Verify 2% platform fee calculation
- [ ] Test refund mechanism for cancelled polls
- [ ] Test unauthorized access (non-admin settle)
- [ ] Verify vault escrow holds funds correctly

## Monitoring

### Check Program Balance

```bash
solana balance YUKTI1111111111111111111111111111111111111
```

### View Program Logs

```bash
solana logs YUKTI1111111111111111111111111111111111111
```

### Get Poll Data

```bash
solana account <POLL_PDA_ADDRESS> --output json
```

## Security Considerations

1. **Admin Key Security** - Store admin keypair in secure key management system
2. **Amount Limits** - Min 0.01 SOL, Max 100 SOL per bet
3. **Time Validation** - Can't bet after poll ends
4. **Status Checks** - Polls must be in correct state for operations
5. **PDA Verification** - All PDAs verified using seeds
6. **Overflow Protection** - All math uses checked operations

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Deployment Failures

```bash
# Check balance
npm run balance

# Request airdrop if low
npm run airdrop

# Verify network connection
solana cluster-version
```

### Transaction Errors

- **"Poll not active"** - Check poll status and end time
- **"Insufficient balance"** - Check bettor's SOL balance
- **"Unauthorized"** - Ensure correct admin key is signing
- **"Bid already claimed"** - Winnings already collected

## Cost Estimates

### Devnet (Free with Airdrop)
- Poll creation: ~0.01 SOL (rent-exempt)
- Bid placement: ~0.001 SOL (rent-exempt)
- Claim winnings: ~0.001 SOL

### Mainnet
- Poll creation: ~$0.10
- Bid placement: ~$0.01
- Claim winnings: ~$0.01

## Future Enhancements

1. **Multi-outcome polls** - Support more than 2 options
2. **Time-weighted odds** - Adjust odds based on time until end
3. **Liquidity pools** - Allow LPs to provide liquidity
4. **Cross-chain bridge** - Bridge to other chains
5. **NFT rewards** - Issue NFTs for top traders
6. **DAO governance** - Community-controlled parameters

## Support

For issues or questions:
- GitHub Issues: [Create issue]
- Documentation: [Link to docs]
- Discord: [Link to community]

## License

MIT License - See LICENSE file for details
