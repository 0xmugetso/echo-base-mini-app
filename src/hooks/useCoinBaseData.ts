import { useEffect, useMemo, useState } from "react";

type Stats = {
  address: string;
  total_tx: number;
  total_volume_out_wei: string; // Changed to string (from API)
  total_volume_usd: number;
  total_fees_paid_wei: string; // Changed to string (from API)
  first_tx_date?: string | null;
  wallet_age_days?: number | null;
  biggest_single_tx: number;
  farcaster?: {
    wallet_value_usd: number;
    holdings: {
      warplets: boolean;
      pro_og: boolean;
      based_punk: boolean;
      bankr_club: boolean;
      clanker: boolean;
      jesse: boolean;
      degen: boolean;
      brett: boolean;
      toshi: boolean;
    };
    best_cast?: {
      hash: string;
      text: string;
      likes: number;
      recasts: number;
      replies: number;
    } | null;
  };
};

// Helper to convert API string wei to BigInt if needed by UI helpers
// But UI seems to format numbers directly or formatted via helper. 
// We should check HomeTab usage. HomeTab uses `formatEth(baseStats?.total_fees_paid_wei || 0n)`
// So we might need to cast BigInt(string) at the hook level or UI level.
// Let's keep it as is, but parse it before returning or let UI handle string. 
// Actually, UI `formatEth` takes `bigint`. Let's cast it here for compatibility.
// Or better: keep internal state compatible with UI props.

type UIStats = Omit<Stats, 'total_volume_out_wei' | 'total_fees_paid_wei'> & {
  total_volume_out_wei: bigint;
  total_fees_paid_wei: bigint;
}

export function useBaseStats(address?: string, fid?: number) {
  const [data, setData] = useState<UIStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedAddress = useMemo(
    () => address?.trim().toLowerCase() || null,
    [address]
  );

  useEffect(() => {
    if (!normalizedAddress || normalizedAddress === "0x0000000000000000000000000000000000000000") {
      setData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const fidQuery = fid ? `&fid=${fid}` : '';
        const res = await fetch(`/api/stats?address=${normalizedAddress}${fidQuery}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch stats");
        }
        const json: Stats = await res.json();

        if (cancelled) return;

        // Transform strings back to BigInt for UI compatibility
        setData({
          ...json,
          total_volume_out_wei: BigInt(json.total_volume_out_wei || "0"),
          total_fees_paid_wei: BigInt(json.total_fees_paid_wei || "0"),
        });
      } catch (e: any) {
        if (cancelled) return;
        console.error(e);
        setError(e.message);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [normalizedAddress]);

  return { data, loading, error };
}
