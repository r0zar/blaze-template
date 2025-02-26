import { useState, useEffect } from "react";
import blaze, { Transaction } from "blaze-sdk";
import useBlockchainData from "@/app/hooks/useBlockchainData";
import { formatAddress } from "../../utils/formatters";
import toast from "react-hot-toast";

// Define the Status interface to match what comes from the server
export interface Status {
    state: string;
    subnet: string | null;
    txQueue: Transaction[];
    lastProcessedBlock: number | null;
}

// Extend BatchInfo to include txId and use proper types
export interface BatchInfo {
    batchSize: number;
    timestamp: number;
    txId?: string;
}

export interface ActionButtonState {
    txRequests: Transaction[];
    balances: Record<string, number>;
    isLoading: boolean;
    isMining: boolean;
    lastBatch: {
        batchSize: number;
        timestamp: number;
        txId?: string;
    } | null;
    transactionCounter: number;
    isWalletConnected: boolean;
    selectedTargetAddress: string | null;
    pendingBalanceChanges: { [address: string]: boolean };
    pusherLoading: boolean;
    pusherStatus: any;
    connectionState: string;
    isRefreshing: boolean;
}

// Add this interface to define the shape of actions
interface ActionButtonActions {
    setSelectedTargetAddress: (address: string | null) => void;
    triggerSuccessAnimation: () => void;
    handlePendingBalanceChange: (address: string) => void;
    clearPendingBalanceChange: (address: string) => void;
    toggleWalletConnection: () => Promise<void>;
    refreshBalances: (userAddress?: string) => Promise<void>;
    refreshBlockchainData: () => Promise<void>;
    setBalances: (balances: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setTxRequests: (txs: Transaction[]) => void;
    setIsMining: (isMining: boolean) => void;
    setLastBatch: (settlement: { batchSize: number; timestamp: number; txId?: string; } | null) => void;
    setIsLoading: (loading: boolean) => void;
    setIsWalletConnected: (connected: boolean) => void;
    selectTargetAddress: (address: string) => void;
    getRandomTargetAddress: () => string;
    handleDeposit: () => void;
    handleWithdraw: () => void;
}

export function useActionButtonState() {
    const [txRequests, setTxRequests] = useState<Transaction[]>([]);
    const [balances, setBalances] = useState<Record<string, number>>({});  // Start with empty balances
    const [isLoading, setIsLoading] = useState(true);
    const [isMining, setIsMining] = useState(false);
    const [lastBatch, setLastBatch] = useState<{
        batchSize: number;
        timestamp: number;
        txId?: string;
    } | null>(null);
    const [transactionCounter, setTransactionCounter] = useState(0);
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [selectedTargetAddress, setSelectedTargetAddress] = useState<string | null>(null);
    const [pendingBalanceChanges, setPendingBalanceChanges] = useState<{ [address: string]: boolean }>({});
    const [lastBalanceRefresh, setLastBalanceRefresh] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const REFRESH_COOLDOWN = 5000; // 5 second cooldown between refreshes

    // Initialize the useBlockchainData hook
    const {
        balances: pusherBalances,
        queue: pusherQueue,
        status: pusherStatus,
        lastBatch: pusherLastBatchInfo,
        isLoading: pusherLoading,
        connectionState,
        refreshData
    } = useBlockchainData();

    // Debug logging for balance updates
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('Balance state updated:', balances);
            console.log('Pusher balances:', pusherBalances);
            console.log('Connection state:', connectionState);
        }
    }, [balances, pusherBalances, connectionState]);

    // Initial data load
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const response = await fetch('/api/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force: true })
                });
                const data = await response.json();
                if (data.balances) {
                    setBalances(data.balances);
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Initial balances loaded:', data.balances);
                    }
                }
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    console.error('Error loading initial balances:', error);
                }
                // Set fallback balances immediately if initial load fails
                setBalances({
                    'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS': 10000000,
                    'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ': 5000000
                });
            }
        };

        loadInitialData();
    }, []); // Run once on mount

    // Update balances from Pusher with improved logic
    useEffect(() => {
        if (pusherBalances && Object.keys(pusherBalances).length > 0) {
            setBalances((prevBalances) => {
                // Skip update if balances are the same
                if (JSON.stringify(prevBalances) === JSON.stringify(pusherBalances)) {
                    return prevBalances;
                }

                // If we have no balances, take pusher balances
                if (Object.keys(prevBalances).length === 0) {
                    return pusherBalances;
                }

                // Merge balances, preserving wallet balance if connected
                if (isWalletConnected) {
                    const walletAddress = blaze.getWalletAddress();
                    if (walletAddress && !pusherBalances[walletAddress] && prevBalances[walletAddress]) {
                        return {
                            ...pusherBalances,
                            [walletAddress]: prevBalances[walletAddress]
                        };
                    }
                }

                return pusherBalances;
            });
        }
    }, [pusherBalances, isWalletConnected]);

    // Update queue from Pusher
    useEffect(() => {
        if (pusherQueue && Array.isArray(pusherQueue)) {
            setTxRequests(pusherQueue);
        }
    }, [pusherQueue]);

    // Update last settlement info when batch is processed
    useEffect(() => {
        if (pusherLastBatchInfo) {
            console.log('Batch processed:', pusherLastBatchInfo);

            // When a batch is processed, we want to reset the settling state
            setIsMining(false);

            // Set the last settlement info with proper timestamp handling
            const timestamp = pusherLastBatchInfo.timestamp
                ? new Date(pusherLastBatchInfo.timestamp).getTime()
                : Date.now();

            const batchSize = pusherLastBatchInfo.batchSize;
            const txId = pusherLastBatchInfo.result.txid;

            setLastBatch({ batchSize, timestamp, txId });

            // Refresh the transaction requests
            setTxRequests(pusherQueue);
        }
    }, [pusherLastBatchInfo, pusherQueue]);

    // Initial wallet connection check and balance refresh
    useEffect(() => {
        const walletConnected = blaze.isWalletConnected();
        setIsWalletConnected(walletConnected);

        if (walletConnected) {
            refreshBalances(blaze.getWalletAddress());
        }
    }, []); // Empty dependency array - only run once

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

    // Update the useActionButtonState loading and connection status handling
    useEffect(() => {
        // Update loading state based on blockchain data hook
        setIsLoading(pusherLoading);

        // If connection state changes, update UI message accordingly
        if (connectionState !== 'connected' && connectionState !== 'initializing' && connectionState !== 'connecting') {
            if (connectionState === 'error') {
                toast.error('Unable to connect to the blockchain service', {
                    id: 'connection-error',
                    duration: 5000
                });
            } else if (connectionState === 'disconnected') {
                toast.error('Lost connection to blockchain service. Reconnecting...', {
                    id: 'disconnected',
                    duration: 10000
                });
            }
        }
    }, [pusherLoading, connectionState]);

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
    }, [isLoading, txRequests.length, balances]);

    // Helper functions
    const refreshBalances = async (userAddress?: string) => {
        const now = Date.now();
        if (now - lastBalanceRefresh < REFRESH_COOLDOWN) {
            return; // Skip if too soon since last refresh
        }
        setLastBalanceRefresh(now);

        try {
            const response = await fetch('/api/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userAddress ? { user: userAddress } : { force: true })
            });
            const data = await response.json();
            if (data.balances) {
                setBalances(prevBalances => {
                    // Skip update if balances are the same
                    if (JSON.stringify(prevBalances) === JSON.stringify(data.balances)) {
                        return prevBalances;
                    }
                    return data.balances;
                });
            }
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Error refreshing balances:', error);
            }
        }
    };

    const trackWalletActivity = async (address: string, action: string) => {
        try {
            await fetch('/api/wallet/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address,
                    action,
                    balance: balances[address] || 0
                })
            });
        } catch (error) {
            // Only log errors in development
            if (process.env.NODE_ENV === 'development') {
                console.error('Error tracking wallet activity:', error);
            }
        }
    };

    const triggerSuccessAnimation = () => {
        setTransactionCounter(prev => prev + 1);
    };

    const handlePendingBalanceChange = (address: string) => {
        setPendingBalanceChanges(prev => ({
            ...prev,
            [address]: true
        }));
    };

    const clearPendingBalanceChange = (address: string) => {
        setPendingBalanceChanges(prev => {
            const newState = { ...prev };
            delete newState[address];
            return newState;
        });
    };

    const selectTargetAddress = (address: string) => {
        if (isWalletConnected && address === blaze.getWalletAddress()) {
            return;
        }
        setSelectedTargetAddress(address);
        toast.success(`Selected ${formatAddress(address)} as transfer target`, {
            id: 'target-updated',
            duration: 3000
        });
    };

    const getRandomTargetAddress = () => {
        const availableAddresses = Object.keys(balances).filter(address =>
            !isWalletConnected || address !== blaze.getWalletAddress()
        );

        if (availableAddresses.length === 0) {
            return 'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ';
        }

        const randomIndex = Math.floor(Math.random() * availableAddresses.length);
        const randomAddress = availableAddresses[randomIndex];

        toast.success(`Randomly selected ${formatAddress(randomAddress)} as transfer target`, {
            id: 'random-target',
            duration: 3000
        });

        return randomAddress;
    };

    const handleDeposit = () => {
        if (isWalletConnected) {
            const address = blaze.getWalletAddress();
            blaze.deposit(10000000);
            handlePendingBalanceChange(address);
        }
    };

    const handleWithdraw = () => {
        if (isWalletConnected) {
            const address = blaze.getWalletAddress();
            blaze.withdraw(5000000);
            handlePendingBalanceChange(address);
        }
    };

    const toggleWalletConnection = async () => {
        try {
            if (isWalletConnected) {
                const address = blaze.getWalletAddress();
                blaze.disconnectWallet();
                setIsWalletConnected(false);
                toast.success("Wallet disconnected successfully", {
                    id: 'wallet-disconnected',
                    duration: 5000
                });

                try {
                    await fetch('/api/wallet/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            address,
                            action: 'disconnect'
                        })
                    });
                } catch {
                    // Error handling is done via UI messages
                }
            } else {
                try {
                    const address = await blaze.connectWallet();
                    if (address) {
                        setIsWalletConnected(true);
                        toast.success("Wallet connected successfully", {
                            id: 'wallet-connected',
                            duration: 5000
                        });

                        setBalances((prevBalances) => {
                            const updatedBalances = { ...prevBalances };
                            if (!updatedBalances[address]) {
                                updatedBalances[address] = 0;
                            }
                            return updatedBalances;
                        });

                        await refreshBalances(address);

                        try {
                            const currentBalance = balances[address] || 0;
                            await fetch('/api/wallet/track', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    address,
                                    action: 'connect',
                                    balance: currentBalance
                                })
                            });
                        } catch {
                            // Error handling is done via UI messages
                        }
                    } else {
                        toast.error("Failed to connect wallet - no address returned", {
                            id: 'connect-error',
                            duration: 5000
                        });
                    }
                } catch {
                    toast.error("Failed to connect wallet. Please try again.", {
                        id: 'wallet-connection-error',
                        duration: 5000
                    });
                }
            }
        } catch {
            toast.error("An unexpected error occurred with your wallet.", {
                id: 'wallet-error',
                duration: 5000
            });
        }
    };

    // Function to refresh blockchain data
    const refreshBlockchainData = async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            console.log('Manually refreshing blockchain data...');

            // Use the refreshData function from useBlockchainData
            await refreshData();

            // Show success message
            toast.success('Blockchain data refreshed');
        } catch (error) {
            console.error('Error refreshing blockchain data:', error);
            toast.error('Failed to refresh blockchain data');
        } finally {
            setIsRefreshing(false);
        }
    };

    return {
        state: {
            txRequests,
            balances,
            isLoading,
            isMining,
            lastBatch,
            transactionCounter,
            isWalletConnected,
            selectedTargetAddress,
            pendingBalanceChanges,
            pusherLoading,
            pusherStatus,
            connectionState,
            isRefreshing
        },
        actions: {
            setSelectedTargetAddress,
            triggerSuccessAnimation,
            handlePendingBalanceChange,
            clearPendingBalanceChange,
            toggleWalletConnection,
            refreshBalances,
            refreshBlockchainData,
            setBalances,
            setTxRequests,
            setIsMining,
            setLastBatch,
            setIsLoading,
            setIsWalletConnected,
            selectTargetAddress,
            getRandomTargetAddress,
            handleDeposit,
            handleWithdraw
        } as ActionButtonActions
    };
} 