/**
 * Utility functions for formatting and displaying data in the UI
 */

/**
 * Format a timestamp to a readable time string
 * @param nonce Timestamp or nonce value
 * @returns Formatted time string
 */
export const formatTimestamp = (nonce: number | string): string => {
    const timestamp = typeof nonce === 'string' ? parseInt(nonce) : nonce;
    if (isNaN(timestamp)) return 'Pending';
    return new Date(timestamp).toLocaleTimeString();
};

/**
 * Format a blockchain address to a shortened form
 * @param address Full blockchain address
 * @returns Shortened address with ellipsis
 */
export const formatAddress = (address: string): string => {
    if (!address) return '---';
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
};

/**
 * Get status text based on current state
 * @param isMining Whether a batch is currently being settled
 * @param lastBatch Information about the last settlement
 * @param txRequestsLength Number of pending transactions
 * @returns Status text to display
 */
export const getStatusText = (
    isMining: boolean,
    lastBatch: { batchSize: number; timestamp: number; txId?: string; } | null,
    txRequestsLength: number
): string => {
    if (isMining) return 'Mining transaction batch...';
    if (lastBatch && Date.now() - lastBatch.timestamp < 2000) {
        if (lastBatch.txId) {
            return `Mined batch of ${lastBatch.batchSize} transactions`;
        } else {
            return `Failed to mine batch of ${lastBatch.batchSize} transactions`;
        }
    }
    return txRequestsLength > 0 ? `${txRequestsLength} transactions pending` : 'No pending transactions';
};

/**
 * Validates a Stacks address
 * @param address The address to validate
 * @returns boolean indicating if the address is valid
 */
export function isValidStacksAddress(address: string): boolean {
    // Stacks addresses must start with 'S' and be 41 characters long
    return address.startsWith('S') && address.length === 41;
}