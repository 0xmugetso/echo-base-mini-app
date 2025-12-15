// CDP metrics test script (CommonJS) - fetch limited pages and compute summary stats
const dotenv = require('dotenv');

// Load CDP_API_KEY from .env.local
dotenv.config({ path: '.env.local' });

const address = '0x6bd8965a5e66ec06c29800fb3a79b43f56d758cd'.toLowerCase();

async function fetchTxPage(cursor, limit = 25) {
  const apiKey = process.env.CDP_API_KEY;
  const network = process.env.CDP_NETWORK || 'base-mainnet';

  if (!apiKey) {
    throw new Error('CDP_API_KEY is not set in .env.local');
  }

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (cursor) params.set('page', cursor);

  const url = `https://api.cdp.coinbase.com/platform/v1/networks/${network}/addresses/${address}/transactions?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CDP error ${res.status}: ${errText}`);
  }

  return res.json();
}

async function main() {
  let cursor;
  const allTxs = [];

  const pageLimit = 25; // reduce payload to avoid resource_exhausted
  const maxPages = 2;   // cap pages to further reduce size

  for (let i = 0; i < maxPages; i++) {
    const data = await fetchTxPage(cursor, pageLimit);
    const txs = data.data || data.transactions || [];
    allTxs.push(...txs);

    if (!data.has_more || !data.next_page) break;
    cursor = data.next_page;
  }

  console.log('Fetched txs:', allTxs.length);

  let totalFees = 0n;
  let totalVolumeOut = 0n;
  let firstTs = Number.MAX_SAFE_INTEGER;

  for (const tx of allTxs) {
    const content = tx.content || {};

    const ts = Date.parse(tx.block_timestamp || tx.timestamp || content.block_timestamp);
    if (!Number.isNaN(ts) && ts < firstTs) firstTs = ts;

    // Estimate fee = gas_used * (gas_price || max_fee_per_gas)
    const gasUsed = content.gas_used !== undefined ? BigInt(content.gas_used) : content.gas !== undefined ? BigInt(content.gas) : 0n;
    const price =
      content.gas_price !== undefined
        ? BigInt(content.gas_price)
        : content.max_fee_per_gas !== undefined
        ? BigInt(content.max_fee_per_gas)
        : 0n;
    totalFees += gasUsed * price;

    // Net outgoing native value
    const fromAddr = (tx.from_address_id || content.from || '').toLowerCase();
    if (fromAddr === address) {
      const val = content.value !== undefined ? BigInt(content.value) : 0n;
      totalVolumeOut += val;
    }
  }

  const total_tx = allTxs.length;
  const first_tx_date = firstTs === Number.MAX_SAFE_INTEGER ? null : new Date(firstTs);
  const wallet_age_days = first_tx_date ? (Date.now() - firstTs) / (1000 * 60 * 60 * 24) : null;

  const weiToEth = (x) => Number(x) / 1e18;

  console.log({
    total_tx,
    total_fees_paid_wei: totalFees.toString(),
    total_fees_paid_eth: weiToEth(totalFees),
    total_volume_out_wei: totalVolumeOut.toString(),
    total_volume_out_eth: weiToEth(totalVolumeOut),
    first_tx_date,
    wallet_age_days,
  });
}

main().catch((err) => {
  console.error('Unexpected error:', err);
});
