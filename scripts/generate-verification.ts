import fs from 'fs';
import path from 'path';
import solc from 'solc';

// Store all discovered sources here
const collectedSources: Record<string, { content: string }> = {};

function findImports(importPath: string) {
    let content = '';
    // Handle OpenZeppelin imports
    if (importPath.startsWith('@openzeppelin/')) {
        const fullPath = path.resolve('node_modules', importPath);
        if (fs.existsSync(fullPath)) {
            content = fs.readFileSync(fullPath, 'utf8');
            // Add to our collection
            collectedSources[importPath] = { content };
            return { contents: content };
        }
    }
    // Handle relative imports if any (unlikely for this simple contract but good practice)
    else if (importPath.startsWith('.')) {
        // This is tricky without knowing the referrer, but solc usually resolves relative before asking?
        // Actually, solc usually resolves path. Here we assume we only catch the top level ones or assume context.
        // For now, let's assume imports are absolute-ish (@openzeppelin) or local.
        // If a relative import happens inside an OZ file, solc might pass the resolved path or raw.
        // In standard-json via solc-js, usually we need to handle this carefully.
        // But let's see what happens.
    }

    return { error: 'File not found' };
}

async function generate() {
    console.log("🔍 Scanning for dependencies...");
    const contractPath = path.resolve('contracts', 'EchoHighlightNFT.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    // Add main contract
    collectedSources['EchoHighlightNFT.sol'] = { content: source };

    // Initial input to trigger the compiler's discovery
    const input = {
        language: 'Solidity',
        sources: {
            'EchoHighlightNFT.sol': { content: source }
        },
        settings: {
            outputSelection: {
                '*': { '*': ['*'] }
            },
            optimizer: { enabled: true, runs: 200 }
        }
    };

    // Run compiler just to trigger the imports callback
    const output = JSON.parse((solc as any).compile(JSON.stringify(input), { import: findImports }));

    if (output.errors) {
        // Filter out errors that might stop us (though warnings are fine)
        const fatal = output.errors.filter((e: any) => e.severity === 'error');
        if (fatal.length > 0) {
            console.error("❌ Compilation errors:", fatal);
            // We might still have collected sources? No, if it failed early.
            // But usually missing imports cause errors. Using the callback prevents missing import errors.
        }
    }

    // Now construct the final JSON for Basescan
    const verificationInput = {
        language: "Solidity",
        sources: collectedSources,
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            outputSelection: {
                "*": {
                    "*": [
                        "abi",
                        "evm.bytecode",
                        "evm.deployedBytecode",
                        "evm.methodIdentifiers",
                        "metadata"
                    ]
                }
            }
        }
    };

    const outFile = path.resolve('verification-input.json');
    fs.writeFileSync(outFile, JSON.stringify(verificationInput, null, 2));
    console.log(`✅ Generated ${outFile}`);
    console.log(`📋 Contains ${Object.keys(collectedSources).length} files.`);
}

generate();
