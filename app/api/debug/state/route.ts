import { NextResponse } from 'next/server';
import { subnet } from '../../subnet';
import * as kvStore from '../../kv';

// Set Dynamic to avoid ISR caching
export const dynamic = 'force-dynamic';

// Configure this route to run in Node.js environment instead of Edge
export const runtime = 'nodejs';

export async function POST() {
    try {
        // Get the current state of the subnet
        const queue = subnet.mempool ? await subnet.mempool.getQueue() : [];
        const balances = await subnet.getBalances();

        // Get KV store state
        const isProcessingBatch = await kvStore.isProcessingBatch();
        const lastBatchTime = await kvStore.getLastBatchTime();
        const nextBatchTime = await kvStore.getNextBatchTime();
        const trackedWallets = await kvStore.getTrackedWallets();

        // Check if there's an active batch lock
        const batchLockActive = await kvStore.acquireBatchLock('batch', 100);
        if (batchLockActive) {
            // If we were able to acquire the lock, release it immediately
            await kvStore.releaseBatchLock('batch');
        }

        return NextResponse.json({
            subnet: {
                signer: subnet.signer,
                queue: {
                    length: queue.length,
                    items: queue
                },
                balances
            },
            kvStore: {
                isProcessingBatch,
                lastBatchTime,
                nextBatchTime,
                trackedWallets,
                batchLockActive: !batchLockActive // If we could acquire it, it means it wasn't active
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting debug state:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 