// CDP query run test (single attempt with small limit + retry on 5xx)
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const address = '0x6bd8965a5e66ec06c29800fb3a79b43f56d758cd'.toLowerCase();

async function runQuery(token) {
  const CDP_SQL_URL = 'https://api.cdp.coinbase.com/platform/v2/data/query/run';

  const sql = `
    SELECT
      COUNT(*) AS total_tx
    FROM base.transactions
    WHERE
      timestamp >= '2024-08-01T00:00:00Z'
      AND timestamp <  '2024-09-01T00:00:00Z'
      AND (from_address = lower('${address}')
           OR to_address = lower('${address}'))
      AND action = 1
  `;

  // const res = await fetch(CDP_SQL_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     sql,
  //     cache: { maxAgeMs: 60_000 }, // 60s cache inside CDP (optional)
  //   }),
  // });

  const res = await fetch('https://mainnet.base.org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'wallet_connect',
      params: [address],
    }),
  });

  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function main() {
  const token = process.env.CLIENT_TOKEN || process.env.CDP_API_KEY;
  if (!token) throw new Error('Missing CLIENT_TOKEN or CDP_API_KEY in .env.local');

  let result = await runQuery(token);
  if (!result.ok && result.status >= 500) {
    // one retry on 5xx
    result = await runQuery(token);
  }

  if (!result.ok) {
    console.error(`Error ${result.status}: ${result.text}`);
    return;
  }

  try {
    const json = JSON.parse(result.text);
    console.log(JSON.stringify(json, null, 2));
  } catch {
    console.log(result.text);
  }
}

main().catch((err) => console.error('Unexpected error:', err));
