import { kv } from '@vercel/kv';

// Constants for KV keys
const KV_NEXT_BATCH_TIME = 'nextBatchTime';
const KV_LAST_BATCH_TIME = 'lastBatchTime';
const KV_IS_PROCESSING_BATCH = 'isProcessingBatch';
const KV_BATCH_LOCK_PREFIX = 'lock:'; // Prefix for lock keys
const KV_CONNECTED_WALLETS = 'connectedWallets'; // For tracking wallets that have connected
const KV_WALLET_LAST_SEEN = 'wallet:lastSeen:'; // Prefix for tracking when a wallet was last seen

// Default values
const DEFAULT_BATCH_TIME = 30; // 30 second countdown

/**
 * Get the current batch time remaining
 */
export async function getNextBatchTime(): Promise<number> {
    try {
        const value = await kv.get<number>(KV_NEXT_BATCH_TIME);
        return value !== null ? value : DEFAULT_BATCH_TIME;
    } catch (error) {
        console.error('Error getting next batch time from KV:', error);
        return DEFAULT_BATCH_TIME;
    }
}

/**
 * Set the batch time
 */
export async function setNextBatchTime(seconds: number): Promise<void> {
    try {
        await kv.set(KV_NEXT_BATCH_TIME, seconds);
    } catch (error) {
        console.error('Error setting next batch time in KV:', error);
    }
}

/**
 * Decrement the batch time by 1 second
 * Returns the new time after decrementing
 */
export async function decrementBatchTime(): Promise<number> {
    try {
        // Get current time first
        const currentTime = await getNextBatchTime();

        // Don't decrement if already zero
        if (currentTime <= 0) {
            console.log('Timer already at zero, not decrementing');
            return 0;
        }

        // Slow down the timer - only decrement by 0.2 seconds each time
        // This makes the timer move at 1/5 speed, which should feel more natural
        const decrementAmount = 1;

        // Instead of using atomic decrement, which can only decrease by integers,
        // we'll get the current value, subtract our fractional amount, and set it back
        const newTime = Math.max(0, currentTime - decrementAmount);

        // Set the new time value
        await setNextBatchTime(newTime);
        console.log(`Decremented timer by ${decrementAmount}: ${currentTime} -> ${newTime}`);

        // If the result is negative, reset to 0
        if (newTime < 0) {
            console.log('Timer went negative, resetting to 0');
            await setNextBatchTime(0);
            return 0;
        }

        return newTime;
    } catch (error) {
        console.error('Error decrementing batch time in KV:', error);

        // Fallback to manual decrement if atomic operation fails
        try {
            const currentTime = await getNextBatchTime();
            const newTime = Math.max(0, currentTime - 1);
            await setNextBatchTime(newTime);
            console.log(`Fallback decrement: ${currentTime} -> ${newTime}`);
            return newTime;
        } catch (fallbackError) {
            console.error('Fallback decrement also failed:', fallbackError);
            const currentTime = await getNextBatchTime();
            return Math.max(0, currentTime - 1);
        }
    }
}

/**
 * Get the timestamp of the last processed batch
 */
export async function getLastBatchTime(): Promise<number> {
    const time = await kv.get(KV_LAST_BATCH_TIME);
    return time ? Number(time) : 0;
}

/**
 * Set the timestamp of the last processed batch
 */
export async function setLastBatchTime(time: number): Promise<void> {
    await kv.set(KV_LAST_BATCH_TIME, String(time));
}

/**
 * Check if a batch is currently being processed
 */
export async function isProcessingBatch(): Promise<boolean> {
    try {
        const value = await kv.get<boolean>(KV_IS_PROCESSING_BATCH);
        return value === true;
    } catch (error) {
        console.error('Error checking batch processing status in KV:', error);
        return false;
    }
}

/**
 * Set the batch processing status
 */
export async function setIsProcessingBatch(value: boolean): Promise<void> {
    try {
        await kv.set(KV_IS_PROCESSING_BATCH, value);
    } catch (error) {
        console.error('Error setting batch processing status in KV:', error);
    }
}

/**
 * Reset the batch timer to the default value (30 seconds)
 * Also updates the last batch time
 */
export async function resetBatchTimer(): Promise<void> {
    try {
        console.log(`Resetting batch timer to ${DEFAULT_BATCH_TIME} seconds`);

        // First check if a batch is being processed to avoid premature reset
        const isProcessing = await isProcessingBatch();
        if (isProcessing) {
            console.log('Batch is currently being processed, delaying timer reset');
            return;
        }

        // Check current queue state to avoid resetting if there are transactions to process
        // This extra check helps prevent skipping batches of pending transactions
        const processingState = await kv.get<boolean>(KV_IS_PROCESSING_BATCH);
        if (processingState === false) {
            // Use explicit set operation instead of setNextBatchTime for more reliable behavior
            await kv.set(KV_NEXT_BATCH_TIME, DEFAULT_BATCH_TIME);

            // Update the last batch time
            await setLastBatchTime(Date.now());

            // Verify the timer was reset properly
            const newTimer = await getNextBatchTime();
            console.log(`Verified batch timer reset: ${newTimer} seconds`);
        } else {
            console.log('Skipping timer reset due to potential race condition with batch processing');
        }
    } catch (error) {
        console.error('Error resetting batch timer in KV:', error);

        // Fallback direct attempt if the first fails
        try {
            await kv.set(KV_NEXT_BATCH_TIME, DEFAULT_BATCH_TIME);
            console.log('Used fallback method to reset timer');
        } catch (fallbackError) {
            console.error('Critical error: Failed to reset timer after fallback attempt', fallbackError);
        }
    }
}

