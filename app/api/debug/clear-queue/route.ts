import { NextResponse } from 'next/server';
import { subnet } from '../../subnet';
import { triggerPusherEvent, BLOCKCHAIN_CHANNEL, EVENTS } from '../../pusher';
import { trimQueue, trimStatus } from '../../../lib/utils';

// Set Dynamic to avoid ISR caching
export const dynamic = 'force-dynamic';

// Configure this route to run in Node.js environment instead of Edge
export const runtime = 'nodejs';

export async function POST() {
    try {
        if (!subnet.mempool) {
            await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                status: trimStatus({
                    state: 'error',
                    subnet: subnet.subnet,
                    txQueue: []
                }),
                time: new Date().toISOString(),
                message: 'Mempool not initialized',
                queue: []
            });

            return NextResponse.json(
                { success: false, error: 'Mempool not initialized' },
                { status: 500 }
            );
        }

        // Get initial queue state for comparison
        const initialQueue = await subnet.mempool.getQueue();

        // Clear the queue
        await subnet.mempool.clearQueue();

        // Get the updated queue state
        const newQueue = await subnet.mempool.getQueue();

        // First update the queue state
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.TRANSACTION_ADDED, {
            queue: trimQueue(newQueue),
            message: `Cleared ${initialQueue.length} transactions from queue`
        });

        // Then update the status
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: trimStatus({
                state: 'idle',
                subnet: subnet.subnet,
                txQueue: newQueue
            }),
            time: new Date().toISOString(),
            message: 'Queue cleared successfully',
            queue: trimQueue(newQueue)
        });

        // Get current balances
        const balances = await subnet.getBalances();

        // Send balance update
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, balances);

        return NextResponse.json({
            success: true,
            message: `Cleared ${initialQueue.length} transactions from queue`,
            queue: trimQueue(newQueue),
            status: trimStatus({
                state: 'idle',
                subnet: subnet.subnet,
                txQueue: newQueue
            })
        });
    } catch (error) {
        console.error('Error clearing queue:', error);

        // Get current queue state for error reporting
        const currentQueue = subnet.mempool ? await subnet.mempool.getQueue() : [];

        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: trimStatus({
                state: 'error',
                subnet: subnet.subnet,
                txQueue: currentQueue
            }),
            time: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Error clearing queue',
            queue: trimQueue(currentQueue)
        });

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
} 