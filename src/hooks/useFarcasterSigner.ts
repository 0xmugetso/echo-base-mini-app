import { useState, useEffect, useCallback } from 'react';
import { NobleEd25519Signer } from '@farcaster/core';
import { bytesToHex, hexToBytes } from 'viem';
import { useToast } from '../components/ui/ToastProvider';
import * as ed from '@noble/ed25519';

const LOCAL_STORAGE_KEY_PRIVATE_KEY = 'echo_farcaster_private_key';
const LOCAL_STORAGE_KEY_PUBLIC_KEY = 'echo_farcaster_public_key';
const LOCAL_STORAGE_KEY_SIGNER_UUID = 'echo_farcaster_signer_uuid';
const LOCAL_STORAGE_KEY_FID = 'echo_farcaster_fid';

export interface SignerStatus {
    status: 'idle' | 'generated' | 'pending_approval' | 'approved';
    token?: string;
    approval_url?: string;
    items?: any;
    signer_uuid?: string;
    fid?: number;
}

export function useFarcasterSigner() {
    const [signer, setSigner] = useState<NobleEd25519Signer | null>(null);
    const [signerStatus, setSignerStatus] = useState<SignerStatus>({ status: 'idle' });
    const { toast } = useToast();

    useEffect(() => {
        const loadSigner = async () => {
            const storedPrivateKey = localStorage.getItem(LOCAL_STORAGE_KEY_PRIVATE_KEY);
            let localSigner: NobleEd25519Signer;

            if (storedPrivateKey) {
                localSigner = new NobleEd25519Signer(hexToBytes(storedPrivateKey as `0x${string}`));
            } else {
                const privateKey = ed.utils.randomSecretKey();
                const privateKeyHex = bytesToHex(privateKey);
                localStorage.setItem(LOCAL_STORAGE_KEY_PRIVATE_KEY, privateKeyHex);
                localSigner = new NobleEd25519Signer(privateKey);
            }

            setSigner(localSigner);

            const storedToken = localStorage.getItem(LOCAL_STORAGE_KEY_SIGNER_UUID);
            const storedFid = localStorage.getItem(LOCAL_STORAGE_KEY_FID);

            if (storedToken) {
                if (storedFid) {
                    setSignerStatus({ status: 'approved', token: storedToken, fid: Number(storedFid), signer_uuid: storedToken });
                } else {
                    setSignerStatus({ status: 'pending_approval', token: storedToken, signer_uuid: storedToken });
                    checkStatus(storedToken);
                }
            } else {
                setSignerStatus({ status: 'generated' });
            }
        };
        loadSigner();
    }, []);

    const createSigner = useCallback(async () => {
        if (!signer) return;

        try {
            const pubKeyResult = await signer.getSignerKey();
            if (pubKeyResult.isErr()) throw new Error(pubKeyResult.error.message);
            const publicKey = pubKeyResult.value;
            const pubKeyHex = bytesToHex(publicKey);
            console.log("[Signer] Creating request for public key:", pubKeyHex);

            const res = await fetch('/api/warpcast/signer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicKey: pubKeyHex })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            localStorage.setItem(LOCAL_STORAGE_KEY_SIGNER_UUID, data.token);

            setSignerStatus({
                status: 'pending_approval',
                token: data.token,
                approval_url: data.deeplinkUrl,
                signer_uuid: data.token
            });

            return data;
        } catch (e: any) {
            console.error("[Signer] Create Error:", e);
            toast("Failed to creating signer: " + e.message, "ERROR");
        }
    }, [signer, toast]);

    const checkStatus = useCallback(async (token: string) => {
        try {
            const res = await fetch(`/api/warpcast/signer?token=${token}`);
            const data = await res.json();

            if (data.state === 'completed') {
                localStorage.setItem(LOCAL_STORAGE_KEY_FID, String(data.userFid));
                setSignerStatus({
                    status: 'approved',
                    token: data.token,
                    fid: data.userFid,
                    signer_uuid: data.token
                });
                return true;
            }
            return false;
        } catch (e) {
            console.error("[Signer] Check Status Error:", e);
            return false;
        }
    }, []);

    return {
        signer,
        signerStatus,
        createSigner,
        checkStatus
    };
}
