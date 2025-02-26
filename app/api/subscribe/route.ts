import { subnet } from '../subnet';
// Replace Node.js crypto import with Web API compatible UUID generation
// This is compatible with Edge Runtime
// import { randomUUID } from 'crypto';
import * as kvStore from '../kv';
import { triggerPusherEvent } from '../pusher';
import { BLOCKCHAIN_CHANNEL, EVENTS } from '@/app/lib/constants';
// IMPORTANT: This implementation uses Vercel KV to synchronize batch timers across serverless functions
// Each instance will use the same timer value from the shared KV store

// Generate a unique server ID for this serverless instance
// This helps with distributed locking to prevent race conditions
// const serverId = randomUUID();
// Use Web API compatible UUID generation
const serverId = crypto.randomUUID();
console.log(`Subscribe route initialized with serverId: ${serverId}`);

// Initialize the KV store with default values if not set
kvStore.initializeKV().catch(console.error);

// Configure this route to run in Node.js environment instead of Edge
// This ensures compatibility with all the libraries and dependencies
export const runtime = 'nodejs';

// Set Dynamic to avoid ISR caching
export const dynamic = 'force-dynamic';

// Set the maximum duration to the highest possible value
export const maxDuration = 60; // 5 minutes in seconds for Node.js functions

// Constants
const UPDATE_INTERVAL = 2000;
const REFRESH_INTERVAL = 5000;
const MAX_BATCH_SIZE = 20;
const MIN_BATCH_SIZE = 5;  // Process small batches after timeout
const MAX_BATCH_WAIT = 30000; // 30 seconds max wait for small batches
const DEFAULT_ADDRESSES = [
    'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
    'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ'
];

interface SubnetState {
    lastUpdate: number;
    lastRefresh: number;
    lastSigner: string | null;
    isProcessing: boolean;
    queue: any[];
    balances: Record<string, number>;
}

// Initialize state
const state: SubnetState = {
    lastUpdate: Date.now(),
    lastRefresh: Date.now(),
    lastSigner: subnet.signer || null,
    isProcessing: false,
    queue: [],
    balances: {}
};

export async function GET(request: Request) {
    console.log('Subscribe route handler started');

    try {
        // Initialize KV and get initial state
        await kvStore.initializeKV();
        console.log('KV store initialized');

        await subnet.refreshBalances();
        console.log('Initial balance refresh complete');

        // Get initial balances and state
        const currentBalances = await subnet.getBalances();
        const trackedWallets = await kvStore.getTrackedWallets();
        const allAddresses = new Set([...DEFAULT_ADDRESSES, ...trackedWallets]);
        const enhancedBalances = { ...currentBalances };

        for (const address of allAddresses) {
            if (!enhancedBalances[address]) {
                enhancedBalances[address] = 0;
            }
        }

        // Send initial state via Pusher
        console.log('Sending initial state via Pusher...');
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, enhancedBalances);
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: {
                state: subnet.getStatus?.() || 'online',
                subnet: subnet.signer || null,
                txQueue: [],
                lastProcessedBlock: null
            },
            time: new Date().toISOString(),
            queue: [],
            balances: enhancedBalances,
            isProcessingBatch: false,
            trackedWallets
        });

        // Update state
        state.balances = enhancedBalances;

        // Set up regular updates
        const updateInterval = setInterval(async () => {
            try {
                const newState = await getSubnetState();

                // Only send updates if there are changes
                if (JSON.stringify(newState.balances) !== JSON.stringify(state.balances)) {
                    await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, newState.balances);
                    state.balances = newState.balances || {};
                }

                if (newState.queue && newState.queue.length !== state.queue.length) {
                    await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                        status: {
                            state: subnet.getStatus?.() || 'online',
                            subnet: subnet.signer || null,
                            txQueue: newState.queue,
                            lastProcessedBlock: null
                        },
                        time: new Date().toISOString(),
                        queue: newState.queue,
                        balances: newState.balances,
                        isProcessingBatch: newState.isProcessing,
                        trackedWallets: await kvStore.getTrackedWallets()
                    });
                    state.queue = newState.queue || [];
                }

                // Check for batch processing
                if (newState.queue && newState.queue.length >= MAX_BATCH_SIZE) {
                    await processBatch();
                }
            } catch (error) {
                console.error('Error in update interval:', error);
            }
        }, UPDATE_INTERVAL);

        // Cleanup on abort
        request.signal.addEventListener('abort', () => {
            clearInterval(updateInterval);
            console.log('Connection closed');
        });

        // Return success response
        return new Response('Subscribed to updates', {
            headers: {
                'Content-Type': 'text/plain'
            }
        });

    } catch (error) {
        console.error('Error in subscribe handler:', error);
        return new Response('Error initializing connection', {
            status: 500,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    }
}

async function getSubnetState(): Promise<Partial<SubnetState>> {
    try {
        // Get balances first to ensure they're available
        const balances = await subnet.getBalances();

        const [queue, isProcessing, trackedWallets, lastBatchTime] = await Promise.all([
            subnet.mempool ? subnet.mempool.getQueue() : Promise.resolve([]),
            kvStore.isProcessingBatch(),
            kvStore.getTrackedWallets(),
            kvStore.getLastBatchTime()
        ]);

        // Check if we should process a batch based on time or size
        const now = Date.now();
        const timeSinceLastBatch = now - (lastBatchTime || 0);

        if (queue.length > 0 && !isProcessing) {
            const shouldProcessBatch =
                queue.length >= MAX_BATCH_SIZE ||
                (queue.length >= MIN_BATCH_SIZE && timeSinceLastBatch >= MAX_BATCH_WAIT);

            if (shouldProcessBatch) {
                // Process batch asynchronously
                processBatch().catch(console.error);
            }
        }

        // Initialize balances for all tracked addresses
        const allAddresses = new Set([...DEFAULT_ADDRESSES, ...trackedWallets]);
        const enhancedBalances = { ...balances };

        for (const address of allAddresses) {
            if (!enhancedBalances[address]) {
                enhancedBalances[address] = 0;
            }
        }

        // Send immediate balance update via Pusher
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, enhancedBalances);

        return {
            queue,
            balances: enhancedBalances,
            isProcessing
        };
    } catch (error) {
        console.error('Error getting subnet state:', error);
        return {
            queue: [],
            balances: {},
            isProcessing: false
        };
    }
}

