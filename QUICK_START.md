# 🚀 Quick Start Guide - Opinion Trading Platform

Get your Opinion Trading Platform up and running in 5 minutes!

---

## 🎯 Prerequisites

- ✅ Solana CLI installed
- ✅ Node.js 16+ installed
- ✅ Bun or npm installed
- ✅ PostgreSQL running
- ✅ Expo CLI installed (for mobile)

---

## 📋 Step 1: Start Solana Localnet (Terminal 1)

```bash
cd solana-program
solana-test-validator
```

**Expected output:**
```
Ledger location: test-ledger
✅ Listening on http://127.0.0.1:8899
```

**Keep this terminal running!**

---

## 📋 Step 2: Start Backend API (Terminal 2)

```bash
cd backend-api

# Install dependencies (if not already done)
npm install

# Run database migrations
npm run prisma:migrate

# Start the server
npm run dev
```

**Expected output:**
```
🚀 Server running on http://localhost:8000
✅ Database connected
✅ Solana service initialized
```

**Keep this terminal running!**

---

## 📋 Step 3: Start Mobile App (Terminal 3)

```bash
cd mobile-app/yukti

# Install dependencies (if not already done)
npm install

# Start Expo
npm start
```

**Expected output:**
```
Metro waiting on exp://192.168.x.x:8081
› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

**Keep this terminal running!**

---

## 🧪 Step 4: Test the Integration

### Option A: Run Automated Test

```bash
# In a new terminal
cd backend-api
bun run test-solana-integration.ts
```

**Expected output:**
```
╔════════════════════════════════════════════════╗
║  Solana Backend Integration Test              ║
╚════════════════════════════════════════════════╝

✅ Connected to Solana
✅ Program account found
✅ SDK initialized
✅ All critical tests passed!
```

### Option B: Manual Testing

#### 1. Create a Poll

```bash
curl -X POST http://localhost:8000/api/v1/polls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Will it rain tomorrow?",
    "description": "Weather prediction for tomorrow",
    "category": "OTHER",
    "endDate": "2025-11-01T23:59:59Z",
    "onChain": true
  }'
```

#### 2. Get All Polls

```bash
curl http://localhost:8000/api/v1/polls
```

#### 3. Place a Bid (requires authentication)

```bash
curl -X POST http://localhost:8000/api/v1/bids \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "pollId": "poll-uuid-here",
    "optionId": "option-uuid-here",
    "amount": 100
  }'
```

---

## 📱 Step 5: Test on Mobile

1. **Open the app** on your device or simulator

2. **Create an account / Login**

3. **Connect Wallet** (use Phantom or Solflare)

4. **Browse Polls** - See all active polls

5. **Place a Bet** - Click on a poll and place a bet

6. **Check Portfolio** - View your active bids

---

## 🔍 Verify Blockchain Integration

### Check Poll on Blockchain

```bash
cd solana-program

# Get poll PDA
solana-keygen grind --starts-with poll:1

# View poll account
solana account <POLL_PDA_ADDRESS>
```

### Check Transaction

```bash
# View recent transactions
solana confirm <TRANSACTION_SIGNATURE> -v
```

### Use Solana Explorer

1. Go to https://explorer.solana.com/?cluster=custom
2. Add custom cluster: `http://127.0.0.1:8899`
3. Search for your program ID: `3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C`
4. View all transactions

---

## 📊 Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│             │────▶│              │────▶│                │
│  Mobile App │     │  Backend API │     │    Solana      │
│             │◀────│              │◀────│   Localnet     │
└─────────────┘     └──────┬───────┘     └────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    └──────────────┘
```

---

## ✅ Success Checklist

- [ ] Localnet validator is running
- [ ] Backend server is running on port 8000
- [ ] Mobile app is running
- [ ] Integration test passes
- [ ] Can create polls via API
- [ ] Can view polls in mobile app
- [ ] Can place bids from mobile app
- [ ] Polls are created on blockchain
- [ ] Bids are recorded on blockchain

---

## 🐛 Common Issues

### Issue: "Connection refused to Solana"

**Solution:**
```bash
# Make sure validator is running
solana-test-validator --reset
```

### Issue: "Program account not found"

**Solution:**
```bash
# Redeploy the program
cd solana-program
anchor build
anchor deploy --provider.cluster localnet
```

### Issue: "Database connection failed"

**Solution:**
```bash
# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Linux

# Run migrations
cd backend-api
npm run prisma:migrate
```

### Issue: "Module not found"

**Solution:**
```bash
# Reinstall dependencies
cd backend-api && npm install
cd ../mobile-app/yukti && npm install
```

### Issue: "Transaction simulation failed"

**Solution:**
1. Check poll is still active
2. Ensure user has enough SOL
3. Verify bet amount is within limits (0.01 - 100 SOL)
4. Check poll hasn't ended

---

## 📚 Next Steps

1. **Read Full Documentation**
   - [INTEGRATION_COMPLETE.md](./INTEGRATION_COMPLETE.md) - Complete integration details
   - [solana-program/BACKEND_INTEGRATION.md](./solana-program/BACKEND_INTEGRATION.md) - Backend guide
   - [solana-program/MOBILE_INTEGRATION.md](./solana-program/MOBILE_INTEGRATION.md) - Mobile guide

2. **Deploy to Devnet**
   ```bash
   cd solana-program
   anchor deploy --provider.cluster devnet
   ```
   Update all `.env` files with new program ID and RPC URL

3. **Add Custom Features**
   - Implement your own poll types
   - Add more betting options
   - Customize UI/UX
   - Add analytics

4. **Security Audit**
   - Review smart contract code
   - Test edge cases
   - Audit admin functions

5. **Production Deployment**
   - Deploy to mainnet-beta
   - Set up monitoring
   - Configure RPC providers (Alchemy, QuickNode, etc.)

---

## 🆘 Need Help?

### Resources
- **Full Integration Documentation**: [INTEGRATION_COMPLETE.md](./INTEGRATION_COMPLETE.md)
- **Troubleshooting**: Check the troubleshooting section in INTEGRATION_COMPLETE.md
- **Solana Docs**: https://docs.solana.com/
- **Anchor Docs**: https://www.anchor-lang.com/

### Test Script
```bash
cd backend-api
bun run test-solana-integration.ts
```

This will diagnose common issues automatically.

---

## 🎉 You're All Set!

Your Opinion Trading Platform is now running with full blockchain integration!

**What you have:**
- ✅ Solana smart contract deployed
- ✅ Backend API with database
- ✅ Mobile app with wallet integration
- ✅ Real-time odds updates (AMM)
- ✅ Secure escrow and settlement
- ✅ Platform fee collection (2%)

**Happy Trading! 🚀**

---

**Last Updated:** October 31, 2025
