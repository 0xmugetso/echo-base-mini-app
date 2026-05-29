import { useEffect, useState } from "react";

export interface NeynarUser {
  fid: number;
  username: string;
  pfp_url: string;
  display_name?: string;
  profile?: {
    bio: {
      text: string;
    };
  };
  score: number;
  follower_count: number;
  following_count: number;
  verified_addresses?: {
    eth_addresses: string[];
    sol_addresses: string[];
    primary: {
      eth_address: string;
      sol_address: string;
    };
  };
}

export function useNeynarUser(context?: { user?: { fid?: number } }, connectedAddress?: string) {
  const [user, setUser] = useState<NeynarUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fid = context?.user?.fid;
    const address = connectedAddress;

    if (!fid && !address) {
      setUser(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const query = fid ? `fids=${fid}` : `address=${address}`;

    fetch(`/api/users?${query}`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (data.users?.[0]) {
          setUser(data.users[0]);
        } else {
          setUser(null);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [context?.user?.fid, connectedAddress]);

  return { user, loading, error };
} 