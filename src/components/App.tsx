"use client";

import { useState, useEffect } from "react";
import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { Footer } from "~/components/ui/Footer";
import { HomeTab, ActionsTab, TasksTab, WalletTab } from "~/components/ui/tabs";
import { USE_WALLET } from "~/lib/constants";
import { useNeynarUser } from "../hooks/useNeynarUser";

export enum Tab {
  Home = "home",
  Actions = "actions",
  Context = "context",
  Wallet = "wallet",
}

export interface AppProps {
  title?: string;
}

export default function App(
  { title }: AppProps = { title: "Neynar Starter Kit" }
) {
  const {
    isSDKLoaded,
    context,
    setInitialTab,
    setActiveTab,
    currentTab,
  } = useMiniApp();

  const { user: neynarUser } = useNeynarUser(context || undefined);

  useEffect(() => {
    if (isSDKLoaded) {
      setInitialTab(Tab.Home);
    }
  }, [isSDKLoaded, setInitialTab]);

  const handleTabChange = (tab: Tab) => {
    if (tab === currentTab) return;
    setActiveTab(tab);
  };

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f0f] text-white">
        <div className="text-center space-y-3">
          <div className="spinner h-10 w-10 mx-auto mb-2 border-white border-t-transparent"></div>
          <p className="tracking-[0.08em] text-sm uppercase">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-black text-white font-pixel selection:bg-primary selection:text-white"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0 flex items-center justify-center overflow-hidden">
        {/* Decorative background pattern could go here */}
      </div>

      <div className="relative z-10 pb-24 max-w-lg mx-auto min-h-screen flex flex-col">
        <Header
          neynarUser={neynarUser}
          tab={currentTab as Tab}
          address={(context?.user as any)?.custodyAddress || (context?.user as any)?.verifiedAddresses?.ethAddresses?.[0]}
        />

        <main className="flex-1 p-4">
          <div className={currentTab === Tab.Home ? "block" : "hidden"}>
            <HomeTab neynarUser={neynarUser} context={context} />
          </div>
          <div className={currentTab === Tab.Actions ? "block" : "hidden"}>
            <ActionsTab />
          </div>
          <div className={currentTab === Tab.Context ? "block" : "hidden"}>
            <TasksTab />
          </div>
          <div className={currentTab === Tab.Wallet ? "block" : "hidden"}>
            <WalletTab />
          </div>
        </main>
      </div>

      <Footer currentTab={currentTab as Tab} onTabChange={(tab) => setActiveTab(tab)} />
    </div>
  );
}
