import { NextResponse } from 'next/server';
import * as kvStore from '@/lib/kv';

/**
 * POST handler for tracking wallet connections
 * Called when a wallet connects to the application
 */
export async function POST(request: Request) {
    try {
        const { address, action = 'connect', balance = 0 } = await request.json();

        if (!address) {
            return NextResponse.json({
                success: false,
                message: 'Missing wallet address'
            }, { status: 400 });
        }

        if (action === 'connect' || action === 'update') {
            // Track this wallet in the KV store
            await kvStore.trackConnectedWallet(address, balance);

            return NextResponse.json({
                success: true,
                message: `Wallet ${address} tracked successfully`
            });
        } else if (action === 'disconnect') {
            // We don't actually remove the wallet from tracking on disconnect
            // Just update its last seen timestamp
            await kvStore.updateWalletLastSeen(address);

            return NextResponse.json({
                success: true,
                message: `Wallet ${address} updated as disconnected`
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Invalid action'
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error tracking wallet:', error);
        return NextResponse.json({
            success: false,
            message: `Error tracking wallet: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
}

/**
 * GET handler for retrieving tracked wallets
 */
export async function GET() {
    try {
        // Get all tracked wallets
        const wallets = await kvStore.getTrackedWallets();

        // Also clean up any inactive wallets (not seen in 24 hours)
        // This is done asynchronously and doesn't affect the response
        kvStore.cleanupInactiveWallets().catch(console.error);

        return NextResponse.json({
            success: true,
            wallets,
            count: wallets.length,
        });
    } catch (error) {
        console.error('Error getting tracked wallets:', error);
        return NextResponse.json({
            success: false,
            message: `Error getting tracked wallets: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 