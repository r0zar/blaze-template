import { NextResponse } from 'next/server';
import { subnet } from '../../../lib/subnet';

/**
 * Status API endpoint
 * Returns the current state of the blockchain, including:
 * - Current status
 * - Transaction queue
 * - Balances
 */
export async function GET() {
    try {
        console.log('Status API called');

        // Get current subnet status
        const status = subnet.getStatus();
        console.log('Current subnet status:', status);

        // Get transaction queue
        const queue = subnet.mempool ? subnet.mempool.getQueue() : [];
        console.log('Current queue length:', queue.length);

        // Get current balances
        const balances = await subnet.getBalances();
        console.log('Retrieved balances for', Object.keys(balances).length, 'addresses');

        return NextResponse.json({
            status,
            queue,
            balances,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error in status API:', error);

        // Try to get partial data if possible
        const errorResponse: any = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        };

        try {
            errorResponse.status = subnet.getStatus();
        } catch (e) {
            console.error('Failed to get status:', e);
            errorResponse.status = null;
        }

        try {
            errorResponse.queue = subnet.mempool ? subnet.mempool.getQueue() : [];
        } catch (e) {
            console.error('Failed to get queue:', e);
            errorResponse.queue = [];
        }

        try {
            errorResponse.balances = await subnet.getBalances();
        } catch (e) {
            console.error('Failed to get balances:', e);
            errorResponse.balances = {};
        }

        return NextResponse.json(errorResponse, { status: 500 });
    }
} 