/**
 * Try to acquire a distributed lock for batch processing
 * Returns true if the lock was acquired, false otherwise
 * Lock expires after timeoutMs milliseconds (default: 10 seconds)
 * 
 * @param lockId Unique identifier for this specific lock
 * @param timeoutMs Time in milliseconds after which the lock expires
 */
export async function acquireBatchLock(lockId: string, timeoutMs: number = 10000): Promise<boolean> {
    try {
        // Use a unique key for each lock type based on the lockId
        const lockKey = `${KV_BATCH_LOCK_PREFIX}${lockId}`;

        // Set the key only if it doesn't exist (NX) with an expiration (EX)
        const lockExpiry = Math.ceil(timeoutMs / 1000); // Convert ms to seconds for Redis EX
        const result = await kv.set(lockKey, true, { nx: true, ex: lockExpiry });

        // If result is OK, we acquired the lock
        return result === 'OK';
    } catch (error) {
        console.error('Error acquiring batch lock in KV:', error);
        return false;
    }
}

/**
 * Release a previously acquired lock
 */
export async function releaseBatchLock(lockId: string): Promise<boolean> {
    try {
        // Use the same unique key format as in acquireBatchLock
        const lockKey = `${KV_BATCH_LOCK_PREFIX}${lockId}`;
        await kv.del(lockKey);
        return true;
    } catch (error) {
        console.error('Error releasing batch lock in KV:', error);
        return false;
    }
}

/**
 * Initialize KV with default values if not already set
 */
export async function initializeKV(): Promise<void> {
    try {
        // Only set if not already exists
        await kv.set(KV_NEXT_BATCH_TIME, DEFAULT_BATCH_TIME, { nx: true });
        await kv.set(KV_LAST_BATCH_TIME, Date.now(), { nx: true });
        await kv.set(KV_IS_PROCESSING_BATCH, false, { nx: true });
        console.log('KV store initialized with default values');
    } catch (error) {
        console.error('Error initializing KV values:', error);
    }
}

/**
 * Track a wallet in the KV store when it connects
 * Stores both in the wallets list and records last active timestamp
 * 
 * @param walletAddress The wallet address to track
 * @param balanceAmount The initial balance amount
 */
export async function trackConnectedWallet(walletAddress: string, balanceAmount: number = 0): Promise<void> {
    try {
        if (!walletAddress) return;

        // Update the last seen timestamp for this wallet
        await kv.set(`${KV_WALLET_LAST_SEEN}${walletAddress}`, Date.now());

        // Add to the set of all wallets if not already there
        // Using a Redis SET data structure to avoid duplicates
        await kv.sadd(KV_CONNECTED_WALLETS, walletAddress);

        console.log(`Tracked wallet ${walletAddress} in KV store`);
    } catch (error) {
        console.error('Error tracking connected wallet in KV:', error);
    }
}

/**
 * Update the last seen timestamp for a wallet
 * Call this periodically while a wallet is active
 * 
 * @param walletAddress The wallet address to update
 */
export async function updateWalletLastSeen(walletAddress: string): Promise<void> {
    try {
        if (!walletAddress) return;
        await kv.set(`${KV_WALLET_LAST_SEEN}${walletAddress}`, Date.now());
    } catch (error) {
        console.error('Error updating wallet last seen timestamp in KV:', error);
    }
}

/**
 * Get all tracked wallets from the KV store
 * Returns an array of wallet addresses
 */
export async function getTrackedWallets(): Promise<string[]> {
    try {
        const wallets = await kv.smembers(KV_CONNECTED_WALLETS);
        return wallets || [];
    } catch (error) {
        console.error('Error getting tracked wallets from KV:', error);
        return [];
    }
}

/**
 * Get the last seen timestamp for a specific wallet
 * 
 * @param walletAddress The wallet address to check
 */
export async function getWalletLastSeen(walletAddress: string): Promise<number | null> {
    try {
        if (!walletAddress) return null;
        return await kv.get<number>(`${KV_WALLET_LAST_SEEN}${walletAddress}`);
    } catch (error) {
        console.error('Error getting wallet last seen timestamp from KV:', error);
        return null;
    }
}

/**
 * Remove wallets that haven't been seen for a certain period
 * Call this periodically to clean up old wallet entries
 * 
 * @param maxAgeMs Maximum age in milliseconds before a wallet is considered inactive
 */
export async function cleanupInactiveWallets(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
        const now = Date.now();
        const wallets = await getTrackedWallets();

        for (const wallet of wallets) {
            const lastSeen = await getWalletLastSeen(wallet);
            if (lastSeen && now - lastSeen > maxAgeMs) {
                // Remove wallet if not seen for the specified time
                await kv.srem(KV_CONNECTED_WALLETS, wallet);
                await kv.del(`${KV_WALLET_LAST_SEEN}${wallet}`);
                console.log(`Removed inactive wallet ${wallet} from KV store`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up inactive wallets in KV:', error);
    }
} 