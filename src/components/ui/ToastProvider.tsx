"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'SUCCESS' | 'ERROR' | 'INFO' | 'PROCESS';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toast = useCallback((message: string, type: ToastType = 'INFO') => {
        const id = Math.random().toString(36).substr(2, 9);

        setToasts(prev => {
            // Remove older PROCESS toasts to prevent stacking "status updates"
            const filtered = prev.filter(t => t.type !== 'PROCESS' || type !== 'PROCESS');
            // Limit stack size
            const cut = filtered.slice(-2);
            return [...cut, { id, message, type }];
        });

        // Auto-dismiss everything eventually, even PROCESS (safety valve)
        const duration = type === 'PROCESS' ? 8000 : 4000;
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-[80vw]">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`
              px-4 py-3 border-2 bg-black text-white font-pixel text-xs shadow-[4px_4px_0_0_rgba(255,255,255,0.2)]
              animate-in slide-in-from-right-full fade-in duration-300
              ${t.type === 'SUCCESS' ? 'border-primary' : t.type === 'ERROR' ? 'border-red-500' : 'border-white'}
              flex items-center gap-3 relative overflow-hidden pointer-events-auto
            `}
                    >
                        {/* Scanline Animation */}
                        <div className="absolute inset-0 bg-white/5 pointer-events-none animate-pulse" />

                        <div className={`w-2 h-2 rounded-full ${t.type === 'SUCCESS' ? 'bg-primary' : t.type === 'ERROR' ? 'bg-red-500' : 'bg-white'} ${t.type === 'PROCESS' ? 'animate-pulse' : ''}`} />

                        <span className="uppercase tracking-tight leading-none">{t.message}</span>

                        {/* Close Cross */}
                        <button
                            onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                            className="ml-2 text-gray-500 hover:text-white"
                        >
                            [X]
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
