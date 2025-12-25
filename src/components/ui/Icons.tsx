import React from 'react';

export const EchoLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
    <img src="/assets/echo-logo.PNG" alt="Echo Logo" className={className} />
);

export const PixelHome = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2H14V4H10V2ZM6 4H10V6H6V4ZM4 6H6V8H4V6ZM2 8H4V20H22V8H24V22H2V8ZM14 2H18V4H14V2ZM18 4H22V6H18V4ZM10 12H14V18H10V12Z" />
    </svg>
);

export const PixelBulb = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2H14V4H10V2ZM6 4H10V6H6V4ZM14 4H18V6H14V4ZM4 6H6V14H4V6ZM18 6H20V14H18V6ZM6 14H8V16H6V14ZM16 14H18V16H16V14ZM8 16H16V20H8V16ZM10 20H14V22H10V20Z" />
    </svg>
);

export const PixelBadge = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M8 2H16V4H8V2ZM4 4H8V6H4V4ZM16 4H20V6H16V4ZM2 6H4V14H2V6ZM20 6H22V14H20V6ZM4 14H6V16H4V14ZM18 14H20V16H18V14ZM6 16H8V18H6V16ZM16 16H18V18H16V16ZM8 18H16V20H8V18ZM10 10H14V12H10V10Z" />
    </svg>
);

export const PixelWallet = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4H20V6H4V4ZM2 6H4V18H2V6ZM20 6H22V18H20V6ZM4 18H20V20H4V18ZM14 10H18V14H14V10ZM16 11H17V13H16V11Z" />
    </svg>
);
