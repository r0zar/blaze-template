import { subnet } from '../subnet';
import { NextResponse } from 'next/server';
import * as kvStore from '../kv';
import { randomUUID } from 'crypto';

// Generate a unique ID for this serverless instance
const serverId = randomUUID();
console.log(`Settle route initialized with serverId: ${serverId}`);

// Batch lock identifier - use the same ID as in subscribe route for coordination
const batchLockId = 'batch';

/**
 * POST handler for manually triggering the settlement of a batch
 * This is used by the "Settle batch" button in the UI
 */
export async function POST() {
    console.log(`Manual settlement requested on server ${serverId}`);

    try {
        // Check if a batch is already being processed
        if (await kvStore.isProcessingBatch()) {
            console.log(`Settlement rejected: a batch is already being processed`);
            return NextResponse.json({
                success: false,
                message: 'A batch is already being processed'
            }, { status: 409 });
        }

        // Try to acquire the batch processing lock
        if (!(await kvStore.acquireBatchLock(batchLockId, 30000))) {
            console.log(`Settlement rejected: could not acquire batch lock`);
            return NextResponse.json({
                success: false,
                message: 'Could not acquire lock for batch processing'
            }, { status: 423 });
        }

        console.log(`Server ${serverId} acquired batch lock for manual settlement`);

        try {
            // Set batch processing flag
            await kvStore.setIsProcessingBatch(true);

            const queue = subnet.mempool ? subnet.mempool.getQueue() : [];
            const batchSize = queue.length;

            if (batchSize === 0) {
                console.log(`Settlement rejected: no transactions in queue`);
                return NextResponse.json({
                    success: false,
                    message: 'No transactions in queue to settle'
                }, { status: 400 });
            }

            console.log(`Processing batch of ${batchSize} transactions`);
            const maxQueueLength = 20;

            // Mine a block with the transactions in the mempool
            await subnet.mineBlock(Math.min(batchSize, maxQueueLength));

            // Refresh balances to get updated on-chain state
            await subnet.refreshBalances();

            // Reset the batch timer after manual batch processing
            await kvStore.resetBatchTimer();
            console.log(`Batch timer reset after manual settlement`);

            return NextResponse.json({
                success: true,
                message: `Successfully settled a batch of ${batchSize} transactions`
            });
        } finally {
            // Reset processing flag and release lock regardless of outcome
            await kvStore.setIsProcessingBatch(false);
            await kvStore.releaseBatchLock(batchLockId);
            console.log(`Server ${serverId} released batch lock after manual settlement`);
        }
    } catch (error) {
        console.error(`Error settling batch on server ${serverId}:`, error);
        return NextResponse.json({
            success: false,
            message: `Error settling batch: ${error instanceof Error ? error.message : String(error)}`
        }, { status: 500 });
    }
} 