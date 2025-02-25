import { subnet } from '../subnet';
import { randomUUID } from 'crypto';
import * as kvStore from '../kv';

// IMPORTANT: This implementation uses Vercel KV to synchronize batch timers across serverless functions
// Each instance will use the same timer value from the shared KV store

// Generate a unique server ID for this serverless instance
// This helps with distributed locking to prevent race conditions
const serverId = randomUUID();
console.log(`Subscribe route initialized with serverId: ${serverId}`);

// Initialize the KV store with default values if not set
kvStore.initializeKV().catch(console.error);

export async function GET(request: Request) {
    console.log('Subscribe route subnet instance:', subnet);

    // Keep track of whether the stream is closed
    let isStreamClosed = false;

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // Send initial headers to establish SSE connection
    const response = new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })

    // Function to send events - with safety check for closed streams
    const sendEvent = async (data: any) => {
        if (isStreamClosed) return;

        try {
            await writer.write(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
            )
        } catch (error) {
            console.error(`Error sending event for server ${serverId}:`, error);
            isStreamClosed = true;
        }
    }

    // Refresh balances initially to ensure we have the latest on-chain state
    try {
        await subnet.refreshBalances();
        console.log('Initial balance refresh completed');
    } catch (e) {
        console.error('Error during initial balance refresh:', e);
    }

    // Timer lock identifier - add server ID to make it unique
    const timerLockId = 'timer';

    // Batch lock identifier - global for all instances
    const batchLockId = 'batch';

    // Track if we have the timer lock
    let hasTimerLock = false;
    let timerInterval: NodeJS.Timeout | null = null;

    // Set up batch timer decrementer - only one instance will be able to acquire the lock and decrement
    // This ensures we don't have multiple instances all decrementing the timer
    async function setupBatchTimer() {
        console.log(`Setting up batch timer for server ${serverId}`);

        // Try to acquire the timer lock initially
        hasTimerLock = await kvStore.acquireBatchLock(timerLockId, 5000);

        if (hasTimerLock) {
            console.log(`Server ${serverId} acquired timer lock`);

            // We got the lock, so we're responsible for decrementing the timer
            timerInterval = setInterval(async () => {
                try {
                    // Double check if we still have the lock
                    if (!hasTimerLock) {
                        console.log(`Server ${serverId} lost timer lock, will try to reacquire`);

                        // Try to reacquire the lock
                        hasTimerLock = await kvStore.acquireBatchLock(timerLockId, 5000);

                        if (hasTimerLock) {
                            console.log(`Server ${serverId} reacquired timer lock`);
                        } else {
                            console.log(`Server ${serverId} failed to reacquire timer lock`);
                            return;
                        }
                    }

                    // Check current timer value before decrementing
                    const currentTimer = await kvStore.getNextBatchTime();

                    // Log the timer value we're working with
                    console.log(`Server ${serverId} checking timer: current value = ${currentTimer}`);

                    // Only decrement if positive
                    if (currentTimer > 0) {
                        // Decrement the timer and get the new value
                        const newTime = await kvStore.decrementBatchTime();
                        console.log(`Server ${serverId} decremented timer to ${newTime}`);

                        // If timer reached zero, initiate batch processing
                        if (newTime <= 0 && !(await kvStore.isProcessingBatch())) {
                            console.log(`Timer reached zero, server ${serverId} initiating batch processing`);
                            // Try to start batch processing
                            await checkAndProcessBatch();
                        }
                    }
                    // If timer is already at zero, process batch if not already processing
                    else if (currentTimer <= 0 && !(await kvStore.isProcessingBatch())) {
                        console.log(`Timer already at zero, server ${serverId} checking for batch processing`);
                        // Check and process batch (it will handle resetting the timer)
                        await checkAndProcessBatch();
                    }
                } catch (error) {
                    console.error(`Error in timer interval for server ${serverId}:`, error);

                    // If we encounter an error, assume we lost the lock and try to reacquire next time
                    hasTimerLock = false;
                }
            }, 1000);
        } else {
            console.log(`Server ${serverId} couldn't acquire timer lock initially, will poll for timer updates only`);

            // We don't have the lock, but we should still try to acquire it periodically
            // in case the server that has it goes down
            timerInterval = setInterval(async () => {
                if (!hasTimerLock) {
                    hasTimerLock = await kvStore.acquireBatchLock(timerLockId, 5000);
                    if (hasTimerLock) {
                        console.log(`Server ${serverId} acquired timer lock in retry interval`);
                    }
                }
            }, 3000); // Try every 3 seconds
        }
    }

    // Start the timer
    setupBatchTimer().catch(console.error);

    // Send events to client with timer updates
    const eventInterval = setInterval(async () => {
        if (isStreamClosed) {
            clearInterval(eventInterval);
            return;
        }

        try {
            const status = subnet.getStatus ? subnet.getStatus() : 'online';
            const balances = await subnet.getBalances();
            const queue = subnet.mempool ? subnet.mempool.getQueue() : [];

            // Get timer values from KV - this ensures all clients see the same timer value
            // regardless of which server instance they're connected to
            const nextBatchTime = await kvStore.getNextBatchTime();
            const isProcessingBatch = await kvStore.isProcessingBatch();

            // Get tracked wallets to include in the response
            // This helps show all wallets that have connected, even if not currently active
            const trackedWallets = await kvStore.getTrackedWallets();

            // Add any tracked wallets that aren't already in the balances
            const enhancedBalances = { ...balances };
            for (const walletAddress of trackedWallets) {
                if (!enhancedBalances[walletAddress]) {
                    // If this wallet exists in our tracking but not in current balances,
                    // add it with a zero balance (or you could query for its actual balance)
                    enhancedBalances[walletAddress] = 0;
                }
            }

            const eventData = {
                status,
                time: new Date().toISOString(),
                queue,
                balances: enhancedBalances,
                nextBatchTime,
                isProcessingBatch,
                trackedWallets // Include list of all wallets that have connected
            };

            await sendEvent(eventData);
        } catch (e) {
            console.error('Error in event interval:', e);

            if (!isStreamClosed) {
                isStreamClosed = true;
                clearInterval(eventInterval);

                try {
                    writer.close();
                } catch (closeError) {
                    console.error('Error closing writer:', closeError);
                }
            }
        }
    }, 1000); // Reduced from 100ms to 1000ms to lower pressure on the system

    // Function to check and process batches
    async function checkAndProcessBatch() {
        const queue = subnet.mempool ? subnet.mempool.getQueue() : [];
        const maxQueueLength = 20;

        // Get current timer value for decision making
        const currentBatchTime = await kvStore.getNextBatchTime();

        // Process batch if timer reached zero or queue is full
        const shouldProcessBatch = (currentBatchTime <= 0 && queue.length > 0) ||
            (queue.length >= maxQueueLength);

        // If timer is at zero, we should reset it even if we don't process a batch
        const timerAtZero = currentBatchTime <= 0;

        // Check if we should process a batch and no batch is being processed
        if (shouldProcessBatch && !(await kvStore.isProcessingBatch())) {
            console.log(`Server ${serverId} attempting to acquire batch lock`);

            // Try to acquire the batch processing lock
            if (await kvStore.acquireBatchLock(batchLockId, 30000)) {
                console.log(`Server ${serverId} acquired batch lock`);
                try {
                    // Set batch processing flag
                    await kvStore.setIsProcessingBatch(true);

                    const batchSize = queue.length;
                    if (batchSize > 0) {
                        console.log(`Server ${serverId} processing batch of ${batchSize} transactions`);

                        // Mine a block with the transactions in the mempool
                        await subnet.mineBlock(Math.min(batchSize, maxQueueLength));

                        // Refresh balances to get updated on-chain state
                        await subnet.refreshBalances();

                        // Get updated data after mining
                        const updatedQueue = subnet.mempool ? subnet.mempool.getQueue() : [];
                        const updatedBalances = await subnet.getBalances();

                        if (!isStreamClosed) {
                            // Send settlement event to client
                            await sendEvent({
                                status: subnet.getStatus ? subnet.getStatus() : 'online',
                                time: new Date().toISOString(),
                                queue: updatedQueue,
                                balances: updatedBalances,
                                nextBatchTime: 30, // Reset to 30 seconds after mining
                                isProcessingBatch: false,
                                settlement: {
                                    batchSize,
                                    timestamp: Date.now()
                                },
                                text: `${batchSize} transactions have been mined in a block and settled on-chain`
                            });
                        }
                    }

                    // Reset the batch timer
                    await kvStore.resetBatchTimer();
                    console.log(`Server ${serverId} reset batch timer after processing`);
                } catch (error) {
                    console.error(`Error processing batch on server ${serverId}:`, error);
                    // Even if there was an error, try to reset the timer
                    if (timerAtZero) {
                        await kvStore.resetBatchTimer();
                        console.log(`Server ${serverId} reset batch timer after error`);
                    }
                } finally {
                    // Reset processing flag and release lock
                    await kvStore.setIsProcessingBatch(false);
                    await kvStore.releaseBatchLock(batchLockId);
                    console.log(`Server ${serverId} released batch lock`);
                }
            } else {
                console.log(`Server ${serverId} couldn't acquire batch lock, another instance may be processing`);
            }
        }
        // If timer is at zero but no transactions to process, still reset the timer
        else if (timerAtZero && !(await kvStore.isProcessingBatch())) {
            console.log(`Server ${serverId} attempting to acquire timer reset lock (no transactions to process)`);

            // Use a special lock for timer reset to avoid conflicting with batch processing
            if (await kvStore.acquireBatchLock('timer-reset', 5000)) {
                try {
                    console.log(`Server ${serverId} resetting timer (no transactions to process)`);
                    await kvStore.resetBatchTimer();

                    // Send a timer update to the client
                    if (!isStreamClosed) {
                        const status = subnet.getStatus ? subnet.getStatus() : 'online';
                        const balances = await subnet.getBalances();
                        await sendEvent({
                            status,
                            time: new Date().toISOString(),
                            queue,
                            balances,
                            nextBatchTime: 30, // Reset to 30 seconds
                            isProcessingBatch: false
                        });
                    }
                } finally {
                    await kvStore.releaseBatchLock('timer-reset');
                }
            }
        }
    }

    // Set up batch checking interval
    const batchCheckInterval = setInterval(async () => {
        if (isStreamClosed) {
            clearInterval(batchCheckInterval);
            return;
        }

        try {
            await checkAndProcessBatch();
        } catch (error) {
            console.error('Error in batch check interval:', error);
        }
    }, 1000);

    // Clean up if client disconnects
    request.signal.addEventListener('abort', () => {
        console.log(`Client disconnected from server ${serverId}, cleaning up`);
        isStreamClosed = true;

        if (timerInterval) clearInterval(timerInterval);
        clearInterval(eventInterval);
        clearInterval(batchCheckInterval);

        // Release locks if we have them
        if (hasTimerLock) {
            kvStore.releaseBatchLock(timerLockId).catch(console.error);
        }

        try {
            writer.close();
        } catch (error) {
            console.error('Error closing writer on abort:', error);
        }
    });

    return response;
}

