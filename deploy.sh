#!/usr/bin/env bash
# StellarSplit — Deploy Script (Hardened)
# Usage: ./deploy.sh [network]
#   network: testnet (default) | mainnet
set -euo pipefail

# ── Config ──
NETWORK="${1:-testnet}"
WASM_PATH="target/wasm32-unknown-unknown/release/stellar_split.wasm"
IDENTITY_NAME="deployer"

echo "═══════════════════════════════════════════"
echo "  ⚡ StellarSplit Deploy — ${NETWORK}"
echo "═══════════════════════════════════════════"

# ── Pre-flight checks ──
for cmd in stellar cargo; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "❌ '$cmd' not found. Please install it first."
    exit 1
  fi
done

# ── Step 1: Build WASM ──
echo ""
echo "🔨 Building contract WASM..."
cargo build --target wasm32-unknown-unknown --release

if [ ! -f "$WASM_PATH" ]; then
  echo "❌ WASM file not found at $WASM_PATH"
  exit 1
fi

echo "✅ WASM built: $(du -h "$WASM_PATH" | cut -f1)"

# ── Step 2: Ensure deployer identity ──
if ! stellar keys show "$IDENTITY_NAME" &>/dev/null 2>&1; then
  echo ""
  echo "🔑 Creating new deployer identity..."
  stellar keys generate "$IDENTITY_NAME" --network "$NETWORK"
  echo "⏳ Waiting for account funding..."
  sleep 5
fi

DEPLOYER_ADDR=$(stellar keys address "$IDENTITY_NAME")
echo "📍 Deployer: $DEPLOYER_ADDR"

# ── Step 3: Fund on testnet ──
if [ "$NETWORK" = "testnet" ]; then
  echo ""
  echo "💰 Funding deployer on testnet..."
  curl -s "https://friendbot.stellar.org/?addr=$DEPLOYER_ADDR" > /dev/null 2>&1 || {
    echo "⚠️  Friendbot funding failed (account may already be funded)"
  }
fi

# ── Step 4: Deploy ──
echo ""
echo "🚀 Deploying contract to ${NETWORK}..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$IDENTITY_NAME" \
  --network "$NETWORK" \
  2>&1) || {
    echo "❌ Deployment failed!"
    echo "$CONTRACT_ID"
    exit 1
  }

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ DEPLOYMENT SUCCESSFUL"
echo "  📄 Contract ID: $CONTRACT_ID"
echo "  🌐 Network: $NETWORK"
echo "  🔗 Explorer: https://stellar.expert/explorer/${NETWORK}/contract/${CONTRACT_ID}"
echo ""
echo "  📋 Next: Update frontend/.env with:"
echo "     VITE_CONTRACT_ID=$CONTRACT_ID"
echo "═══════════════════════════════════════════"
