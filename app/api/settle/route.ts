import { NextResponse } from 'next/server';
import { subnet } from '../subnet';

export async function POST() {
    // should safely handle errors
    try {
        // Get queue length before mining
        const queue = subnet.mempool ? subnet.mempool.getQueue() : [];
        const batchSize = queue.length;

        // Refresh balances to get updated on-chain state
        await subnet.refreshBalances();

        if (batchSize > 0) {
            // Force mine a block with the current mempool transactions
            const result = await subnet.mineBlock();

            return NextResponse.json({
                success: true,
                message: 'Block mined successfully',
                batchSize,
                balances: await subnet.getBalances(), // Include updated balances in response
                timestamp: Date.now(),
                ...result
            });
        } else {
            console.log('No transactions to mine');
            return NextResponse.json({
                success: true,
                message: 'No transactions to mine',
                batchSize,
                balances: await subnet.getBalances(),
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error('Error mining block:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to mine block'
        }, {
            status: 500
        });
    }
} 