import { useState, useCallback, useEffect } from 'react';

export interface SignerStatus {
    signer_uuid: string;
    public_key: string;
    status: 'pending_approval' | 'approved' | 'revoked' | 'none';
    approval_url?: string;
    fid?: number;
}

export function useNeynarSigner() {
    const [signerStatus, setSignerStatus] = useState<SignerStatus>({
        signer_uuid: '',
        public_key: '',
        status: 'none'
    });
    const [isLoading, setIsLoading] = useState(false);

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('neynar_signer');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSignerStatus(prev => ({ ...prev, ...parsed }));
                if (parsed.signer_uuid) {
                    checkStatus(parsed.signer_uuid);
                }
            } catch (e) {
                console.error("Failed to parse stored signer", e);
            }
        }
    }, []);

    const createSigner = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/signer', { method: 'POST' });
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            const newStatus: SignerStatus = {
                signer_uuid: data.signer_uuid,
                public_key: data.public_key,
                status: 'pending_approval',
                approval_url: data.approval_url
            };

            setSignerStatus(newStatus);
            localStorage.setItem('neynar_signer', JSON.stringify(newStatus));
            return newStatus;
        } catch (e) {
            console.error("Error creating signer:", e);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const checkStatus = useCallback(async (signerUuid: string) => {
        try {
            const res = await fetch(`/api/signer?signer_uuid=${signerUuid}`);
            const data = await res.json();

            if (data.status === 'approved') {
                setSignerStatus(prev => {
                    const updated = { ...prev, status: 'approved' as const, fid: data.fid };
                    localStorage.setItem('neynar_signer', JSON.stringify(updated));
                    return updated;
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error("Error checking signer status:", e);
            return false;
        }
    }, []);

    return {
        signerStatus,
        createSigner,
        checkStatus,
        isLoading
    };
}