async function refreshBalances(force = false): Promise<boolean> {
    const now = Date.now();
    if (!force && now - state.lastRefresh < REFRESH_INTERVAL) return false;

    const currentSigner = subnet.signer || null;
    if (!force && currentSigner === state.lastSigner) return false;

    try {
        await subnet.refreshBalances();
        state.lastRefresh = now;
        state.lastSigner = currentSigner;
        return true;
    } catch (error) {
        console.error('Error refreshing balances:', error);
        return false;
    }
}

async function processBatch() {
    if (!state.queue.length || state.isProcessing) return;

    // Try to acquire the batch lock
    // if (!(await kvStore.acquireBatchLock('batch', 30000))) {
    //     console.log('Could not acquire batch lock, another process may be handling the batch');
    //     return;
    // }

    try {
        state.isProcessing = true;
        await kvStore.setIsProcessingBatch(true);
        console.log('Starting batch processing...');

        // Notify processing start via Pusher
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: {
                state: 'processing',
                subnet: subnet.signer || null,
                txQueue: state.queue,
                lastProcessedBlock: null
            },
            time: new Date().toISOString(),
            message: 'Processing batch'
        });

        // Process batch with optimal size
        const batchSize = Math.min(state.queue.length, MAX_BATCH_SIZE);
        console.log(`Mining block with ${batchSize} transactions...`);
        await subnet.mineBlock(batchSize);

        // Update state and last batch time
        await refreshBalances(true);
        await kvStore.setLastBatchTime(Date.now());

        const newState = await getSubnetState();
        Object.assign(state, newState);

        // Send notifications sequentially via Pusher
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BATCH_PROCESSED, {
            batchSize,
            timestamp: Date.now(),
            success: true,
            text: `${batchSize} transactions have been mined in a block and settled on-chain`
        });

        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, state.balances);

        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: {
                state: 'idle',
                subnet: subnet.signer || null,
                txQueue: state.queue,
                lastProcessedBlock: null
            },
            time: new Date().toISOString(),
            queue: state.queue,
            balances: state.balances
        });

        console.log(`Successfully processed batch of ${batchSize} transactions`);
    } catch (error) {
        console.error('Error processing batch:', error);
        await triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
            status: {
                state: 'error',
                subnet: subnet.signer || null,
                txQueue: state.queue,
                lastProcessedBlock: null
            },
            time: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Failed to mine block'
        });
    } finally {
        state.isProcessing = false;
        await kvStore.setIsProcessingBatch(false);
        await kvStore.releaseBatchLock('batch');
        console.log('Batch processing completed, released lock');
    }
}

