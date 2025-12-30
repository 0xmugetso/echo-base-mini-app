import { useState, useEffect } from 'react';

export function RetroTimer() {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            // Calculate next UTC Midnight
            const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
            const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

            const diff = tomorrowUTC.getTime() - nowUTC.getTime();

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
        <div className="flex items-center gap-1 font-mono text-sm text-gray-400 bg-gray-900/50 px-2 py-1 rounded border border-gray-800 w-full justify-center">
            <span className="text-[10px] uppercase opacity-70 mr-1">RESET:</span>
            <div className="flex font-bold text-white tracking-widest">
                {timeLeft.split('').map((char, i) => (
                    <span key={i} className={`${char === ':' ? 'animate-pulse text-gray-500' : ''}`}>
                        {char}
                    </span>
                ))}
            </div>
        </div>
    );
}
