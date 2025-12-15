import React from 'react';

export function Skull({ className = "w-32 h-32" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path fillRule="evenodd" clipRule="evenodd" d="M4 8V6H8V4H16V6H20V8H22V16H20V18H18V20H15V18H16V16H18V14H20V8H16V6H8V8H4V14H6V16H8V18H9V20H6V18H4V16H2V8H4ZM6 10V12H8V10H6ZM16 10V12H18V10H16ZM10 14H14V16H10V14Z" />
        </svg>
    );
}
