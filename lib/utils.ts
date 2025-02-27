/**
 * Trims a transaction object to its essential fields
 */
export function trimTransaction(tx: any) {
    if (!tx) return null;
    return {
        type: tx.type,
        from: tx.transfer?.signer,
        to: tx.transfer?.to,
        amount: tx.transfer?.amount,
        nonce: tx.transfer?.nonce
    };
}

/**
 * Trims a queue of transactions to essential data
 * Optionally limits the number of transactions included
 */
export function trimQueue(queue: any[], limit: number = 20) {
    if (!Array.isArray(queue)) return [];
    return queue.slice(0, limit).map(trimTransaction);
}

/**
 * Trims status data to essential fields
 */
export function trimStatus(status: any) {
    return {
        state: status?.state || 'unknown',
        subnet: status?.subnet || null,
        queueLength: status?.txQueue?.length || 0
    };
}

/**
 * Trims balances object to only include non-zero balances
 */
export function trimBalances(balances: Record<string, number>) {
    const trimmed: Record<string, number> = {};
    for (const [address, balance] of Object.entries(balances)) {
        if (balance > 0) {
            trimmed[address] = balance;
        }
    }
    return trimmed;
} 