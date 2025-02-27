'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import blaze, { Transaction } from 'blaze-sdk';
import { subscribeToBlazeEvents } from '../../lib/pusher-client';
import { formatAddress } from '@/utils/formatters';
import { createLoadingResourceHook } from '@/contexts/blaze/loading-resource';

// Define the context type
interface BlazeContextType {
    // Connection state
    isLoading: boolean;
    isRefreshing: boolean;
    connectionState: string;

    // Balance state
    balances: Record<string, number>;
    pendingBalanceChanges: { [address: string]: boolean };

    // Transaction state
    txRequests: Transaction[];
    isMining: boolean;
    lastBatch: {
        batchSize: number;
        timestamp: number;
        txId?: string;
    } | null;
    transactionCounter: number;

    // Wallet state
    isWalletConnected: boolean;
    selectedTargetAddress: string | null;

    // Suspense loading
    useLoadingResource: (resourceKey: string) => void;

    // Actions
    refreshBlazeData: () => Promise<void>;
    refreshBalances: (userAddress?: string) => Promise<void>;
    handlePendingBalanceChange: (address: string) => void;
    clearPendingBalanceChange: (address: string) => void;
    toggleWalletConnection: () => Promise<void>;
    selectTargetAddress: (address: string) => void;
    getRandomTargetAddress: () => string;
    handleDeposit: () => void;
    handleWithdraw: () => void;
    executeTransfer: (amount: number, to?: string) => void;
    triggerSuccessAnimation: () => void;
}

// Create the context with a default value
const BlazeContext = createContext<BlazeContextType | undefined>(undefined);

