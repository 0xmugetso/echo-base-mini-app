import { createWalletClient, http, publicActions, parseEther, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import solc from 'solc';

dotenv.config({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const OWNER_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS as `0x${string}`;

if (!PRIVATE_KEY) {
    console.error("❌ PRIVATE_KEY missing in .env.local");
    process.exit(1);
}

function findImports(importPath: string) {
    if (importPath.startsWith('@openzeppelin/')) {
        const fullPath = path.resolve('node_modules', importPath);
        return { contents: fs.readFileSync(fullPath, 'utf8') };
    }
    return { error: 'File not found' };
}

async function compile() {
    console.log("🛠️ Compiling EchoHighlightNFT.sol...");
    const contractPath = path.resolve('contracts', 'EchoHighlightNFT.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'EchoHighlightNFT.sol': { content: source }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            },
            optimizer: { enabled: true, runs: 200 }
        }
    };

    const output = JSON.parse((solc as any).compile(JSON.stringify(input), { import: findImports }));

    if (output.errors) {
        output.errors.forEach((err: any) => console.error(err.formattedMessage));
        if (output.errors.some((err: any) => err.severity === 'error')) process.exit(1);
    }

    const contract = output.contracts['EchoHighlightNFT.sol']['EchoHighlightNFT'];
    return {
        abi: contract.abi,
        bytecode: `0x${contract.evm.bytecode.object}` as `0x${string}`
    };
}

async function main() {
    const { abi, bytecode } = await compile();

    const account = privateKeyToAccount(PRIVATE_KEY);

    // Multi-RPC fallback for reliability on Base
    const rpcs = [
        'https://base-mainnet.public.blastapi.io',
        'https://rpc.ankr.com/base',
        'https://base.llamarpc.com',
        'https://mainnet.base.org'
    ];

    let client: any;
    for (const rpc of rpcs) {
        try {
            console.log(`🌐 Testing RPC: ${rpc}`);
            const tempClient = createWalletClient({
                account,
                chain: base,
                transport: http(rpc)
            }).extend(publicActions);
            await tempClient.getChainId(); // Verify connection
            client = tempClient;
            console.log(`✅ RPC Connected: ${rpc}`);
            break;
        } catch (e) {
            console.warn(`⚠️ RPC Failed: ${rpc}`);
        }
    }

    if (!client) {
        console.error("❌ All RPCs failed. Please check your internet or .env.local!");
        process.exit(1);
    }

    const owner = OWNER_ADDRESS ? getAddress(OWNER_ADDRESS) : account.address;
    console.log(`🚀 Deploying EchoHighlightNFT from: ${account.address}`);
    console.log(`👤 Initial Owner: ${owner}`);

    // Use a more reliable RPC if needed, or stick to default with better error handling
    const hash = await (client as any).deployContract({
        abi,
        bytecode,
        args: [
            "Echo Cards", // Name
            "ECHO",       // Symbol
            "https://echo-base-mini-app.vercel.app/api/echo/nft/", // baseURI
            "https://echo-base-mini-app.vercel.app/api/echo/nft/contract" // contractURI
        ],
        chain: base,
        gas: 3_500_000n, // Slightly more room
    });

    console.log(`⏳ Deployment Transaction Sent: ${hash}`);
    const receipt = await client.waitForTransactionReceipt({ hash });

    if (receipt.status === 'reverted') {
        console.error("❌ Deployment REVERTED. Check gas or constructor args.");
        process.exit(1);
    }

    const contractAddress = receipt.contractAddress;
    console.log(`✅ Contract Deployed SUCCESSFULLY at: ${contractAddress}`);

    // Update contracts.ts
    const contractFile = path.join(process.cwd(), 'src/lib/contracts.ts');
    let content = fs.readFileSync(contractFile, 'utf8');
    content = content.replace(/export const AURA_CONTRACT_ADDRESS = .*;/g, `export const AURA_CONTRACT_ADDRESS = "${contractAddress}" as \`0x\${string}\`;`);
    fs.writeFileSync(contractFile, content);

    console.log(`📝 Updated src/lib/contracts.ts with new address.`);
}

main().catch(console.error);
