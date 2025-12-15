import React from 'react';
import { Skull } from './Skull';

interface RetroWindowProps {
    title: string;
    children: React.ReactNode;
    className?: string;
    onClose?: () => void;
    icon?: 'skull' | 'error' | 'info' | React.ReactNode;
}

export function RetroWindow({
    title,
    children,
    className = "",
    onClose,
    icon
}: RetroWindowProps) {
    return (
        <div className={`window ${className}`}>
            <div className="window-header">
                <div className="flex items-center gap-2">
                    {icon === 'skull' && <Skull className="w-4 h-4" />}
                    {icon === 'error' && <span>X</span>}
                    {typeof icon !== 'string' && icon}
                    <span>{title}</span>
                </div>
                <div className="flex gap-1">
                    {onClose ? (
                        <button
                            onClick={onClose}
                            className="w-5 h-5 flex items-center justify-center border border-white bg-primary hover:bg-white hover:text-black font-bold leading-none text-xs"
                        >
                            X
                        </button>
                    ) : (
                        <div className="w-5 h-5 flex items-center justify-center border border-white bg-primary font-bold leading-none text-xs opacity-50">
                            -
                        </div>
                    )}
                </div>
            </div>
            <div className="window-content">
                {children}
            </div>
        </div>
    );
}
