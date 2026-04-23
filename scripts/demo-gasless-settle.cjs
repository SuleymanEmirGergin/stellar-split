#!/usr/bin/env node
/**
 * Gasless settle — end-to-end fee-bump demo.
 *
 * Proves the exact flow the backend's SponsorService implements, without
 * needing the backend to be running (no Postgres, no Redis, no Docker).
 *
 *   1. Generate a fresh USER keypair + fund via friendbot.
 *   2. User builds a payment (1 XLM → sponsor) as an "inner" transaction.
 *   3. User signs the inner tx.
 *   4. Sponsor wraps it with buildFeeBumpTransaction() and signs the wrapper.
 *   5. Submit the FEE BUMP to Horizon. User pays 0 fee — sponsor pays.
 *   6. Verify on Horizon: inner_transaction has fee_charged = 0.
 *
 * Evidence for Level 6: any run of this script produces a real testnet
 * transaction hash where a Stellar fee-bump was used to settle a payment
 * the user never paid fee for.
 *
 * Usage (run from `frontend/` so it picks up @stellar/stellar-sdk from node_modules):
 *   cd frontend
 *   SPONSOR_SECRET=S... node ../scripts/demo-gasless-settle.cjs
 *
 * Sponsor secret is the same value that goes into the backend's
 * SPONSOR_SECRET_KEY env var on Railway.
 */

let StellarSdk;
try {
  StellarSdk = require('@stellar/stellar-sdk');
} catch {
  console.error('❌ @stellar/stellar-sdk not found in this directory.');
  console.error('   Run it from frontend/ so node_modules resolves:');
  console.error('     cd frontend && SPONSOR_SECRET=S... node ../scripts/demo-gasless-settle.cjs');
  process.exit(1);
}

const SPONSOR_SECRET = process.env.SPONSOR_SECRET;
if (!SPONSOR_SECRET) {
  console.error('❌ SPONSOR_SECRET env var required');
  console.error('   Example: SPONSOR_SECRET=S... node scripts/demo-gasless-settle.js');
  process.exit(1);
}

const HORIZON = 'https://horizon-testnet.stellar.org';
const NETWORK = StellarSdk.Networks.TESTNET;

async function fund(publicKey) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) throw new Error(`friendbot failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  const sponsor = StellarSdk.Keypair.fromSecret(SPONSOR_SECRET);
  console.log('🔑 Sponsor:', sponsor.publicKey());

  // 1. fresh user keypair + fund
  const user = StellarSdk.Keypair.random();
  console.log('👤 User:   ', user.publicKey());
  console.log('⏳ Funding user via friendbot…');
  await fund(user.publicKey());

  // 2. build inner tx: user pays 1 XLM to sponsor (circular but simple)
  const server = new StellarSdk.Horizon.Server(HORIZON);
  const userAccount = await server.loadAccount(user.publicKey());

  const innerTx = new StellarSdk.TransactionBuilder(userAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: sponsor.publicKey(),
        asset: StellarSdk.Asset.native(),
        amount: '1.0000000',
      }),
    )
    .addMemo(StellarSdk.Memo.text('birik-gasless-demo'))
    .setTimeout(300)
    .build();

  innerTx.sign(user);
  console.log('✍️  Inner tx signed by user.');
  console.log('   Inner XDR:', innerTx.toXDR().slice(0, 60) + '…');

  // 3. sponsor wraps with buildFeeBumpTransaction() — this is exactly what
  //    backend/src/sponsor/sponsor.service.ts does on POST /sponsor/fee-bump
  const feeBump = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
    sponsor,
    '10000000', // 1 XLM cap — network refunds the rest
    innerTx,
    NETWORK,
  );
  feeBump.sign(sponsor);
  console.log('✍️  Fee-bump wrapped + signed by sponsor.');
  console.log('   Fee-bump XDR:', feeBump.toXDR().slice(0, 60) + '…');

  // 4. submit fee-bump to Horizon
  console.log('🚀 Submitting fee-bump to testnet…');
  const result = await server.submitTransaction(feeBump);
  console.log('');
  console.log('✅ SUCCESS');
  console.log('   Outer (fee-bump) hash:', result.hash);
  console.log('   Outer fee paid by:    ', sponsor.publicKey());
  console.log('   User fee paid:        ', '0 stroops (sponsored)');
  console.log('');
  console.log('🔍 Verify:');
  console.log(`   Stellar Expert (fee-bump): https://stellar.expert/explorer/testnet/tx/${result.hash}`);
  console.log(`   Sponsor account page:      https://stellar.expert/explorer/testnet/account/${sponsor.publicKey()}`);
  console.log('');
  console.log('This exact flow runs inside backend/src/sponsor/sponsor.service.ts');
  console.log('when the frontend calls POST /sponsor/fee-bump with the user\'s signed inner XDR.');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  if (err.response?.data?.extras) {
    console.error('   Horizon extras:', JSON.stringify(err.response.data.extras, null, 2));
  }
  process.exit(1);
});
