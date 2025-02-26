'use client';

import PusherClient from 'pusher-js';
import { EVENTS, BLOCKCHAIN_CHANNEL, EventName } from './constants';

// Detect browser environment
const isBrowser = typeof window !== 'undefined';

// Pusher client singleton
let pusherClient: PusherClient | null = null;

// Event handler types
export interface BalanceUpdate {
    [address: string]: number;
}

export interface StatusUpdate {
    status: {
        state: string;
        subnet: string | null;
        txQueue: any[];
        lastProcessedBlock: number | null;
    };
    queue: any[];
    balances: BalanceUpdate;
    time: string;
    isProcessingBatch: boolean;
}

export interface BatchInfo {
    batchSize: number;
    timestamp: number;
    success: boolean;
    text: string;
    queue?: any[];
}

export interface TransactionUpdate {
    queue: any[];
}

export interface BlockchainEventHandlers {
    onBalanceUpdates?: (data: BalanceUpdate) => void;
    onTransactionAdded?: (data: TransactionUpdate) => void;
    onBatchProcessed?: (data: BatchInfo) => void;
    onStatusUpdate?: (data: StatusUpdate) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
}

/**
 * Initialize Pusher client for browser environment
 * Returns existing client if already initialized
 */
export function initPusherClient(): PusherClient | null {
    // Only run in browser environment
    if (!isBrowser) return null;

    // Return existing instance if already initialized
    if (pusherClient) {
        // If client exists but is disconnected, reconnect
        if (pusherClient.connection.state !== 'connected') {
            console.log('Pusher client exists but not connected, reconnecting...');
            pusherClient.connect();
        }
        return pusherClient;
    }

    // Check if configuration is available in the environment
    // Make sure we're using the NEXT_PUBLIC_ prefixed variables
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!key || !cluster) {
        console.warn('Pusher client configuration is missing. Real-time updates will not be available.');
        // Optionally fall back to fetching from API
        fetchConfigAndInitialize();
        return null;
    }

    // Initialize new Pusher client with optimized settings
    try {
        // Reduce timeouts for faster reconnection
        pusherClient = new PusherClient(key, {
            cluster,
            enabledTransports: ['ws', 'wss'],
            activityTimeout: 15000,      // 15 seconds (default is 120s)
            pongTimeout: 10000,          // 10 seconds (default is 30s)
            unavailableTimeout: 5000,    // 5 seconds (default is 15s)
            wsHost: `ws-${cluster}.pusher.com`, // Explicitly set WebSocket host
            forceTLS: true,              // Force TLS for security
            enableStats: false,          // Disable stats for better performance
            disableStats: true,          // Redundant but ensures stats are disabled
        });

        console.log('Pusher client initialized with optimized settings');

        // Set up connection activity monitoring to save connections on free tier
        setupActivityMonitoring(pusherClient);

        // Add connection state logging
        pusherClient.connection.bind('state_change', (states: { current: string, previous: string }) => {
            console.log(`Pusher connection state changed from ${states.previous} to ${states.current}`);

            // If disconnected, try to reconnect immediately
            if (states.current === 'disconnected' || states.current === 'failed') {
                console.log('Pusher disconnected, attempting immediate reconnection');
                setTimeout(() => pusherClient?.connect(), 500);
            }
        });

        // Add error logging
        pusherClient.connection.bind('error', (err: any) => {
            console.error('Pusher connection error:', err);
            // Try to reconnect on error
            setTimeout(() => pusherClient?.connect(), 1000);
        });

        return pusherClient;
    } catch (error) {
        console.error('Failed to initialize Pusher client:', error);
        return null;
    }
}

/**
 * Fetch configuration from API if environment variables are not available
 * This is a fallback for when the NEXT_PUBLIC variables aren't available
 */
