import { NextRequest, NextResponse } from 'next/server';
import { subnet, setSubnetSigner } from '@/lib/subnet';
import * as kvStore from '@/lib/kv';
import { triggerPusherEvent } from '@/lib/pusher';
import { BLOCKCHAIN_CHANNEL, EVENTS } from '@/lib/constants';
// Configure this route to use the Node.js runtime
export const runtime = 'nodejs';

// Define transaction interface to match subnet types
interface Transaction {
    // Add minimal properties needed for the API
    txid?: string;
    nonce?: number;
    [key: string]: any; // Allow for additional properties
}

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
            console.log('Subnet initialized successfully:', !!subnet.mempool);
        }

        // If a user wallet address was provided, set it as the subnet signer
        if (userAddress) {
            console.log(`Setting subnet signer to ${userAddress}`);
            setSubnetSigner(userAddress);
        }

        // Refresh all balances first
        console.log('Refreshing all balances...');
        try {
            await subnet.refreshBalances();
        } catch (error) {
            console.error('Error refreshing balances:', error);
            // Continue execution to return what data we have
        }

        // Get all balances after refresh
        let balances: Record<string, number>;
        try {
            balances = await subnet.getBalances();
            console.log('Current balances:', Object.keys(balances));
        } catch (error) {
            console.error('Error getting balances:', error);
            // Provide fallback balances
            balances = {};
        }

        // If a user wallet address was provided, track it in KV
        if (userAddress) {
            // Get the current balance for this wallet if available
            const currentBalance = balances[userAddress] || 0;
            console.log(`Tracking wallet ${userAddress} with balance ${currentBalance}`);

            // Track this wallet in KV store
            try {
                await kvStore.trackConnectedWallet(userAddress, currentBalance);
            } catch (error) {
                console.error('Error tracking wallet:', error);
                // Continue execution
            }
        }

        // Get tracked wallets to include in the response
        let trackedWallets: string[] = [];
        try {
            trackedWallets = await kvStore.getTrackedWallets();
            console.log('Tracked wallets:', trackedWallets);
        } catch (error) {
            console.error('Error getting tracked wallets:', error);
            // Continue execution
        }

        // Create a new combined list of addresses including default addresses
        const defaultAddresses = ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS', 'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ'];
        const allAddresses = new Set([...defaultAddresses, ...trackedWallets]);

        // Fetch balances for each address specifically
        const enhancedBalances = { ...balances };
        for (const walletAddress of allAddresses) {
            try {
                const addressBalance = await subnet.getBalance(walletAddress);
                enhancedBalances[walletAddress] = addressBalance || 0;
                console.log(`Fetched balance for ${walletAddress}: ${addressBalance}`);
            } catch (error) {
                console.warn(`Failed to fetch balance for ${walletAddress}, setting to 0`);
                enhancedBalances[walletAddress] = 0;
            }
        }

        console.log('Enhanced balances:', Object.keys(enhancedBalances).map(addr => `${addr}: ${enhancedBalances[addr]}`));
        console.log('Current subnet signer:', subnet.signer || 'Not set');

        // Update state via Pusher
        let queue: Transaction[] = [];
        try {
            queue = subnet.mempool ? subnet.mempool.getQueue() : [];
        } catch (error) {
            console.error('Error getting queue:', error);
            // Use empty queue as fallback
        }

        const status = {
            subnet: subnet.subnet,
            txQueue: queue,
            lastProcessedBlock: subnet.lastProcessedBlock || 0
        };

        // Send push updates to all clients
        // We'll wrap these in try/catch so one failure doesn't prevent others from working
        try {
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, enhancedBalances);
            console.log('Sent balance updates via Pusher');
        } catch (error) {
            console.error('Failed to send balance updates via Pusher:', error);
        }

        try {
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.TRANSACTION_ADDED, { queue });
            console.log('Sent transaction updates via Pusher');
        } catch (error) {
            console.error('Failed to send transaction updates via Pusher:', error);
        }

        try {
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                status,
                queue,
                balances: enhancedBalances,
                time: new Date().toISOString(),
            });
            console.log('Sent status update via Pusher');
        } catch (error) {
            console.error('Failed to send status update via Pusher:', error);
        }

        return NextResponse.json({
            success: true,
            balances: enhancedBalances,
            queue: queue,
            signer: subnet.signer
        });
    } catch (error) {
        console.error('Refresh failed:', error);

        // Send a minimal response even in case of error
        // so the UI doesn't hang
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            balances: {},
            queue: [] as Transaction[]
        });
    }
}