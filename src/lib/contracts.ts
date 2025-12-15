
// Replace this with your own wallet address!
export const AURA_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`) || "0x438da727a6C359d46E4922e38E901f2916A49a1f";

export const AURA_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
] as const;
