#!/usr/bin/env bash
# StellarSplit — Full Deployment Automation
#
# Usage:
#   ./deploy.sh                   # Deploy to testnet
#   ./deploy.sh testnet           # Deploy to testnet (explicit)
#   ./deploy.sh mainnet           # Deploy to mainnet (requires --confirm-mainnet)
#   ./deploy.sh mainnet --confirm-mainnet   # Actually deploy to mainnet
#   ./deploy.sh upgrade testnet   # Upgrade existing contract on testnet
#
# What this script does:
#   1. Pre-flight checks (tools, identity, funds)
#   2. Run contract tests (must pass before any deployment)
#   3. Build WASM (stellar_split + stellar_split_token)
#   4. [Mainnet only] Double-confirm and balance check
#   5. Deploy / upgrade both contracts
#   6. Post-deploy smoke test
#   7. Auto-update frontend/.env and backend/.env with new contract IDs
#   8. Save deployment record to deployments.json

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${BLUE}▶${RESET}  $*"; }
ok()   { echo -e "${GREEN}✓${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
fail() { echo -e "${RED}✗${RESET}  $*"; exit 1; }
hr()   { echo -e "${BOLD}────────────────────────────────────────────────${RESET}"; }

# ── Args ─────────────────────────────────────────────────────────────────────
ACTION="${1:-deploy}"
NETWORK="${2:-testnet}"
CONFIRM_FLAG="${3:-}"

if [[ "$ACTION" == "testnet" || "$ACTION" == "mainnet" ]]; then
  NETWORK="$ACTION"
  ACTION="${2:-deploy}"
  CONFIRM_FLAG="${3:-}"
fi

IDENTITY_NAME="${STELLAR_IDENTITY:-deployer}"
WASM_SPLIT="target/wasm32-unknown-unknown/release/stellar_split.wasm"
WASM_TOKEN="target/wasm32-unknown-unknown/release/stellar_split_token.wasm"
DEPLOY_LOG="deployments.json"
SKIP_TESTS="${SKIP_TESTS:-}"

# ── Banner ───────────────────────────────────────────────────────────────────
hr
echo -e "  ${BOLD}StellarSplit Deployment Automation${RESET}"
echo -e "  Action: ${BOLD}${ACTION}${RESET}  |  Network: ${BOLD}${NETWORK}${RESET}"
hr

# ── Mainnet gate ─────────────────────────────────────────────────────────────
if [[ "$NETWORK" == "mainnet" && "$CONFIRM_FLAG" != "--confirm-mainnet" ]]; then
  echo ""
  warn "Mainnet deployment requires explicit confirmation."
  echo "  Re-run with:  ${BOLD}./deploy.sh mainnet --confirm-mainnet${RESET}"
  echo ""
  echo "  Before deploying to mainnet, ensure:"
  echo "    □ All contract tests pass on testnet"
  echo "    □ Security audit is complete"
  echo "    □ Deployer wallet has sufficient XLM (>= 10 XLM)"
  echo "    □ Contract ID in .env files is set to CHANGE_ME (will be updated)"
  echo ""
  exit 1
fi

# ── Pre-flight: required tools ────────────────────────────────────────────────
log "Checking required tools..."
for cmd in stellar cargo jq; do
  if ! command -v "$cmd" &>/dev/null; then
    fail "'$cmd' is not installed. See README for setup instructions."
  fi
done

# Check wasm target
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
  log "Adding wasm32-unknown-unknown target..."
  rustup target add wasm32-unknown-unknown
fi
ok "All tools found"

# ── Step 1: Run contract tests ────────────────────────────────────────────────
if [[ -z "$SKIP_TESTS" ]]; then
  log "Running contract tests (set SKIP_TESTS=1 to skip)..."
  if ! cargo test 2>&1; then
    fail "Contract tests failed. Fix tests before deploying."
  fi
  ok "All contract tests passed"
else
  warn "SKIP_TESTS set — skipping contract tests (not recommended)"
fi

# ── Step 2: Build WASM ────────────────────────────────────────────────────────
log "Building stellar_split contract WASM..."
cargo build --target wasm32-unknown-unknown --release \
  --package stellar_split 2>&1 | grep -E "Compiling|Finished|error" || true

if [ ! -f "$WASM_SPLIT" ]; then
  fail "WASM not found at $WASM_SPLIT — check cargo build output"
fi
ok "stellar_split WASM built: $(du -h "$WASM_SPLIT" | cut -f1)"

# Build token contract if it exists
if [ -d "contracts/stellar_split_token" ] || [ -d "stellar_split_token" ]; then
  log "Building stellar_split_token contract WASM..."
  cargo build --target wasm32-unknown-unknown --release \
    --package stellar_split_token 2>&1 | grep -E "Compiling|Finished|error" || true
  if [ -f "$WASM_TOKEN" ]; then
    ok "stellar_split_token WASM built: $(du -h "$WASM_TOKEN" | cut -f1)"
    HAS_TOKEN=1
  else
    warn "stellar_split_token WASM not found — token contract will not be deployed"
    HAS_TOKEN=0
  fi
else
  HAS_TOKEN=0
fi

# ── Step 3: Ensure deployer identity ─────────────────────────────────────────
log "Checking deployer identity '$IDENTITY_NAME'..."
if ! stellar keys show "$IDENTITY_NAME" &>/dev/null 2>&1; then
  log "Creating new deployer identity '$IDENTITY_NAME'..."
  stellar keys generate "$IDENTITY_NAME" --network "$NETWORK"
fi

DEPLOYER_ADDR=$(stellar keys address "$IDENTITY_NAME")
ok "Deployer: $DEPLOYER_ADDR"

# ── Step 4: Fund / balance check ──────────────────────────────────────────────
if [[ "$NETWORK" == "testnet" ]]; then
  log "Funding deployer on testnet via Friendbot..."
  if curl -sf "https://friendbot.stellar.org/?addr=$DEPLOYER_ADDR" > /dev/null 2>&1; then
    ok "Funded via Friendbot"
  else
    warn "Friendbot failed (account may already have funds)"
  fi
fi

if [[ "$NETWORK" == "mainnet" ]]; then
  log "Checking mainnet balance..."
  BALANCE=$(stellar account balance "$DEPLOYER_ADDR" --network mainnet 2>/dev/null | grep XLM | awk '{print $1}' || echo "0")
  BALANCE_INT=$(echo "$BALANCE" | cut -d. -f1)
  if [[ "${BALANCE_INT:-0}" -lt 10 ]]; then
    fail "Mainnet deployer balance is ${BALANCE} XLM. Need at least 10 XLM. Fund $DEPLOYER_ADDR and retry."
  fi
  ok "Mainnet balance: ${BALANCE} XLM"
fi

# ── Step 5: Deploy / upgrade ──────────────────────────────────────────────────
deploy_contract() {
  local name="$1"
  local wasm="$2"

  if [[ "$ACTION" == "upgrade" ]]; then
    # Upgrade requires existing contract ID from env
    local env_key="VITE_CONTRACT_ID"
    if [[ "$name" == "token" ]]; then env_key="VITE_SPLT_CONTRACT_ID"; fi

    local existing_id=""
    if [ -f "frontend/.env" ]; then
      existing_id=$(grep "^${env_key}=" frontend/.env | cut -d= -f2 | tr -d '"' | tr -d "'" || true)
    fi
    if [[ -z "$existing_id" ]]; then
      fail "Cannot upgrade: $env_key not found in frontend/.env. Deploy first."
    fi

    log "Upgrading $name contract ($existing_id)..."
    stellar contract upload \
      --wasm "$wasm" \
      --source "$IDENTITY_NAME" \
      --network "$NETWORK" > /dev/null
    stellar contract invoke \
      --id "$existing_id" \
      --source "$IDENTITY_NAME" \
      --network "$NETWORK" \
      -- upgrade --new-wasm-hash "$(stellar contract install --wasm "$wasm" --source "$IDENTITY_NAME" --network "$NETWORK")" 2>&1 || {
      warn "Upgrade via invoke failed — contract may not support upgrade(). Re-deploying instead."
      ACTION="deploy"
    }
    if [[ "$ACTION" == "upgrade" ]]; then
      echo "$existing_id"
      return
    fi
  fi

  log "Deploying $name contract to $NETWORK..."
  local contract_id
  contract_id=$(stellar contract deploy \
    --wasm "$wasm" \
    --source "$IDENTITY_NAME" \
    --network "$NETWORK" 2>&1) || fail "Deployment of $name failed:\n$contract_id"

  echo "$contract_id"
}

SPLIT_CONTRACT_ID=$(deploy_contract "stellar_split" "$WASM_SPLIT")
ok "stellar_split deployed: $SPLIT_CONTRACT_ID"

TOKEN_CONTRACT_ID=""
if [[ "$HAS_TOKEN" == "1" ]]; then
  TOKEN_CONTRACT_ID=$(deploy_contract "stellar_split_token" "$WASM_TOKEN")
  ok "stellar_split_token deployed: $TOKEN_CONTRACT_ID"
fi

# ── Step 6: Post-deploy smoke test ────────────────────────────────────────────
log "Running smoke test (contract is accessible)..."
SMOKE_RESULT=$(stellar contract invoke \
  --id "$SPLIT_CONTRACT_ID" \
  --source "$IDENTITY_NAME" \
  --network "$NETWORK" \
  -- get_groups \
  --caller "$DEPLOYER_ADDR" 2>&1) || SMOKE_RESULT="invoke_failed"

if [[ "$SMOKE_RESULT" != "invoke_failed" ]]; then
  ok "Smoke test passed (get_groups responded)"
else
  warn "Smoke test failed — contract may need initialization. Proceeding anyway."
fi

# ── Step 7: Update .env files ─────────────────────────────────────────────────
update_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if [ ! -f "$file" ]; then
    warn "$file not found — skipping update"
    return
  fi

  if grep -q "^${key}=" "$file"; then
    # Replace existing line (cross-platform sed)
    local tmp="${file}.tmp"
    grep -v "^${key}=" "$file" > "$tmp"
    echo "${key}=${value}" >> "$tmp"
    mv "$tmp" "$file"
  else
    echo "${key}=${value}" >> "$file"
  fi
  ok "Updated ${key} in $file"
}

