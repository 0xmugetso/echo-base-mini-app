import { TxItem } from "~/@types/base";

const GOLDRUSH_API_KEY = process.env.GOLDRUSH_API_KEY || "cqt_rQwJpr4ywFxV8mCRj7qpXw9K9VdT";
const BASE_CHAIN = "base-mainnet";

export type Stats = {
    address: string;
    total_tx: number;
    total_volume_out_wei: bigint;
    total_volume_usd: number;
    total_fees_paid_wei: bigint;
    first_tx_date?: string | null; // Changed to string for serialization
    wallet_age_days?: number | null;
    biggest_single_tx: number;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTxBatch(address: string) {
    let allItems: TxItem[] = [];
    let nextUrl: string | null = `https://api.covalenthq.com/v1/${BASE_CHAIN}/address/${address}/transactions_v3/page/0/`;
    const formattedAddress = address.toLowerCase();

    console.log(`[CovalentLib] Starting fetch for ${formattedAddress}`);

    let pageCount = 0;
    const MAX_PAGES = 500; // Safety break

    while (nextUrl && pageCount < MAX_PAGES) {
        try {
            const res: any = await fetch(nextUrl, {
                headers: {
                    Authorization: `Bearer ${GOLDRUSH_API_KEY}`,
                },
            });

            if (!res.ok) {
                console.error(`[CovalentLib] Error fetching page ${pageCount}: ${res.status}`);
                break;
            }

            const json = await res.json();
            const items = (json.data?.items || []) as TxItem[];
            allItems = [...allItems, ...items];

            // Check for next page
            nextUrl = json.data?.links?.next || null;

            if (nextUrl) {
                await delay(150);
                pageCount++;
            }
        } catch (e) {
            console.error("[CovalentLib] Fetch error:", e);
            break;
        }
    }

    console.log(`[CovalentLib] Finished fetching. Total items: ${allItems.length}`);
    return allItems;
}

export async function getBaseNativeVolume(address: string): Promise<Stats> {
    const user = address.toLowerCase();
    const items = await fetchTxBatch(user);

    let totalVolumeWei = 0n;
    let totalVolumeUSD = 0;
    let totalFeesWei = 0n;
    let totalTx = 0;
    let firstTs = Number.MAX_SAFE_INTEGER;
    let biggestSingleTx = 0;

    // Verified Base Mainnet Addresses (Lowercased)
    const VERIFIED_TOKENS: Record<string, number> = {
        // USDC (Native)
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": 6,
        // USDbC (Bridged USDC)
        "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": 6,
        // USDT
        "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2": 6,
        // DAI
        "0x50c5725949a6f0c72e6c4a641f24049a917db0cb": 18,
    };

    for (const tx of items) {
        if (!tx.successful) continue;
        totalTx += 1;

        const ts = tx.block_signed_at ? Date.parse(tx.block_signed_at) : NaN;
        if (!Number.isNaN(ts) && ts < firstTs) {
            firstTs = ts;
        }

        const isOutgoing = tx.from_address.toLowerCase() === user;

        if (isOutgoing) {
            totalFeesWei += BigInt(tx.fees_paid || "0");
            totalVolumeWei += BigInt(tx.value || "0");
            totalVolumeUSD += tx.value_quote || 0;
        }

        let txValueUSD = tx.value_quote || 0;

        if (tx.log_events) {
            for (const event of tx.log_events) {
                if (event.decoded?.name === "Transfer") {
                    const sender = event.sender_address?.toLowerCase();
                    const decimals = VERIFIED_TOKENS[sender];

                    if (decimals !== undefined) {
                        const valueParam = event.decoded.params?.find((p) => p.name === "value");
                        const fromParam = event.decoded.params?.find((p) => p.name === "from");

                        if (valueParam && valueParam.value) {
                            const rawValue = Number(valueParam.value);
                            const normalizedValue = rawValue / 10 ** decimals;

                            if (normalizedValue > txValueUSD) {
                                txValueUSD = normalizedValue;
                            }

                            if (fromParam && fromParam.value.toLowerCase() === user) {
                                totalVolumeUSD += normalizedValue;
                            }
                        }
                    }
                }
            }
        }

        if (txValueUSD > biggestSingleTx) {
            biggestSingleTx = txValueUSD;
        }
    }

    const first_tx_date = firstTs === Number.MAX_SAFE_INTEGER ? null : new Date(firstTs).toISOString();
    const wallet_age_days = first_tx_date ? (Date.now() - firstTs) / (1000 * 60 * 60 * 24) : null;

    return {
        address: user,
        total_tx: totalTx,
        total_volume_out_wei: totalVolumeWei,
        total_volume_usd: totalVolumeUSD,
        total_fees_paid_wei: totalFeesWei,
        first_tx_date,
        wallet_age_days,
        biggest_single_tx: biggestSingleTx,
    };
}

export async function getFarcasterHoldings(address: string) {
    const TARGETS = {
        // NFTs
        "0x699727f9e01a822efdcf7333073f0461e5914b4e": "warplets",
        "0x61886e7d61f4086ada1829880af440aa0de3fc96": "pro_og",
        "0xcb28749c24af4797808364d71d71539bc01e76d4": "based_punk",
        "0x9fab8c51f911f0ba6dab64fd6e979bcf6424ce82": "bankr_club",
        // Tokens
        "0x1bc0c42215582d5a085795f4badbac3ff36d1bcb": "clanker",
        "0x50f88fe97f72cd3e75b9eb4f747f59bceba80d59": "jesse",
        "0x4ed4e862860bed51a9570b96d89af5e1b0efefed": "degen",
        "0x532f27101965dd16442e59d40670faf5ebb142e4": "brett",
        "0xac1bd2486aaf3b5c0fc3fd868558b082a531b2b4": "toshi",
    };

    const holdings = {
        warplets: false,
        pro_og: false,
        based_punk: false,
        bankr_club: false,
        clanker: false,
        jesse: false,
        degen: false,
        brett: false,
        toshi: false,
    };

    let wallet_value_usd = 0;

    try {
        const url = `https://api.covalenthq.com/v1/${BASE_CHAIN}/address/${address}/balances_v2/?nft=true`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${GOLDRUSH_API_KEY}` }
        });

        if (res.ok) {
            const json = await res.json();
            const items = json.data?.items || [];

            for (const item of items) {
                // Check if it's a Farcaster related asset
                const contract = item.contract_address?.toLowerCase();
                const key = TARGETS[contract as keyof typeof TARGETS];

                if (key) {
                    // Only sum value for specific Farcaster assets
                    wallet_value_usd += item.quote || 0;

                    // If it's a token/NFT with balance > 0
                    if (BigInt(item.balance || 0) > 0n) {
                        holdings[key as keyof typeof holdings] = true;
                    }
                }
            }
        }
    } catch (e) {
        console.error("[CovalentLib] Error fetching balances:", e);
    }

    console.log(`[CovalentLib] Wallet Value: ${wallet_value_usd}, Holdings found:`, holdings);
    return { wallet_value_usd, holdings };
}
