"use client";

import { RetroWindow } from "../RetroWindow";
import { RetroBanner } from "../RetroBanner";

const history = [
  { title: "TECH_SCI_QUIZ", level: "INTERMEDIATE", score: "82/100" },
  { title: "HISTORY_QUIZ", level: "ADVANCED", score: "68/100" },
  { title: "MOVIE_BUFF", level: "INTERMEDIATE", score: "90/100" },
  { title: "BUSINESS_101", level: "INTERMEDIATE", score: "77/100" },
];

export function ContextTab() {
  return (
    <div className="space-y-6 pb-20">
      <RetroBanner src="/assets/banner_eye.jpg" alt="History" />
      <RetroWindow title="HISTORY_LOG.TXT" icon="info">
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-white pb-3">
            <div className="w-10 h-10 border-2 border-white bg-primary" />
            <div>
              <p className="text-white text-sm font-bold uppercase tracking-wider">Henry James</p>
              <p className="text-xs text-primary font-mono">LEVEL: 06</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400 font-mono mb-2 px-2">
              <span>ACTIVITY</span>
              <span>ACTION</span>
            </div>
            {history.map((item) => (
              <div
                key={item.title}
                className="flex items-center justify-between border border-white p-2 hover:bg-white/10 transition-colors"
              >
                <div>
                  <p className="text-sm font-bold uppercase font-pixel tracking-wide">{item.title}</p>
                  <div className="flex gap-2 text-[10px] text-gray-300 font-mono">
                    <span>{item.level}</span>
                    <span>|</span>
                    <span className="text-primary">{item.score}</span>
                  </div>
                </div>
                <button className="px-2 py-1 border border-white text-[10px] font-bold uppercase hover:bg-white hover:text-black">
                  RETRY
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 pt-2 border-t-2 border-dashed border-white">
            <span className="text-xs font-mono blinking-cursor">END_OF_LOG_</span>
          </div>
        </div>
      </RetroWindow>
    </div>
  );
}
