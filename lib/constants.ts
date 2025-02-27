// Blockchain events
export const BLOCKCHAIN_CHANNEL = 'blockchain';
export const EVENTS = {
    BALANCE_UPDATES: 'balance-updates',
    TRANSACTION_ADDED: 'transaction-added',
    BATCH_PROCESSED: 'batch-processed',
    STATUS_UPDATE: 'status-update'
} as const;

// Chatroom constants
export const CHATROOM = {
    CHANNEL: 'presence-chatroom',
    EVENTS: {
        MESSAGE_SENT: 'message-sent',
        TIP_SENT: 'tip-sent',
        TRANSFER_REQUEST: 'transfer-request'
    }
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS]; 