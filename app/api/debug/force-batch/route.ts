import { NextResponse } from 'next/server';
import { subnet } from '@/lib/subnet';
import * as kvStore from '@/lib/kv';
import { triggerPusherEvent, BLOCKCHAIN_CHANNEL, EVENTS } from '@/lib/pusher';
import { trimQueue, trimStatus, trimBalances } from '@/lib/utils';

// Set Dynamic to avoid ISR caching
export const dynamic = 'force-dynamic';

// Configure this route to run in Node.js environment instead of Edge
export const runtime = 'nodejs';

// Helper function to process a batch (copied from subscribe/route.ts)
async function processBatch() {
    try {
        // Get the current queue
        const queue = subnet.mempool ? await subnet.mempool.getQueue() : [];

        if (!queue.length) {
            // Notify empty queue state
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                status: trimStatus({
                    state: 'idle',
                    subnet: subnet.subnet,
                    txQueue: []
                }),
                time: new Date().toISOString(),
                message: 'No transactions to process',
                queue: []
            });

            return {
                success: false,
                message: 'No transactions in queue to process'
            };
        }

        // Check if already processing
        const isProcessing = await kvStore.isProcessingBatch();
        if (isProcessing) {
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                status: trimStatus({
                    state: 'processing',
                    subnet: subnet.subnet,
                    txQueue: queue
                }),
                time: new Date().toISOString(),
                message: 'Batch is already being processed',
                queue: trimQueue(queue)
            });

            return {
                success: false,
                message: 'Batch is already being processed'
            };
        }

        // Try to acquire the batch lock
        if (!(await kvStore.acquireBatchLock('batch', 60000))) {
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                status: trimStatus({
                    state: 'error',
                    subnet: subnet.subnet,
                    txQueue: queue
                }),
                time: new Date().toISOString(),
                message: 'Could not acquire batch lock',
                queue: trimQueue(queue)
            });

            return {
                success: false,
                message: 'Could not acquire batch lock, another process may be handling the batch'
            };
        }

        await kvStore.setIsProcessingBatch(true);
        console.log('Starting forced batch processing...');

        // Immediately notify of current queue state
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.TRANSACTION_ADDED, {
            queue: trimQueue(queue),
            message: 'Current queue state'
        });

        // Then notify processing start
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: trimStatus({
                state: 'processing',
                subnet: subnet.subnet,
                txQueue: queue
            }),
            time: new Date().toISOString(),
            message: 'Force Mining batch...',
            queue: trimQueue(queue)
        });

        // Process batch with all transactions in queue
        const batchSize = queue.length;
        console.log(`Mining block with ${batchSize} transactions...`);
        const result = await subnet.mineBlock(batchSize);
        console.log({ result });

        await kvStore.setLastBatchTime(Date.now());

        // Get updated state
        const newQueue = subnet.mempool ? await subnet.mempool.getQueue() : [];

        // Check if the result contains an error
        const isSuccess = result && !('error' in result && 'reason' in result);

        // First update the queue state
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.TRANSACTION_ADDED, {
            queue: trimQueue(newQueue),
            message: 'Queue updated after mining'
        });

        // Then send batch completion notification
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BATCH_PROCESSED, {
            batchSize,
            timestamp: Date.now(),
            success: isSuccess,
            result,
            text: isSuccess
                ? `${batchSize} transactions have been mined in a block and broadcast on-chain`
                : `Transaction batch failed: ${result?.error || 'Unknown error'}${result?.reason ? ` - ${result.reason}` : ''}`,
            queue: trimQueue(newQueue)
        });

        // Update balances
        // await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, balances);

        // Finally update status
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: trimStatus({
                state: isSuccess ? 'idle' : 'error',
                subnet: subnet.subnet,
                txQueue: newQueue
            }),
            time: new Date().toISOString(),
            message: isSuccess ? 'Batch processing complete' : `Batch processing failed: ${result?.error || 'Unknown error'}`,
            queue: trimQueue(newQueue),
            error: isSuccess ? undefined : (result?.error || 'Unknown error')
        });

        console.log(`Batch processing ${isSuccess ? 'successful' : 'failed'}: ${isSuccess ? result?.txid : result?.error}`);
        return {
            success: isSuccess,
            result,
            batchSize,
            message: isSuccess
                ? `Successfully processed batch of ${batchSize} transactions`
                : `Batch processing failed: ${result?.error || 'Unknown error'}`,
            queue: trimQueue(newQueue),
            status: trimStatus({
                state: isSuccess ? 'idle' : 'error',
                subnet: subnet.subnet,
                txQueue: newQueue
            })
        };
    } catch (error) {
        console.error('Error processing batch:', error);

        // Get current queue state for error reporting
        const currentQueue = subnet.mempool ? await subnet.mempool.getQueue() : [];

        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: trimStatus({
                state: 'error',
                subnet: subnet.subnet,
                txQueue: currentQueue
            }),
            time: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Failed to mine block',
            message: 'Error processing batch',
            queue: trimQueue(currentQueue)
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to mine block'
        };
    } finally {
        await kvStore.setIsProcessingBatch(false);
        await kvStore.releaseBatchLock('batch');
        console.log('Batch processing completed, released lock');
    }
}

export async function POST() {
    try {
        const result = await processBatch();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in force-batch endpoint:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 