log "Updating .env files with new contract ID..."

# Frontend env
update_env "frontend/.env" "VITE_CONTRACT_ID" "$SPLIT_CONTRACT_ID"
if [[ -n "$TOKEN_CONTRACT_ID" ]]; then
  update_env "frontend/.env" "VITE_SPLT_CONTRACT_ID" "$TOKEN_CONTRACT_ID"
fi

# Backend env
update_env "backend/.env" "SOROBAN_CONTRACT_ID" "$SPLIT_CONTRACT_ID"

# ── Step 8: Save deployment record ───────────────────────────────────────────
log "Saving deployment record..."
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
RECORD=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg network "$NETWORK" \
  --arg splitId "$SPLIT_CONTRACT_ID" \
  --arg tokenId "$TOKEN_CONTRACT_ID" \
  --arg deployer "$DEPLOYER_ADDR" \
  --arg action "$ACTION" \
  '{timestamp: $ts, network: $network, action: $action, deployer: $deployer,
    contracts: {stellar_split: $splitId, stellar_split_token: $tokenId}}')

if [ -f "$DEPLOY_LOG" ]; then
  jq ". += [$RECORD]" "$DEPLOY_LOG" > "${DEPLOY_LOG}.tmp" && mv "${DEPLOY_LOG}.tmp" "$DEPLOY_LOG"
