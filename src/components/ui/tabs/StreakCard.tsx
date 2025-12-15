import { useEffect, useState } from "react";
import { RetroWindow } from "../RetroWindow";

export const StreakCard = ({ streak }: { streak: number }) => {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        // Countdown Timer to midnight UTC
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setUTCHours(24, 0, 0, 0);
            const diff = tomorrow.getTime() - now.getTime();

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    // Visual Boost Level based on streak
    const boostLevel = Math.min(Math.floor(streak / 7) + 1, 5); // Level up every 7 days, max 5
    const progress = ((streak % 7) / 7) * 100;

    return (
        <div className="relative border-2 border-primary bg-black/80 p-4 mb-6 shadow-[4px_4px_0px_theme('colors.primary')]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">CURRENT_STREAK</p>
                    <p className="text-4xl font-pixel text-white leading-none">{streak} <span className="text-sm">DAYS</span></p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">NEXT_CYCLE</p>
                    <p className="text-xl font-mono text-primary animate-pulse">{timeLeft}</p>
                </div>
            </div>

            {/* Retro Progress Bar */}
            <div className="relative h-6 border-2 border-white bg-gray-900 mb-2">
                <div
                    className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                >
                    {/* Stripe Pattern */}
                    <div className="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzj//v37zwjjgzj/d+/gwAMA5QkMyE0iU3gAAAAASUVORK5CYII=')] opacity-30" />
                </div>
                {/* Markers */}
                <div className="absolute top-0 bottom-0 left-1/4 w-[1px] bg-white/20" />
                <div className="absolute top-0 bottom-0 left-2/4 w-[1px] bg-white/20" />
                <div className="absolute top-0 bottom-0 left-3/4 w-[1px] bg-white/20" />
            </div>

            <div className="flex justify-between items-center text-[10px] uppercase font-mono">
                <span className="text-yellow-400">BOOST_LEVEL_{boostLevel}</span>
                <span className="text-gray-400">TARGET: {Math.ceil((streak + 1) / 7) * 7} DAYS</span>
            </div>
        </div>
    );
};
