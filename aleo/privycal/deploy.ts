import { Account, AleoNetworkClient, ProgramManager, AleoKeyProvider } from '@provablehq/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

async function deployProgram() {
    try {
        console.log('🚀 Starting Aleo Program Deployment...\n');

        // 1. Load the compiled Aleo program
        const programPath = join(__dirname, 'build/main.aleo');
        const program = readFileSync(programPath, 'utf-8');
        console.log('✅ Loaded program from:', programPath);
        console.log(`   Program size: ${(program.length / 1024).toFixed(2)} KB\n`);

        // 2. Create account from private key
        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) {
            throw new Error('PRIVATE_KEY not found in .env file');
        }
        const account = new Account({ privateKey });
        console.log('✅ Account loaded');
        console.log(`   Address: ${account.address()}\n`);

        // 3. Create key provider for proving/verifying keys
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        console.log('✅ Key provider initialized\n');

        // 4. Create network client with v2 API
        const endpoint = process.env.ENDPOINT || 'https://api.explorer.provable.com/v2';
        const networkClient = new AleoNetworkClient(endpoint);
        console.log('✅ Network client connected');
        console.log(`   Endpoint: ${endpoint} (v2 API)\n`);

        // 5. Initialize program manager
        const programManager = new ProgramManager(endpoint, keyProvider, undefined);
        programManager.setAccount(account);
        console.log('✅ Program manager initialized\n');

        // 6. Build deployment transaction
        const priorityFee = parseFloat(process.env.PRIORITY_FEE || '0');
        console.log('📦 Building deployment transaction...');
        console.log(`   Priority fee: ${priorityFee} microcredits\n`);

        const tx = await programManager.buildDeploymentTransaction(
            program,
            priorityFee,
            false // Use public fee (not private record)
        );
        console.log('✅ Deployment transaction built\n');

        // 7. Submit transaction to network
        console.log('📡 Submitting transaction to Aleo Testnet...');
        const txId = await programManager.networkClient.submitTransaction(tx);
        console.log('✅ Transaction submitted!');
        console.log(`   Transaction ID: ${txId}\n`);

        // 9. Wait for confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes (5 second intervals)

        while (!confirmed && attempts < maxAttempts) {
            try {
                const transaction = await programManager.networkClient.getTransaction(txId);
                if (transaction) {
                    console.log('✅ Transaction confirmed!\n');
                    console.log('📋 Transaction Details:');
                    console.log(JSON.stringify(transaction, null, 2));
                    confirmed = true;
                }
            } catch (error) {
                // Transaction not yet confirmed
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 5000));
                process.stdout.write('.');
            }
        }

        if (!confirmed) {
            console.log('\n⚠️  Transaction not confirmed within timeout period');
            console.log('   Check status manually at:');
            console.log(`   https://explorer.provable.com/transaction/${txId}\n`);
        }

        // 10. Verify program deployment
        console.log('🔍 Verifying program deployment...');
        const programId = 'privycal.aleo';
        try {
            const deployedProgram = await programManager.networkClient.getProgram(programId);
            console.log('✅ Program successfully deployed!\n');
            console.log('🎉 Deployment Complete!');
            console.log(`   Program ID: ${programId}`);
            console.log(`   Explorer: https://explorer.provable.com/program/${programId}`);
            console.log(`   Transaction: https://explorer.provable.com/transaction/${txId}\n`);
        } catch (error) {
            console.log('⚠️  Program not yet visible on network');
            console.log('   This may take a few minutes. Check the explorer:\n');
            console.log(`   https://explorer.provable.com/program/${programId}\n`);
        }

    } catch (error) {
        console.error('❌ Deployment failed:', error);
        if (error instanceof Error) {
            console.error('   Error message:', error.message);
            console.error('   Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run deployment
deployProgram();
