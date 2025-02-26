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
        return `Mined batch of ${lastBatch.batchSize} transactions`;
    }
    return txRequestsLength > 0 ? `${txRequestsLength} transactions pending` : 'No pending transactions';
};

/**
 * Get CSS classes for the status pill based on current state
 * @param isMining Whether a batch is currently being settled
 * @param lastBatch Information about the last settlement
 * @returns CSS classes for the status pill
 */
export const getPillClasses = (
    isMining: boolean,
    lastBatch: { batchSize: number; timestamp: number; txId?: string; } | null
): string => {
    const baseClasses = 'px-3 py-1 rounded-full';
    if (isMining) {
        return `${baseClasses} bg-yellow-200/50 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-700`;
    }
    if (lastBatch && Date.now() - lastBatch.timestamp < 2000) {
        return `${baseClasses} bg-green-200/50 dark:bg-green-800/30 border border-green-300 dark:border-green-700`;
    }
    return `${baseClasses} bg-gray-200/50 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700`;
};

/**
 * Get CSS classes for the status indicator based on current state
 * @param isMining Whether a batch is currently being settled
 * @param lastBatch Information about the last settlement
 * @param txRequestsLength Number of pending transactions
 * @returns CSS classes for the status indicator
 */
export const getIndicatorClasses = (
    isMining: boolean,
    lastBatch: { batchSize: number; timestamp: number; txId?: string; } | null,
    txRequestsLength: number
): string => {
    if (isMining) {
        return 'bg-yellow-600 animate-ping';
    }
    if (lastBatch && Date.now() - lastBatch.timestamp < 2000) {
        return 'bg-green-500';
    }
    return txRequestsLength > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500';
};

/**
 * Get CSS classes for a balance card based on its selection state
 * @param address The address of the card
 * @param isWalletConnected Whether a wallet is connected
 * @param walletAddress The address of the connected wallet
 * @param selectedTargetAddress The currently selected target address
 * @returns CSS classes for the balance card
 */
export const getBalanceCardClasses = (
    address: string,
    isWalletConnected: boolean,
    walletAddress: string | null,
    selectedTargetAddress: string | null
): string => {
    const baseClasses = "p-4 rounded-lg bg-white dark:bg-black/40 border transition-colors cursor-pointer";
    if (isWalletConnected && address === walletAddress) {
        return `${baseClasses} border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30`;
    }
    if (selectedTargetAddress === address) {
        return `${baseClasses} border-yellow-500 dark:border-yellow-500 ring-2 ring-yellow-500/30`;
    }
    return `${baseClasses} border-gray-100 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500`;
}; 