else
  echo "[$RECORD]" > "$DEPLOY_LOG"
fi
ok "Deployment record saved to $DEPLOY_LOG"

# ── Summary ───────────────────────────────────────────────────────────────────
hr
echo -e "  ${GREEN}${BOLD}DEPLOYMENT SUCCESSFUL${RESET}"
echo ""
echo -e "  Network:          ${BOLD}${NETWORK}${RESET}"
echo -e "  Contract (Split): ${BOLD}${SPLIT_CONTRACT_ID}${RESET}"
if [[ -n "$TOKEN_CONTRACT_ID" ]]; then
  echo -e "  Contract (Token): ${BOLD}${TOKEN_CONTRACT_ID}${RESET}"
fi
echo -e "  Explorer:         https://stellar.expert/explorer/${NETWORK}/contract/${SPLIT_CONTRACT_ID}"
echo ""
echo -e "  ${YELLOW}Next steps:${RESET}"
echo "    □ Verify frontend/.env has the correct VITE_CONTRACT_ID"
echo "    □ Verify backend/.env has the correct SOROBAN_CONTRACT_ID"
if [[ "$NETWORK" == "testnet" ]]; then
  echo "    □ Run E2E tests:  cd frontend && npx playwright test"
  echo "    □ When ready:     ./deploy.sh mainnet --confirm-mainnet"
fi
hr
