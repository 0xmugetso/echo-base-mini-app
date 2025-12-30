import { useState, useEffect } from 'react';

export function RetroTimer() {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            // Set target to next midnight (00:00:00 of tomorrow)
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow.getTime() - now.getTime();

            if (diff <= 0) return "00:00:00";

            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };

        // Initial set
        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-2 bg-black border-2 border-gray-800 rounded-lg shadow-[inset_0_0_10px_rgba(0,0,0,1)] relative overflow-hidden group">
            {/* GLOW EFFECT BACKGROUND */}
            <div className="absolute inset-0 bg-red-900/10 animate-pulse pointer-events-none" />

            {/* LABEL */}
            <span className="text-[8px] font-mono text-gray-500 mb-1 tracking-widest uppercase z-10">Next Refresh</span>

            {/* DIGITAL CLOCK */}
            <div className="relative z-10 font-mono text-xl md:text-2xl font-bold tracking-widest text-red-500 flex items-center gap-1" style={{ textShadow: '0 0 5px rgba(239, 68, 68, 0.8), 0 0 10px rgba(239, 68, 68, 0.4)' }}>
                {timeLeft.split('').map((char, i) => (
                    <span key={i} className={`${char === ':' ? 'animate-pulse text-red-400' : 'bg-black/50 px-[1px] rounded'}`}>
                        {char}
                    </span>
                ))}
            </div>

            {/* VINTAGE SCANLINE */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
        </div>
    );
}
