const API_KEY = "cqt_rQTkX7Q6K87DxfMFxKw8PqFYqMHy";
fetch(`https://api.covalenthq.com/v1/base-mainnet/address/0xa7d4052c4E922b652B3A047D4eab1782137Db487/balances_v2/?nft=true`, {
  headers: { Authorization: `Bearer ${API_KEY}` }
}).then(r => r.json()).then(d => {
  const items = d.data?.items || [];
  console.log("Tokens found:", items.length);
  const targets = ["0x699727f9e01a822efdcf7333073f0461e5914b4e", "0x61886e7d61f4086ada1829880af440aa0de3fc96"];
  const matches = items.filter(i => targets.includes(i.contract_address.toLowerCase()));
  console.log("Matches:", matches.map(m => m.contract_name));
}).catch(console.error);
