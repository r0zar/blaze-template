'use client';

import PusherClient, { PresenceChannel } from 'pusher-js';
import { EVENTS, BLOCKCHAIN_CHANNEL, CHATROOM } from './constants';
import blaze from 'blaze-sdk';

// Detect browser environment
const isBrowser = typeof window !== 'undefined';

// Pusher client singleton
let pusherClient: PusherClient | null = null;

// User info interface for presence channels
export interface UserInfo {
    nickname: string;
    totalTips: number;
    joined: number;
}

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
    result: {
        txid?: string;
        error?: string;
        reason?: string;
        [key: string]: any;
    } | null;
    text: string;
    queue?: any[];
}

export interface TransactionUpdate {
    queue: any[];
}

export interface Message {
    id: string;
    address: string;
    nickname: string;
    content: string;
    timestamp: number;
    tips: number;
}

export interface TipEvent {
    messageId: string;
    senderAddress: string;
    recipientAddress: string;
    timestamp: number;
}

export interface Member {
    id: string;
    info: {
        nickname: string;
        totalTips: number;
        joined: number;
    };
}

export interface ChatroomEventHandlers {
    onMessageReceived?: (data: Message) => void;
    onTipReceived?: (data: TipEvent) => void;
    onMemberAdded?: (member: Member) => void;
    onMemberRemoved?: (member: Member) => void;
    onSubscriptionSucceeded?: (members: { [userId: string]: Member }) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    userInfo: UserInfo;
}

export interface BlazeEventHandlers {
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
export function initPusherClient(userInfo: UserInfo): PusherClient | null {
    if (!isBrowser) return null;

    // Validate user info
    if (!userInfo || !userInfo.nickname) {
        console.error('Invalid user info:', userInfo);
        return null;
    }

    console.log('Initializing Pusher client with user info:', userInfo);

    // Return existing client if already initialized
    if (pusherClient) {
        console.log('Returning existing Pusher client');
        return pusherClient;
    }

    const currentAddress = blaze.getWalletAddress();
    console.log('Current wallet address:', currentAddress);

    try {
        pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: '/api/pusher/auth',
            auth: {
                params: {
                    user_address: currentAddress,
                    nickname: userInfo.nickname,
                    total_tips: userInfo.totalTips || 0,
                    joined: userInfo.joined || Date.now()
                }
            }
        });

        console.log('Pusher client initialized with auth params:', {
            user_address: currentAddress,
            nickname: userInfo.nickname,
            total_tips: userInfo.totalTips || 0,
            joined: userInfo.joined || Date.now()
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
export function subscribeToBlazeEvents(handlers: BlazeEventHandlers): () => void {
    // Only run in browser environment
    if (!isBrowser) return () => { };

    // Initialize Pusher client without user info for blockchain events
    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        enabledTransports: ['ws', 'wss']
    });

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

/**
 * Subscribe to the chatroom channel and register event handlers
 */
export function subscribeToChatroomEvents(handlers: ChatroomEventHandlers): () => void {
    const pusher = initPusherClient(handlers.userInfo);

    if (!pusher) return () => { }; // Return no-op cleanup if client not available

    // Force reconnect if not connected
    if (pusher.connection.state !== 'connected') {
        console.log('Pusher not connected, connecting now...');
        pusher.connect();
    }

    console.log('Current connection state:', pusher.connection.state);
    console.log('Attempting to subscribe to channel:', CHATROOM.CHANNEL);

    // Subscribe to the presence channel
    const channel = pusher.subscribe(CHATROOM.CHANNEL) as PresenceChannel;
    console.log('Subscribing to presence channel:', CHATROOM.CHANNEL);

    // Log subscription process
    channel.bind('pusher:subscription_pending', () => {
        console.log('Subscription pending for channel:', CHATROOM.CHANNEL);
    });

    // Log all events for debugging
    channel.bind_global((event: string, data: any) => {
        console.log(`Received event ${event} on channel ${CHATROOM.CHANNEL}:`, data);
    });

    // Handle presence events
    channel.bind('pusher:subscription_succeeded', (members: { [userId: string]: Member }) => {
        console.log('Successfully subscribed to presence channel. Current members:', members);
        console.log('Current member count:', Object.keys(members).length);
        if (handlers.onSubscriptionSucceeded) {
            handlers.onSubscriptionSucceeded(members);
        }
    });

    channel.bind('pusher:subscription_error', (error: any) => {
        console.error('Failed to subscribe to presence channel:', error);
        console.error('Channel:', CHATROOM.CHANNEL);
        console.error('Connection state:', pusher.connection.state);
        if (handlers.onError) {
            handlers.onError(new Error('Failed to subscribe to presence channel: ' + JSON.stringify(error)));
        }
    });

    if (handlers.onMemberAdded) {
        channel.bind('pusher:member_added', (member: Member) => {
            console.log('Member added to channel:', member);
            console.log('Member info:', member.info);
            handlers.onMemberAdded!(member);
        });
    }

    if (handlers.onMemberRemoved) {
        channel.bind('pusher:member_removed', (member: Member) => {
            console.log('Member removed from channel:', member);
            handlers.onMemberRemoved!(member);
        });
    }

    // Register message event handler
    if (handlers.onMessageReceived) {
        console.log('Binding message event handler for:', CHATROOM.EVENTS.MESSAGE_SENT);
        channel.bind(CHATROOM.EVENTS.MESSAGE_SENT, (data: Message) => {
            console.log('Received message event:', data);
            handlers.onMessageReceived!(data);
        });
    }

    // Register tip event handler
    if (handlers.onTipReceived) {
        channel.bind(CHATROOM.EVENTS.TIP_SENT, (data: TipEvent) => {
            console.log('Received tip event:', data);
            handlers.onTipReceived!(data);
        });
    }

    // Add connection state handlers
    if (handlers.onConnect) {
        pusher.connection.bind('connected', () => {
            console.log('Connection established');
            handlers.onConnect!();
        });
    }

    if (handlers.onDisconnect) {
        pusher.connection.bind('disconnected', () => {
            console.log('Connection lost');
            if (handlers.onDisconnect) handlers.onDisconnect();
        });
    }

    if (handlers.onError) {
        pusher.connection.bind('error', (error: Error) => {
            console.error('Connection error:', error);
            handlers.onError!(error);
        });
    }

    // Return cleanup function
    return () => {
        console.log('Cleaning up channel subscriptions');
        channel.unbind_all();
        if (handlers.onConnect) pusher.connection.unbind('connected', handlers.onConnect);
        if (handlers.onDisconnect) pusher.connection.unbind('disconnected', handlers.onDisconnect);
        if (handlers.onError) pusher.connection.unbind('error', handlers.onError);
        pusher.unsubscribe(CHATROOM.CHANNEL);
    };
} 