// Provider component
export function BlazeProvider({ children }: { children: React.ReactNode }) {
    // Connection state
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Balance state
    const [balances, setBalances] = useState<Record<string, number>>({});
    const [pendingBalanceChanges, setPendingBalanceChanges] = useState<{ [address: string]: boolean }>({});

    // Transaction state
    const [txRequests, setTxRequests] = useState<Transaction[]>([]);
    const [isMining, setIsMining] = useState(false);
    const [lastBatch, setLastBatch] = useState<{
        batchSize: number;
        timestamp: number;
        txId?: string;
    } | null>(null);
    const [transactionCounter, setTransactionCounter] = useState(0);

    // Wallet state
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [selectedTargetAddress, setSelectedTargetAddress] = useState<string | null>(null);

    // Refs for tracking connection state
    const lastEventTimeRef = useRef<number>(Date.now());
    const connectionStateRef = useRef<string>('initializing');
    const reconnectAttemptsRef = useRef<number>(0);
    const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const processingBatchRef = useRef<boolean>(false);
    const batchProcessingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastBalanceRefreshRef = useRef<number>(0);
    const REFRESH_COOLDOWN = 5000; // 5 second cooldown between refreshes

    // Set up loading resource hook
    const { createLoadingEffect, createUseLoadingResource } = createLoadingResourceHook();

    // Create the loading effect
    createLoadingEffect(isLoading);

    // Create the loading resource hook
    const useLoadingResource = createUseLoadingResource(isLoading, 'blaze');

    // Function to load initial data
    const loadInitialData = useCallback(async () => {
        try {
            console.log('[Blaze] Loading initial data...');

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
                console.error(`[Blaze] Status API returned ${response.status}: ${errorText}`);
                throw new Error(`Failed to fetch status: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[Blaze] Initial data loaded:', data);

            // Validate the response data
            if (!data || typeof data !== 'object') {
                console.error('[Blaze] Invalid data format received:', data);
                throw new Error('Invalid data format received from API');
            }

            setBalances(data.balances || {});
            setTxRequests(data.queue || []);

            // Check if a batch is currently processing
            if (data.status?.state === 'processing') {
                processingBatchRef.current = true;
                console.log('[Blaze] Detected batch processing in progress');
                toast.loading('Mining transaction batch...', { id: 'processing-batch' });
                startBatchProcessingTimeout();
            }

            setIsLoading(false);
            toast('Blaze data loaded', { id: 'blockchain-init' });

        } catch (error) {
            console.error('[Blaze] Error loading initial data:', error);

            // More detailed error handling
            let errorMessage = 'Failed to load Blaze data';

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
                console.error('[Blaze] Health check failed:', healthError);
                errorMessage = 'API server appears to be offline';
            }

            toast.error(errorMessage, { id: 'blockchain-error', duration: 5000 });
            setIsLoading(false);

            // Set fallback empty state
            setBalances({});
            setTxRequests([]);
        }
    }, []);

    // Function to check batch status with server
    const checkBatchStatus = useCallback(async () => {
        if (!processingBatchRef.current) return;

        try {
            console.log('[Blaze] Checking batch status with server...');
            const response = await fetch('/api/status');
            if (!response.ok) throw new Error('Failed to fetch status');

            const data = await response.json();

            // If no longer processing, update state
            if (data.status?.state !== 'processing') {
                console.log('[Blaze] Batch processing completed according to server');
                processingBatchRef.current = false;
                setIsMining(false);

                if (batchProcessingTimeoutRef.current) {
                    clearTimeout(batchProcessingTimeoutRef.current);
                    batchProcessingTimeoutRef.current = null;
                }

                // Update state with latest data
                setBalances(data.balances || {});
                setTxRequests(data.queue || []);

                toast.success('Transaction batch completed', { id: 'processing-batch' });
            } else {
                console.log('[Blaze] Batch still processing according to server');
                // Still processing, check again in 30 seconds
                setTimeout(checkBatchStatus, 30000);
            }
        } catch (error) {
            console.error('[Blaze] Error checking batch status:', error);
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
                console.log('[Blaze] Batch processing timeout reached, checking status with server');
                checkBatchStatus();
            }
        }, 60000); // 60 seconds timeout
    }, [checkBatchStatus]);

    // Function to check connection health and reconnect if needed
    const checkConnectionHealth = useCallback(() => {
        const now = Date.now();
        const timeSinceLastEvent = now - lastEventTimeRef.current;

        console.log(`[Blaze] Connection health check: Last event ${timeSinceLastEvent / 1000}s ago, state: ${connectionStateRef.current}`);

        // If no events for 30 seconds and not already reconnecting
        if (timeSinceLastEvent > 30000 && connectionStateRef.current !== 'reconnecting') {
            // Limit reconnection attempts
            if (reconnectAttemptsRef.current >= 3) {
                console.log('[Blaze] Maximum reconnection attempts reached');
                toast.error('Connection appears unstable. Try refreshing the page.', { id: 'connection-error' });
                return;
            }

            reconnectAttemptsRef.current++;
            connectionStateRef.current = 'reconnecting';

            console.log(`[Blaze] Connection appears stale, reconnecting... (Attempt ${reconnectAttemptsRef.current})`);
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
        console.log('[Blaze] Setting up blockchain event subscription...');
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
        const unsubscribe = subscribeToBlazeEvents({
            onConnect: () => {
                console.log('[Blaze] Connected to Pusher');
                connectionStateRef.current = 'connected';
                lastEventTimeRef.current = Date.now();
                toast('Connected to Blaze Subnet', { id: 'blockchain-init' });
            },

            onDisconnect: () => {
                console.log('[Blaze] Disconnected from Pusher');
                connectionStateRef.current = 'disconnected';
            },

            onError: (error) => {
                console.error('[Blaze] Pusher connection error:', error);
                connectionStateRef.current = 'error';
                toast.error('Connection error', { id: 'blockchain-error' });
            },

            onBalanceUpdates: (data) => {
                console.log('[Blaze] Balance update received:', data);
                lastEventTimeRef.current = Date.now();

                // Merge with existing balances, preserving wallet balance if connected
                setBalances((prevBalances) => {
                    // Skip update if balances are the same
                    if (JSON.stringify(prevBalances) === JSON.stringify(data)) {
                        return prevBalances;
                    }

                    // If we have no balances, take pusher balances
                    if (Object.keys(prevBalances).length === 0) {
                        return data;
                    }

                    // Merge balances, preserving wallet balance if connected
                    if (isWalletConnected) {
                        const walletAddress = blaze.getWalletAddress();
                        if (walletAddress && !data[walletAddress] && prevBalances[walletAddress]) {
                            return {
                                ...data,
                                [walletAddress]: prevBalances[walletAddress]
                            };
                        }
                    }

                    return data;
                });
            },

            onTransactionAdded: (data) => {
                console.log('[Blaze] Transaction added:', data);
                lastEventTimeRef.current = Date.now();
                setTxRequests(data.queue || []);
            },

            onStatusUpdate: (data) => {
                console.log('[Blaze] Status update received:', data);
                lastEventTimeRef.current = Date.now();

                setTxRequests(data.queue || []);

                // If status indicates processing, update state
                if (data.status.state === 'processing' && !processingBatchRef.current) {
                    console.log('[Blaze] Batch processing started');
                    processingBatchRef.current = true;
                    setIsMining(true);
                    toast.loading('Processing transaction batch...', { id: 'processing-batch' });
                    startBatchProcessingTimeout();
                }
            },

            onBatchProcessed: (data) => {
                console.log('[Blaze] Batch processed:', data);
                lastEventTimeRef.current = Date.now();

                // Clear any timeout
                if (batchProcessingTimeoutRef.current) {
                    clearTimeout(batchProcessingTimeoutRef.current);
                    batchProcessingTimeoutRef.current = null;
                }

                processingBatchRef.current = false;
                setIsMining(false);

                // Set the last settlement info with proper timestamp handling
                const timestamp = data.timestamp
                    ? new Date(data.timestamp).getTime()
                    : Date.now();

                const batchSize = data.batchSize;

                // Handle the result which might contain error information
                const result = data.result || {};
                const txId = 'txid' in result ? result.txid : undefined;
                const error = 'error' in result ? result.error : undefined;
                const reason = 'reason' in result ? result.reason : undefined;

                setLastBatch({ batchSize, timestamp, txId });

                // Show success or error toast based on batch result
                if (data.success) {
                    toast.success(`Processed ${data.batchSize} transactions`, { id: 'processing-batch' });
                } else {
                    const errorMessage = error
                        ? `${error}${reason ? ` - ${reason}` : ''}`
                        : data.text || 'Unknown error';
                    toast.error(`Batch processing failed: ${errorMessage}`, { id: 'processing-batch' });
                    console.error('[Blaze] Batch processing failed:', error, 'Reason:', reason);
                }

                // Update queue if provided
                if (data.queue) {
                    setTxRequests(data.queue);
                }
            }
        });

        // Initial wallet connection check
        const walletConnected = blaze.isWalletConnected();
        setIsWalletConnected(walletConnected);

        if (walletConnected) {
            refreshBalances(blaze.getWalletAddress());
        }

        // Cleanup function
        return () => {
            console.log('[Blaze] Cleaning up blockchain subscription');
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

    // Add a fallback for loading state - ensure we exit loading after a maximum time
    useEffect(() => {
        if (isLoading) {
            const loadingFallbackTimeout = setTimeout(() => {
                // Force exit loading state after 10 seconds no matter what
                setIsLoading(false);

                // If we still have no transactions, provide an empty array
                if (txRequests.length === 0) {
                    setTxRequests([]);
                }
            }, 10000); // 10 seconds max loading time

            return () => clearTimeout(loadingFallbackTimeout);
        }
    }, [isLoading, txRequests.length]);

    // Set up wallet activity heartbeat
    useEffect(() => {
        const heartbeatInterval = setInterval(() => {
            const address = blaze.getWalletAddress();
            if (isWalletConnected && address) {
                trackWalletActivity(address, 'update');
            }
        }, 60000);

        return () => clearInterval(heartbeatInterval);
    }, [isWalletConnected, balances]);

    // Function to refresh blaze data
    const refreshBlazeData = useCallback(async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            console.log('[Blaze] Manually refreshing blaze data...');

            await loadInitialData();
            lastEventTimeRef.current = Date.now();
            toast.success('Blaze data refreshed');
        } catch (error) {
            console.error('[Blaze] Error refreshing blaze data:', error);
            toast.error('Failed to refresh blaze data');
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, loadInitialData]);

    // Function to refresh balances
    const refreshBalances = useCallback(async (userAddress?: string) => {
        const now = Date.now();
        if (now - lastBalanceRefreshRef.current < REFRESH_COOLDOWN) {
            console.log('[Blaze] Skipping balance refresh due to cooldown');
            return;
        }

        lastBalanceRefreshRef.current = now;
        console.log('[Blaze] Refreshing balances...');

        try {
            const response = await fetch('/api/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: userAddress })
            });

            if (!response.ok) {
                throw new Error(`Failed to refresh balances: ${response.status}`);
            }

            const data = await response.json();
            if (data.balances) {
                setBalances(prevBalances => {
                    // Merge with existing balances
                    return { ...prevBalances, ...data.balances };
                });
                console.log('[Blaze] Balances refreshed:', data.balances);
            }
        } catch (error) {
            console.error('[Blaze] Error refreshing balances:', error);
        }
    }, []);

    // Function to handle pending balance change
    const handlePendingBalanceChange = useCallback((address: string) => {
        setPendingBalanceChanges(prev => ({ ...prev, [address]: true }));
    }, []);

    // Function to clear pending balance change
    const clearPendingBalanceChange = useCallback((address: string) => {
        setPendingBalanceChanges(prev => {
            const updated = { ...prev };
            delete updated[address];
            return updated;
        });
    }, []);

    // Function to toggle wallet connection
    const toggleWalletConnection = useCallback(async () => {
        if (isWalletConnected) {
            // Disconnect wallet
            blaze.disconnectWallet();
            setIsWalletConnected(false);
            toast.success('Wallet disconnected');
            return;
        }

        // Connect wallet
        try {
            toast.loading('Connecting wallet...', { id: 'wallet-connect' });
            await blaze.connectWallet();

            const address = blaze.getWalletAddress();
            if (!address) {
                throw new Error('Failed to get wallet address');
            }

            // Track wallet activity
            trackWalletActivity(address, 'connect');

            // Add wallet to balances if not present
            setBalances(prev => {
                if (!prev[address]) {
                    return { ...prev, [address]: 0 };
                }
                return prev;
            });

            setIsWalletConnected(true);
            toast.success('Wallet connected', { id: 'wallet-connect' });

            // Refresh balances to get updated wallet balance
            refreshBalances(address);
        } catch (error) {
            console.error('Error connecting wallet:', error);
            toast.error('Failed to connect wallet', { id: 'wallet-connect' });
        }
    }, [isWalletConnected, refreshBalances]);

    // Function to select target address
    const selectTargetAddress = useCallback((address: string) => {
        setSelectedTargetAddress(address);
    }, []);

    // Function to get random target address
    const getRandomTargetAddress = useCallback(() => {
        const addresses = Object.keys(balances).filter(addr =>
            addr !== blaze.getWalletAddress() &&
            !addr.includes('wallet') &&
            balances[addr] > 0
        );

        if (addresses.length === 0) {
            // Fallback to a default address if no valid addresses
            return 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS';
        }

        const randomIndex = Math.floor(Math.random() * addresses.length);
        return addresses[randomIndex];
    }, [balances]);

    // Function to handle deposit
    const handleDeposit = useCallback(async () => {
        if (!isWalletConnected) {
            toast.error('Please connect your wallet first');
            return;
        }

        const address = blaze.getWalletAddress();
        if (!address) {
            toast.error('Wallet address not found');
            return;
        }

        try {
            handlePendingBalanceChange(address);
            await blaze.deposit(1000000);
            toast.success('Deposit initiated');

            // Refresh balances after a short delay
            setTimeout(() => {
                refreshBalances(address);
                clearPendingBalanceChange(address);
            }, 2000);
        } catch (error) {
            console.error('Error during deposit:', error);
            toast.error('Deposit failed');
            clearPendingBalanceChange(address);
        }
    }, [isWalletConnected, handlePendingBalanceChange, clearPendingBalanceChange, refreshBalances]);

    // Function to handle withdraw
    const handleWithdraw = useCallback(async () => {
        if (!isWalletConnected) {
            toast.error('Please connect your wallet first');
            return;
        }

        const address = blaze.getWalletAddress();
        if (!address) {
            toast.error('Wallet address not found');
            return;
        }

        try {
            handlePendingBalanceChange(address);
            await blaze.withdraw(1000000);
            toast.success('Withdrawal initiated');

            // Refresh balances after a short delay
            setTimeout(() => {
                refreshBalances(address);
                clearPendingBalanceChange(address);
            }, 2000);
        } catch (error) {
            console.error('Error during withdrawal:', error);
            toast.error('Withdrawal failed');
            clearPendingBalanceChange(address);
        }
    }, [isWalletConnected, handlePendingBalanceChange, clearPendingBalanceChange, refreshBalances]);

    // Function to execute transfer
    const executeTransfer = useCallback(async (amount: number, to?: string) => {
        if (!isWalletConnected) {
            toast.error('Please connect your wallet first');
            return;
        }

        const targetAddress = to || selectedTargetAddress || getRandomTargetAddress();

        try {
            await blaze.transfer({ amount, to: targetAddress });
            triggerSuccessAnimation();
            toast.success(`Token transfer request sent to mempool`);
        } catch (error) {
            console.error('Error during transfer:', error);
            toast.error('Transfer failed');
        }
    }, [isWalletConnected, selectedTargetAddress, getRandomTargetAddress]);

    // Function to trigger success animation
    const triggerSuccessAnimation = useCallback(() => {
        setTransactionCounter(prev => prev + 1);
    }, []);

    // Function to track wallet activity
    const trackWalletActivity = useCallback((address: string, action: string) => {
        try {
            fetch('/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, action, timestamp: Date.now() })
            });
        } catch (error) {
            console.error('Error tracking wallet activity:', error);
        }
    }, []);

    // Create the context value
    const contextValue: BlazeContextType = {
        // Connection state
        isLoading,
        isRefreshing,
        connectionState: connectionStateRef.current,

        // Balance state
        balances,
        pendingBalanceChanges,

        // Transaction state
        txRequests,
        isMining,
        lastBatch,
        transactionCounter,

        // Wallet state
        isWalletConnected,
        selectedTargetAddress,

        // Suspense loading
        useLoadingResource,

        // Actions
        refreshBlazeData,
        refreshBalances,
        handlePendingBalanceChange,
        clearPendingBalanceChange,
        toggleWalletConnection,
        selectTargetAddress,
        getRandomTargetAddress,
        handleDeposit,
        handleWithdraw,
        executeTransfer,
        triggerSuccessAnimation
    };

    return (
        <BlazeContext.Provider value={contextValue}>
            {children}
        </BlazeContext.Provider>
    );
}

// Custom hook to use the blockchain context
export function useBlaze() {
    const context = useContext(BlazeContext);
    if (context === undefined) {
        throw new Error('useBlaze must be used within a BlazeProvider');
    }
    return context;
} 