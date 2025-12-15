
"use client";

import { useEffect, useState } from "react";
import { APP_NAME } from "~/lib/constants";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";
import { type NeynarUser } from "~/hooks/useNeynarUser";
import { EchoLogo } from "./Icons";
import { Tab } from "../App";

interface HeaderProps {
  neynarUser?: NeynarUser | null;
  tab: Tab;
}

export function Header({ neynarUser, tab }: HeaderProps) {
  const { context } = useMiniApp();


  const [echoPoints, setEchoPoints] = useState(0);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!context?.user?.fid) return;
      try {
        const res = await fetch(`/api/echo/profile?fid=${context.user.fid}`);
        const data = await res.json();
        if (data?.points !== undefined) {
          setEchoPoints(data.points);
        }
      } catch (e) {
        console.error("Failed to fetch points", e);
      }
    };

    fetchPoints();
    // Refresh interval every 10s to keep it somewhat live
    const interval = setInterval(fetchPoints, 10000);
    return () => clearInterval(interval);
  }, [context?.user?.fid, tab]);

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
            {context?.user.pfpUrl ? (
              <img src={context.user.pfpUrl} alt="Profile" className="w-16 h-16 border-2 border-white grayscale contrast-125" />
            ) : (
              <div className="w-16 h-16 border-2 border-white bg-primary"></div>
            )}
            <div>
              <p className="text-white text-lg font-bold uppercase tracking-widest leading-none">
                {context?.user?.displayName?.split('.')[0] || APP_NAME}
              </p>
              <p className="text-primary text-sm font-mono mt-1">FID: {context?.user.fid}</p>
            </div>
          </div>

          <div className="text-right border-l-2 border-white pl-4">
            <p className="text-2xl text-primary font-bold leading-none">{echoPoints}</p>
            <p className="text-xs text-white uppercase mt-1">ECHO PTS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
