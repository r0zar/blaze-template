import { NextRequest, NextResponse } from 'next/server';
import { subnet } from '../subnet';
import * as kvStore from '../kv';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const userAddress = body?.user;

        // Refresh balances
        await subnet.refreshBalances(userAddress);

        // If a user wallet address was provided, track it in KV
        if (userAddress) {
            // Get the current balance for this wallet if available
            const balances = await subnet.getBalances();
            const currentBalance = balances[userAddress] || 0;

            // Track this wallet in KV store
            await kvStore.trackConnectedWallet(userAddress, currentBalance);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Refresh failed:', error);
        return NextResponse.json({ success: false });
    }
}