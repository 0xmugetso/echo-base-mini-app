
"use client";

import { useEffect, useState, useMemo } from "react";
import { APP_NAME } from "~/lib/constants";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "~/hooks/useMiniApp";
import { type NeynarUser } from "~/hooks/useNeynarUser";
import { useBaseStats } from "~/hooks/useCoinBaseData";
import { EchoLogo } from "./Icons";
import { Tab } from "../App";

interface HeaderProps {
  neynarUser?: NeynarUser | null;
  tab: Tab;
  address?: string;
}

export function Header({ neynarUser, tab, address }: HeaderProps) {
  const { context, platform } = useMiniApp();
  const activeFid = context?.user?.fid || neynarUser?.fid;
  const { data: baseStats } = useBaseStats(address, activeFid);

  const [echoPoints, setEchoPoints] = useState(0);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!activeFid) {
        setEchoPoints(0);
        return;
      }
      try {
        const res = await fetch(`/api/echo/profile?fid=${activeFid}`);
        const data = await res.json();
        if (data && !data.error) {
          // Unified Formula: Grind Points + Onchain Score
          const grindPoints = Number(data.points) || 0;
          const onchainRep = Number(data.onchainScore) || 0;

          setEchoPoints(grindPoints + onchainRep);
        }
      } catch (e) {
        console.error("Points fetch failed", e);
      }
    };

    fetchPoints();
    
    // Listen for manual points-updated events to refresh immediately
    window.addEventListener("points-updated", fetchPoints);

    // Refresh every 60s to catch check-in updates
    const interval = setInterval(fetchPoints, 60000);
    return () => {
      window.removeEventListener("points-updated", fetchPoints);
      clearInterval(interval);
    };
  }, [activeFid, neynarUser?.score]);

  const totalDisplayScore = useMemo(() => {
    return Math.floor(echoPoints);
  }, [echoPoints]);

  const displayPfp = context?.user?.pfpUrl || neynarUser?.pfp_url;
  const displayName = context?.user?.displayName || neynarUser?.display_name || neynarUser?.username || APP_NAME;

  return (
    <div className="p-4 relative">
      <div className="window">
        <div className="window-header">
          <div className="flex items-center gap-2">
            <EchoLogo className="w-5 h-5 text-white" />
            <span>ECHO_OS_V1.0</span>
          </div>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-white"></div>
            <div className="w-3 h-3 bg-white"></div>
          </div>
        </div>
        <div className="window-content bg-black flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {displayPfp ? (
              <img src={displayPfp} alt="Profile" className="w-16 h-16 border-2 border-white grayscale contrast-125" />
            ) : (
              <div className="w-16 h-16 border-2 border-white bg-primary"></div>
            )}
            <div>
              <p className="text-white text-lg font-bold uppercase tracking-widest leading-none">
                {displayName.split('.')[0]}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-primary text-sm font-mono leading-none">FID: {activeFid || "N/A"}</span>
                <span className={`text-[8px] font-pixel px-1 py-0.5 border leading-none ${
                  platform === 'warpcast' 
                    ? 'border-[#9c4df4] bg-[#9c4df4]/10 text-[#9c4df4]' 
                    : platform === 'base-app'
                    ? 'border-[#0052ff] bg-[#0052ff]/10 text-[#0052ff]'
                    : 'border-gray-500 bg-gray-500/10 text-gray-400'
                }`}>
                  {platform.toUpperCase().replace('-', '_')}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right border-l-2 border-white pl-4">
            <p className="text-2xl text-primary font-bold leading-none">
              {totalDisplayScore.toLocaleString()}
            </p>
            <p className="text-xs text-white uppercase mt-1">ECHO POWER</p>
          </div>
        </div>
      </div>
    </div>
  );
}
