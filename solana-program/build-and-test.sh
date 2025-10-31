#!/bin/bash

# Complete build and test script
# This handles everything from scratch

set -e

echo "==========================================="
echo "Yukti - Complete Build & Test"
echo "==========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Step 1: Check prerequisites
echo "Step 1: Checking prerequisites..."

if ! command -v anchor &> /dev/null; then
    print_error "Anchor CLI not found!"
    echo "Please install Anchor first:"
    echo "  cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    echo "  avm install 0.32.1"
    echo "  avm use 0.32.1"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    print_error "Solana CLI not found!"
    echo "Please install Solana CLI first"
    exit 1
fi

print_success "Prerequisites OK"
echo ""

# Step 2: Clean previous builds
echo "Step 2: Cleaning previous builds..."
anchor clean
rm -rf target/
rm -rf .anchor/
print_success "Clean complete"
echo ""

# Step 3: Build the program
echo "Step 3: Building Solana program..."
print_info "This may take a few minutes on first build..."

if anchor build; then
    print_success "Build successful!"

    # Check IDL was generated
    if [ -f "target/idl/opinion_trading.json" ]; then
        print_success "IDL generated: target/idl/opinion_trading.json"
    else
        print_error "IDL not generated!"
        exit 1
    fi

    # Check program was compiled
    if [ -f "target/deploy/opinion_trading.so" ]; then
        print_success "Program compiled: target/deploy/opinion_trading.so"
        SIZE=$(du -h target/deploy/opinion_trading.so | cut -f1)
        echo "   Size: $SIZE"
    else
        print_error "Program not compiled!"
        exit 1
    fi
else
    print_error "Build failed!"
    echo ""
    echo "Common fixes:"
    echo "1. Make sure Rust is installed: rustc --version"
    echo "2. Update Rust: rustup update"
    echo "3. Check Cargo.toml has correct Anchor version (0.32.1)"
    exit 1
fi

echo ""

# Step 4: Check/start validator
echo "Step 4: Checking validator..."

if pgrep -f "solana-test-validator" > /dev/null; then
    print_success "Validator is already running"
else
    print_info "Starting validator..."
    solana-test-validator > validator.log 2>&1 &
    VALIDATOR_PID=$!
    echo $VALIDATOR_PID > validator.pid

    print_info "Waiting for validator to start (15 seconds)..."
    sleep 15

    if pgrep -f "solana-test-validator" > /dev/null; then
        print_success "Validator started (PID: $VALIDATOR_PID)"
    else
        print_error "Failed to start validator!"
        cat validator.log
        exit 1
    fi
fi

echo ""

# Step 5: Configure Solana
echo "Step 5: Configuring Solana..."
solana config set --url localhost
print_success "Configured for localhost"

# Check wallet
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    print_info "No wallet found, generating..."
    solana-keygen new --no-bip39-passphrase
fi

WALLET=$(solana-keygen pubkey ~/.config/solana/id.json)
print_success "Wallet: $WALLET"

# Request airdrop
print_info "Requesting airdrop..."
solana airdrop 10 --url localhost > /dev/null 2>&1 || true
sleep 2

BALANCE=$(solana balance --url localhost 2>/dev/null || echo "0 SOL")
print_success "Balance: $BALANCE"

echo ""

# Step 6: Deploy program
echo "Step 6: Deploying program..."

if anchor deploy --provider.cluster localnet; then
    print_success "Program deployed!"

    PROGRAM_ID=$(solana-keygen pubkey target/deploy/opinion_trading-keypair.json)
    print_success "Program ID: $PROGRAM_ID"

    # Verify on chain
    if solana program show $PROGRAM_ID --url localhost > /dev/null 2>&1; then
        print_success "Program verified on-chain"
    else
        print_error "Program not found on-chain!"
        exit 1
    fi
else
    print_error "Deployment failed!"
    exit 1
fi

echo ""

# Step 7: Run simple test first
echo "Step 7: Running simple connection test..."

if yarn ts-mocha -p ./tsconfig.json -t 60000 tests/simple-test.ts; then
    print_success "Simple test passed!"
else
    print_error "Simple test failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check validator logs: tail validator.log"
    echo "2. Check program deployed: solana program show $PROGRAM_ID"
    echo "3. Check IDL exists: ls -la target/idl/"
    exit 1
fi

echo ""

# Step 8: Run full test suite
echo "Step 8: Running full test suite..."
print_info "This runs all comprehensive tests..."

if anchor test --skip-local-validator; then
    echo ""
    print_success "ALL TESTS PASSED! ✓"
    echo ""
    echo "==========================================="
    echo "SUCCESS! Program fully tested"
    echo "==========================================="
    echo ""
    echo "Program ID: $PROGRAM_ID"
    echo "Treasury: GomH9QWfBSX2sYiwDms3XrQUd5nCgqT6E7DxSgHuZbB3"
    echo ""
    echo "Next steps:"
    echo "1. Deploy to devnet:"
    echo "   solana config set --url devnet"
    echo "   anchor deploy --provider.cluster devnet"
    echo ""
    echo "2. Integrate with backend:"
    echo "   Update SOLANA_RPC_URL in backend-api/src/services/solana.service.ts"
    echo ""
    echo "3. Test with mobile app:"
    echo "   Connect wallet and place test bids"
    echo ""
else
    echo ""
    print_error "Tests failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if types match:"
    echo "   The test uses: anchor.workspace.opinion_trading"
    echo "   Program name in Anchor.toml: opinion_trading"
    echo ""
    echo "2. Rebuild and try again:"
    echo "   anchor clean && anchor build"
    echo "   ./build-and-test.sh"
    echo ""
    echo "3. Check validator logs:"
    echo "   tail -f validator.log"
    echo ""
    exit 1
fi
