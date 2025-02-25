import { kv } from '@vercel/kv';

// Constants for KV keys
const KV_NEXT_BATCH_TIME = 'nextBatchTime';
const KV_LAST_BATCH_TIME = 'lastBatchTime';
const KV_IS_PROCESSING_BATCH = 'isProcessingBatch';
const KV_BATCH_LOCK_PREFIX = 'lock:'; // Prefix for lock keys

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
            return 0;
        }

        // Use atomic decrement operation for better concurrency handling
        const newTime = await kv.decr(KV_NEXT_BATCH_TIME);

        // If the result is negative, reset to 0
        if (newTime < 0) {
            await setNextBatchTime(0);
            return 0;
        }

        return newTime;
    } catch (error) {
        console.error('Error decrementing batch time in KV:', error);
        const currentTime = await getNextBatchTime();
        return Math.max(0, currentTime - 1);
    }
}

/**
 * Get timestamp of last batch processing
 */
export async function getLastBatchTime(): Promise<number> {
    try {
        const value = await kv.get<number>(KV_LAST_BATCH_TIME);
        return value !== null ? value : Date.now();
    } catch (error) {
        console.error('Error getting last batch time from KV:', error);
        return Date.now();
    }
}

/**
 * Update the last batch processing timestamp
 */
export async function updateLastBatchTime(): Promise<void> {
    try {
        await kv.set(KV_LAST_BATCH_TIME, Date.now());
    } catch (error) {
        console.error('Error updating last batch time in KV:', error);
    }
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

        // Use explicit set operation instead of setNextBatchTime for more reliable behavior
        await kv.set(KV_NEXT_BATCH_TIME, DEFAULT_BATCH_TIME);

        // Update the last batch time
        await updateLastBatchTime();

        // Verify the timer was reset properly
        const newTimer = await getNextBatchTime();
        console.log(`Verified batch timer reset: ${newTimer} seconds`);
    } catch (error) {
        console.error('Error resetting batch timer in KV:', error);

        // Fallback direct attempt if the first fails
        try {
            await kv.set(KV_NEXT_BATCH_TIME, DEFAULT_BATCH_TIME);
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