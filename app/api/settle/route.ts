import { NextResponse } from 'next/server';
import { subnet } from '../subnet';

export async function POST() {
    try {
        // Get queue length before settlement
        const batchSize = subnet.queue.length;

        // Force process the current batch
        await subnet.settleTransactions();

        return NextResponse.json({
            success: true,
            message: 'Batch settled successfully',
            batchSize,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error settling batch:', error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to settle batch'
        }, {
            status: 500
        });
    }
} 