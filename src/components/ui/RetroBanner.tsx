'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface RetroBannerProps {
    src: string;
    alt: string;
    className?: string;
    glitchOnHover?: boolean;
}

export function RetroBanner({ src, alt, className = "", glitchOnHover = true }: RetroBannerProps) {
    const [isGlitching, setIsGlitching] = useState(false);

    useEffect(() => {
        // Random glitch effect on mount
        const timeout = setTimeout(() => {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 200);
        }, Math.random() * 1000 + 500);
        return () => clearTimeout(timeout);
    }, []);

    const handleMouseEnter = () => {
        if (glitchOnHover) {
            setIsGlitching(true);
            setTimeout(() => setIsGlitching(false), 300);
        }
    };

    return (
        <div
            className={`relative w-full aspect-[3/1] overflow-hidden border-2 border-primary mb-4 select-none group ${className}`}
            onMouseEnter={handleMouseEnter}
        >
            <div className={`relative w-full h-full transition-all duration-100 ${isGlitching ? 'translate-x-[2px] opacity-80' : ''}`}>
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className={`object-cover object-center grayscale contrast-125 transition-all duration-300 ${isGlitching ? 'scale-105' : 'scale-100'}`}
                    style={{ imageRendering: 'pixelated' }}
                />
                {/* CRT Scanline Overlay specifically for the banner */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none" />
            </div>

            {/* Glitch Overlay */}
            {isGlitching && (
                <div className="absolute inset-0 bg-primary mix-blend-color-dodge opacity-30 z-20 pointer-events-none animate-pulse" />
            )}
        </div>
    );
}