async function fetchConfigAndInitialize() {
    if (!isBrowser || pusherClient) return;

    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Failed to fetch config');

        const config = await response.json();

        if (config.pusher?.key && config.pusher?.cluster) {
            pusherClient = new PusherClient(config.pusher.key, {
                cluster: config.pusher.cluster,
                enabledTransports: ['ws', 'wss'],
                activityTimeout: 15000,
                pongTimeout: 10000,
                unavailableTimeout: 5000,
            });

            setupActivityMonitoring(pusherClient);
            console.log('Pusher client initialized via API config');
        }
    } catch (error) {
        console.error('Failed to fetch Pusher config:', error);
    }
}

/**
 * Set up user activity monitoring to disconnect idle users
 * This helps stay under the 100 connection limit on free tier
 */
function setupActivityMonitoring(pusher: PusherClient): void {
    // Skip if not in browser
    if (!isBrowser) return;

    let activityTimeout: NodeJS.Timeout;
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes (increased from 10)

    function resetActivityTimeout() {
        clearTimeout(activityTimeout);

        // If disconnected, reconnect
        if (pusher.connection.state !== 'connected') {
            pusher.connect();
        }

        // Set timeout to disconnect after inactivity
        activityTimeout = setTimeout(() => {
            console.log('User inactive, disconnecting Pusher to save connections');
            pusher.disconnect();
        }, INACTIVITY_TIMEOUT);
    }

    // Monitor user activity
    window.addEventListener('mousemove', resetActivityTimeout, { passive: true });
    window.addEventListener('keypress', resetActivityTimeout, { passive: true });
    window.addEventListener('touchstart', resetActivityTimeout, { passive: true });
    window.addEventListener('scroll', resetActivityTimeout, { passive: true });

    // Immediately start the activity timer
    resetActivityTimeout();

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        clearTimeout(activityTimeout);
        pusher.disconnect();
    });
}

/**
 * Subscribe to the blockchain channel and register event handlers
 */
export function subscribeToBlockchainEvents(handlers: BlockchainEventHandlers): () => void {
    // Only run in browser environment
    if (!isBrowser) return () => { };

    const pusher = initPusherClient();
    if (!pusher) return () => { }; // Return no-op cleanup if client not available

    // Force reconnect if not connected
    if (pusher.connection.state !== 'connected') {
        console.log('Pusher not connected, connecting now...');
        pusher.connect();
    }

    // Subscribe to the channel
    const channel = pusher.subscribe(BLOCKCHAIN_CHANNEL);
    console.log('Subscribed to blockchain channel');

    // Register event handlers if provided
    if (handlers.onBalanceUpdates) {
        channel.bind(EVENTS.BALANCE_UPDATES, (data: BalanceUpdate) => {
            console.log('Received balance update event:', data);
            handlers.onBalanceUpdates!(data);
        });
    }

    if (handlers.onTransactionAdded) {
        channel.bind(EVENTS.TRANSACTION_ADDED, (data: TransactionUpdate) => {
            console.log('Received transaction added event:', data);
            handlers.onTransactionAdded!(data);
        });
    }

    if (handlers.onBatchProcessed) {
        channel.bind(EVENTS.BATCH_PROCESSED, (data: BatchInfo) => {
            console.log('Received batch processed event:', data);
            handlers.onBatchProcessed!(data);
        });
    }

    if (handlers.onStatusUpdate) {
        channel.bind(EVENTS.STATUS_UPDATE, (data: StatusUpdate) => {
            console.log('Received status update event:', data);
            handlers.onStatusUpdate!(data);
        });
    }

    // Add connection state handlers
    if (handlers.onConnect) {
        pusher.connection.bind('connected', handlers.onConnect);
    }

    if (handlers.onDisconnect) {
        pusher.connection.bind('disconnected', handlers.onDisconnect);
    }

    if (handlers.onError) {
        pusher.connection.bind('error', handlers.onError);
    }

    // Return cleanup function
    return () => {
        channel.unbind_all();
        if (handlers.onConnect) pusher.connection.unbind('connected', handlers.onConnect);
        if (handlers.onDisconnect) pusher.connection.unbind('disconnected', handlers.onDisconnect);
        if (handlers.onError) pusher.connection.unbind('error', handlers.onError);
        pusher.unsubscribe(BLOCKCHAIN_CHANNEL);
    };
} 