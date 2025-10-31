#!/bin/bash

# Quick Test Script for Opinion Trading Solana Program
# This script helps you quickly test the deployed program

set -e

echo "🚀 Opinion Trading - Quick Test Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if localnet validator is running
echo -e "${BLUE}📡 Checking Solana validator...${NC}"
if ! solana cluster-version > /dev/null 2>&1; then
    echo -e "${RED}❌ Solana validator is not running!${NC}"
    echo -e "${YELLOW}Please start it in another terminal with:${NC}"
    echo "   solana-test-validator"
    exit 1
fi
echo -e "${GREEN}✅ Validator is running${NC}"
echo ""

# Check program deployment
PROGRAM_ID="3YaSKpdV7iGrjUKAy6mKEFCSNV3bTyZVncceD34Bun1C"
echo -e "${BLUE}🔍 Checking program deployment...${NC}"
if solana program show $PROGRAM_ID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Program is deployed${NC}"
    echo "   Program ID: $PROGRAM_ID"
else
    echo -e "${RED}❌ Program not found!${NC}"
    echo -e "${YELLOW}Deploying program...${NC}"
    anchor deploy --provider.cluster localnet
fi
echo ""

# Run tests
echo -e "${BLUE}🧪 Running tests...${NC}"
echo ""
anchor test --skip-local-validator

echo ""
echo -e "${GREEN}======================================"
echo "✅ All tests completed successfully!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}📊 Program Information:${NC}"
echo "   Program ID: $PROGRAM_ID"
echo "   Network: Localnet"
echo "   RPC: http://127.0.0.1:8899"
echo ""
echo -e "${BLUE}📁 Integration Files:${NC}"
echo "   IDL: target/idl/opinion_trading.json"
echo "   Types: target/types/opinion_trading.ts"
echo ""
echo -e "${YELLOW}📖 Next Steps:${NC}"
echo "   1. Copy IDL file to your backend/mobile app"
echo "   2. Follow BACKEND_INTEGRATION.md for backend setup"
echo "   3. Follow MOBILE_INTEGRATION.md for mobile setup"
echo ""
echo -e "${GREEN}🎉 Ready for integration!${NC}"
