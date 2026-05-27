import { useState, useEffect, useRef } from 'react';

interface RetroTimerProps {
    targetDate?: string | Date;
    onExpire?: () => void;
}

export function RetroTimer({ targetDate, onExpire }: RetroTimerProps) {
    const [timeLeft, setTimeLeft] = useState('');
    const expiredRef = useRef(false);

    // Keep callback ref stable to avoid triggering useEffect re-runs
    const onExpireRef = useRef(onExpire);
    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        expiredRef.current = false; // Reset lock when target date changes

        const calculateTimeLeft = () => {
            const now = new Date();
            let targetTime: number;

            if (targetDate) {
                targetTime = new Date(targetDate).getTime();
            } else {
                // Default to next UTC Midnight
                const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
                const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
                targetTime = tomorrowUTC.getTime();
                now.setTime(nowUTC.getTime()); // Align 'now' with UTC for the diff calculation
            }

            const diff = targetTime - now.getTime();

            if (diff <= 0) {
                if (onExpireRef.current && !expiredRef.current) {
                    expiredRef.current = true;
                    onExpireRef.current();
                }
                return "00:00:00";
            }

            // Remove % 24 to display absolute hours correctly (e.g. 48h, 72h cooldowns)
            const hours = Math.floor(diff / (1000 * 60 * 60));
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
    }, [targetDate]);

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
