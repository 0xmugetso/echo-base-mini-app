import React from "react";
import { Tab } from "../App";
import { PixelHome, PixelBulb, PixelBadge, PixelWallet } from "./Icons";

interface FooterProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Footer({ currentTab, onTabChange }: FooterProps) {
  const isActive = (tab: Tab) => currentTab === tab;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#C0C0C0] border-t-2 border-white p-1 flex justify-between z-50">
      <button
        onClick={() => onTabChange(Tab.Home)}
        className={`flex-1 flex flex-col items-center justify-center p-2 border-2 ${isActive(Tab.Home)
            ? "border-black bg-white shadow-inner"
            : "border-white bg-[#C0C0C0] shadow-[2px_2px_0_0_#000000]"
          }`}
      >
        <PixelHome className={`w-6 h-6 ${isActive(Tab.Home) ? "text-primary" : "text-black"}`} />
      </button>

      <button
        onClick={() => onTabChange(Tab.Actions)}
        className={`flex-1 flex flex-col items-center justify-center p-2 border-2 ${isActive(Tab.Actions)
            ? "border-black bg-white shadow-inner"
            : "border-white bg-[#C0C0C0] shadow-[2px_2px_0_0_#000000]"
          }`}
      >
        <PixelBulb className={`w-6 h-6 ${isActive(Tab.Actions) ? "text-primary" : "text-black"}`} />
      </button>

      <button
        onClick={() => onTabChange(Tab.Context)}
        className={`flex-1 flex flex-col items-center justify-center p-2 border-2 ${isActive(Tab.Context)
            ? "border-black bg-white shadow-inner"
            : "border-white bg-[#C0C0C0] shadow-[2px_2px_0_0_#000000]"
          }`}
      >
        <PixelBadge className={`w-6 h-6 ${isActive(Tab.Context) ? "text-primary" : "text-black"}`} />
      </button>

      <button
        onClick={() => onTabChange(Tab.Wallet)}
        className={`flex-1 flex flex-col items-center justify-center p-2 border-2 ${isActive(Tab.Wallet)
            ? "border-black bg-white shadow-inner"
            : "border-white bg-[#C0C0C0] shadow-[2px_2px_0_0_#000000]"
          }`}
      >
        <PixelWallet className={`w-6 h-6 ${isActive(Tab.Wallet) ? "text-primary" : "text-black"}`} />
      </button>
    </div>
  );
}
