'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
    subscribeToBlockchainEvents,
    BalanceUpdate,
    StatusUpdate,
    BatchInfo,
    TransactionUpdate
} from '../lib/pusher-client';

/**
 * Custom hook for blockchain data
 * Provides real-time updates for balances, transaction queue, and node status
 */
export default function useBlockchainData() {
    const [balances, setBalances] = useState<BalanceUpdate>({});
    const [status, setStatus] = useState<StatusUpdate['status'] | null>(null);
    const [queue, setQueue] = useState<any[]>([]);
    const [isSettling, setIsSettling] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSettlement, setLastSettlement] = useState<BatchInfo | null>(null);

    // Use refs for tracking connection state to avoid re-renders
    const lastEventTimeRef = useRef<number>(Date.now());
    const connectionStateRef = useRef<string>('initializing');
    const reconnectAttemptsRef = useRef<number>(0);
    const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const processingBatchRef = useRef<boolean>(false);
    const batchProcessingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Function to load initial data
    const loadInitialData = useCallback(async () => {
        try {
            console.log('[Blockchain] Loading initial data...');

            // Add timeout to the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('/api/status', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Blockchain] Status API returned ${response.status}: ${errorText}`);
                throw new Error(`Failed to fetch status: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[Blockchain] Initial data loaded:', data);

            // Validate the response data
            if (!data || typeof data !== 'object') {
                console.error('[Blockchain] Invalid data format received:', data);
                throw new Error('Invalid data format received from API');
            }

            setBalances(data.balances || {});
            setStatus(data.status || null);
            setQueue(data.queue || []);

            // Check if a batch is currently processing
            if (data.status?.state === 'processing') {
                processingBatchRef.current = true;
                console.log('[Blockchain] Detected batch processing in progress');
                toast.loading('Processing transaction batch...', { id: 'processing-batch' });

                // Set a timeout to check batch status
                startBatchProcessingTimeout();
            }

            setIsLoading(false);
            toast.success('Blockchain data loaded', { id: 'blockchain-init' });

        } catch (error) {
            console.error('[Blockchain] Error loading initial data:', error);

            // More detailed error handling
            let errorMessage = 'Failed to load blockchain data';

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    errorMessage = 'Connection timeout. Server may be unavailable.';
                } else {
                    errorMessage = `Error: ${error.message}`;
                }
            }

            // Try to check if the API server is running at all
            try {
                const healthCheck = await fetch('/api/health', {
                    method: 'HEAD',
                    headers: { 'Cache-Control': 'no-cache' }
                });

                if (!healthCheck.ok) {
                    errorMessage = 'API server is running but returned an error';
                }
            } catch (healthError) {
                console.error('[Blockchain] Health check failed:', healthError);
                errorMessage = 'API server appears to be offline';
            }

            toast.error(errorMessage, { id: 'blockchain-error', duration: 5000 });
            setIsLoading(false);

            // Set fallback empty state
            setBalances({});
            setStatus(null);
            setQueue([]);
        }
    }, []);

    // Function to check batch status with server
    const checkBatchStatus = useCallback(async () => {
        if (!processingBatchRef.current) return;

        try {
            console.log('[Blockchain] Checking batch status with server...');
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('Failed to fetch status');

            const data = await response.json();

            // If no longer processing, update state
            if (data.status?.state !== 'processing') {
                console.log('[Blockchain] Batch processing completed according to server');
                processingBatchRef.current = false;
                setIsSettling(false);

                if (batchProcessingTimeoutRef.current) {
                    clearTimeout(batchProcessingTimeoutRef.current);
                    batchProcessingTimeoutRef.current = null;
                }

                // Update state with latest data
                setBalances(data.balances || {});
                setStatus(data.status || null);
                setQueue(data.queue || []);

                toast.success('Transaction batch completed', { id: 'processing-batch' });
            } else {
                console.log('[Blockchain] Batch still processing according to server');
                // Still processing, check again in 30 seconds
                setTimeout(checkBatchStatus, 30000);
            }
        } catch (error) {
            console.error('[Blockchain] Error checking batch status:', error);
            // Try again in 30 seconds
            setTimeout(checkBatchStatus, 30000);
        }
    }, []);

    // Start batch processing timeout
    const startBatchProcessingTimeout = useCallback(() => {
        // Clear any existing timeout
        if (batchProcessingTimeoutRef.current) {
            clearTimeout(batchProcessingTimeoutRef.current);
        }

        // Set a timeout to check batch status if no completion event is received
        batchProcessingTimeoutRef.current = setTimeout(() => {
            if (processingBatchRef.current) {
                console.log('[Blockchain] Batch processing timeout reached, checking status with server');
                checkBatchStatus();
            }
        }, 60000); // 60 seconds timeout
    }, [checkBatchStatus]);

    // Function to check connection health and reconnect if needed
    const checkConnectionHealth = useCallback(() => {
        const now = Date.now();
        const timeSinceLastEvent = now - lastEventTimeRef.current;

        console.log(`[Blockchain] Connection health check: Last event ${timeSinceLastEvent / 1000}s ago, state: ${connectionStateRef.current}`);

        // If no events for 30 seconds and not already reconnecting
        if (timeSinceLastEvent > 30000 && connectionStateRef.current !== 'reconnecting') {
            // Limit reconnection attempts
            if (reconnectAttemptsRef.current >= 3) {
                console.log('[Blockchain] Maximum reconnection attempts reached');
                toast.error('Connection appears unstable. Try refreshing the page.', { id: 'connection-error' });
                return;
            }

            reconnectAttemptsRef.current++;
            connectionStateRef.current = 'reconnecting';

            console.log(`[Blockchain] Connection appears stale, reconnecting... (Attempt ${reconnectAttemptsRef.current})`);
            toast.loading('Connection appears stale, reconnecting...', { id: 'reconnecting' });

            // Force reload data
            loadInitialData().then(() => {
                lastEventTimeRef.current = Date.now();
                connectionStateRef.current = 'connected';
                toast.success('Reconnected successfully', { id: 'reconnecting' });
            }).catch(() => {
                connectionStateRef.current = 'error';
                toast.error('Failed to reconnect', { id: 'reconnecting' });
            });
        }
    }, [loadInitialData]);

    // Subscribe to blockchain events
    useEffect(() => {
        console.log('[Blockchain] Setting up blockchain event subscription...');
        toast.loading('Connecting to blockchain...', { id: 'blockchain-init' });

        // Reset connection state
        connectionStateRef.current = 'connecting';
        reconnectAttemptsRef.current = 0;
        lastEventTimeRef.current = Date.now();

        // Load initial data
        loadInitialData();

        // Set up health check interval
        healthCheckIntervalRef.current = setInterval(checkConnectionHealth, 30000);

        // Subscribe to events
        const unsubscribe = subscribeToBlockchainEvents({
            onConnect: () => {
                console.log('[Blockchain] Connected to Pusher');
                connectionStateRef.current = 'connected';
                lastEventTimeRef.current = Date.now();
                toast.success('Connected to blockchain', { id: 'blockchain-init' });
            },

            onDisconnect: () => {
                console.log('[Blockchain] Disconnected from Pusher');
                connectionStateRef.current = 'disconnected';
            },

            onError: (error) => {
                console.error('[Blockchain] Pusher connection error:', error);
                connectionStateRef.current = 'error';
                toast.error('Connection error', { id: 'blockchain-error' });
            },

            onBalanceUpdates: (data) => {
                console.log('[Blockchain] Balance update received:', data);
                lastEventTimeRef.current = Date.now();
                setBalances(data);
            },

            onTransactionAdded: (data) => {
                console.log('[Blockchain] Transaction added:', data);
                lastEventTimeRef.current = Date.now();
                setQueue(data.queue || []);
            },

            onStatusUpdate: (data) => {
                console.log('[Blockchain] Status update received:', data);
                lastEventTimeRef.current = Date.now();

                setStatus(data.status);
                setQueue(data.queue || []);

                // If status indicates processing, update state
                if (data.status.state === 'processing' && !processingBatchRef.current) {
                    console.log('[Blockchain] Batch processing started');
                    processingBatchRef.current = true;
                    setIsSettling(true);
                    toast.loading('Processing transaction batch...', { id: 'processing-batch' });
                    startBatchProcessingTimeout();
                }
            },

            onBatchProcessed: (data) => {
                console.log('[Blockchain] Batch processed:', data);
                lastEventTimeRef.current = Date.now();

                // Clear any timeout
                if (batchProcessingTimeoutRef.current) {
                    clearTimeout(batchProcessingTimeoutRef.current);
                    batchProcessingTimeoutRef.current = null;
                }

                processingBatchRef.current = false;
                setIsSettling(false);
                setLastSettlement(data);

                // Show success or error toast based on batch result
                if (data.success) {
                    toast.success(`Processed ${data.batchSize} transactions`, { id: 'processing-batch' });
                } else {
                    toast.error(`Batch processing failed: ${data.text}`, { id: 'processing-batch' });
                }

                // Update queue if provided
                if (data.queue) {
                    setQueue(data.queue);
                }
            }
        });

        // Cleanup function
        return () => {
            console.log('[Blockchain] Cleaning up blockchain subscription');
            unsubscribe();

            if (healthCheckIntervalRef.current) {
                clearInterval(healthCheckIntervalRef.current);
                healthCheckIntervalRef.current = null;
            }

            if (batchProcessingTimeoutRef.current) {
                clearTimeout(batchProcessingTimeoutRef.current);
                batchProcessingTimeoutRef.current = null;
            }

            toast.dismiss('blockchain-init');
            toast.dismiss('processing-batch');
            toast.dismiss('reconnecting');
        };
    }, [loadInitialData, checkConnectionHealth, startBatchProcessingTimeout]);

    // Refresh data function for manual refresh
    const refreshData = useCallback(async () => {
        console.log('[Blockchain] Manual refresh requested');
        toast.loading('Refreshing blockchain data...', { id: 'refresh-data' });

        try {
            await loadInitialData();
            lastEventTimeRef.current = Date.now();
            toast.success('Data refreshed', { id: 'refresh-data' });
        } catch (error) {
            console.error('[Blockchain] Error refreshing data:', error);
            toast.error('Failed to refresh data', { id: 'refresh-data' });
        }
    }, [loadInitialData]);

    return {
        balances,
        status,
        queue,
        isSettling,
        isLoading,
        lastSettlement,
        refreshData,
        connectionState: connectionStateRef.current
    };
} 