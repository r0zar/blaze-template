import { NextRequest, NextResponse } from 'next/server';
import { subnet } from '../subnet';
import * as kvStore from '../kv';

// Configure this route to use the Node.js runtime
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const userAddress = body?.user;
        const forceRefresh = body?.force === true;

        console.log(`Refresh request received for${userAddress ? ' user: ' + userAddress : ' all wallets'}${forceRefresh ? ' (FORCED)' : ''}`);

        // Force initialize subnet if needed
        if (!subnet.mempool) {
            console.log('Subnet mempool not found, initializing subnet...');
            const newSubnet = new (subnet.constructor as any)();
            Object.assign(subnet, newSubnet);
        }

        // Refresh all balances first
        console.log('Refreshing all balances...');
        await subnet.refreshBalances();

        // Get all balances after refresh
        const balances = await subnet.getBalances();
        console.log('Current balances:', Object.keys(balances));

        // If a user wallet address was provided, track it in KV
        if (userAddress) {
            // Get the current balance for this wallet if available
            const currentBalance = balances[userAddress] || 0;
            console.log(`Tracking wallet ${userAddress} with balance ${currentBalance}`);

            // Track this wallet in KV store
            await kvStore.trackConnectedWallet(userAddress, currentBalance);
        }

        // Get tracked wallets to include in the response
        const trackedWallets = await kvStore.getTrackedWallets();
        console.log('Tracked wallets:', trackedWallets);

        // Create a new combined list of addresses including default addresses
        const defaultAddresses = ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS', 'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ'];
        const allAddresses = new Set([...defaultAddresses, ...trackedWallets]);

        // Enhance balances with tracked wallets
        const enhancedBalances = { ...balances };
        for (const walletAddress of allAddresses) {
            if (!enhancedBalances[walletAddress]) {
                enhancedBalances[walletAddress] = 0;
            }
        }

        console.log('Enhanced balances:', Object.keys(enhancedBalances));

        return NextResponse.json({
            success: true,
            balances: enhancedBalances,
            queue: subnet.mempool ? subnet.mempool.getQueue() : []
        });
    } catch (error) {
        console.error('Refresh failed:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}