#!/bin/bash
# StellarSplit — Contract Deploy Script
# Kullanım: bash scripts/deploy.sh

set -e

echo "🔨 Building contract..."
cd "$(dirname "$0")/.."
cargo build --target wasm32-unknown-unknown --release

WASM_PATH="target/wasm32-unknown-unknown/release/stellar_split.wasm"

if [ ! -f "$WASM_PATH" ]; then
    echo "❌ WASM file not found: $WASM_PATH"
    exit 1
fi

echo "📦 WASM size: $(du -h $WASM_PATH | cut -f1)"

echo ""
echo "🚀 Deploying to Stellar Testnet..."
echo ""

# Testnet'e deploy
stellar contract deploy \
    --wasm "$WASM_PATH" \
    --network testnet \
    --source-account alice

echo ""
echo "✅ Contract deployed!"
echo "📋 Copy the contract ID above and paste it into frontend/src/lib/contract.ts"
