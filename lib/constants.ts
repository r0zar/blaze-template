// Event names - shared between client and server
export const EVENTS = {
    BALANCE_UPDATES: 'balance-updates',
    TRANSACTION_ADDED: 'transaction-added',
    BATCH_PROCESSED: 'batch-processed',
    STATUS_UPDATE: 'status-update'
} as const;

// Channel name - shared between client and server
export const BLOCKCHAIN_CHANNEL = 'blockchain-main';

// Export types for TypeScript
export type EventType = keyof typeof EVENTS;
export type EventName = typeof EVENTS[EventType]; 