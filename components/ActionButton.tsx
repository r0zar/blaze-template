'use client';

import blaze, { Transaction } from "blaze-sdk";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowUpRight,
    Wallet,
    ArrowDownLeft,
    ArrowRightLeft,
    Loader2,
    PlusCircle,
    LogOut,
    ExternalLink,
} from "lucide-react";
import FloatingElements from "./FloatingElements";
import PendingBalanceAnimation from "./PendingBalanceAnimation";
import ExplorerLink from "./ExplorerLink";

function ActionButtons() {

    const [txRequests, setTxRequests] = useState<Transaction[]>([]);
    const [balances, setBalances] = useState<any>({ 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS': 0, 'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ': 0 });
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [nextBatchTime, setNextBatchTime] = useState(30);
    const [isSettling, setIsSettling] = useState(false);
    const [lastSettlement, setLastSettlement] = useState<{
        batchSize: number;
        timestamp: number;
        txId?: string;
    } | null>(null);
    const [transactionCounter, setTransactionCounter] = useState(0);
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [selectedTargetAddress, setSelectedTargetAddress] = useState<string | null>(null);
    const [messageTitle, setMessageTitle] = useState<string | null>(null);
    const [pendingBalanceChanges, setPendingBalanceChanges] = useState<{ [address: string]: boolean }>({});

    // Log the initial default balances
    useEffect(() => {
        console.log('Initial default balances:', Object.keys(balances));
    }, []);

    // refresh balances on load
    useEffect(() => {
        // Check if wallet is connected on component mount
        const walletConnected = blaze.isWalletConnected();
        setIsWalletConnected(walletConnected);

        if (walletConnected) {
            fetch('/api/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: blaze.getWalletAddress() })
            });
        }
    }, [blaze.signer]);

    // Function to trigger transaction success animation
    const triggerSuccessAnimation = () => {
        setTransactionCounter(prev => prev + 1);
    };

    // Function to handle pending balance state
    const handlePendingBalanceChange = (address: string) => {
        setPendingBalanceChanges(prev => ({
            ...prev,
            [address]: true
        }));

        // After 60 seconds, the PendingBalanceAnimation component will call onComplete
    };

    // Function to clear pending balance state
    const clearPendingBalanceChange = (address: string) => {
        setPendingBalanceChanges(prev => {
            const newState = { ...prev };
            delete newState[address];
            return newState;
        });
    };

    // Function to handle wallet connection toggle with improved error handling
    const toggleWalletConnection = async () => {
        try {
            if (isWalletConnected) {
                // Disconnect wallet
                const address = blaze.getWalletAddress();
                blaze.disconnectWallet();
                setIsWalletConnected(false);
                setMessage("Wallet disconnected successfully");
                setMessageTitle("Wallet disconnected");
                setTimeout(() => setMessage(null), 5000);

                // Track wallet disconnection
                try {
                    await fetch('/api/wallet/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            address,
                            action: 'disconnect'
                        })
                    });
                } catch (error) {
                    console.error('Error tracking wallet disconnection:', error);
                }
            } else {
                // Connect wallet with more robust error handling
                try {
                    const address = await blaze.connectWallet();
                    if (address) {
                        console.log(`Wallet connected: ${address}`);
                        setIsWalletConnected(true);
                        setMessage("Wallet connected successfully");
                        setMessageTitle("Wallet connected");
                        setTimeout(() => setMessage(null), 5000);

                        // Initialize balance for the new wallet if it doesn't exist
                        setBalances((prevBalances: Record<string, number>) => {
                            const updatedBalances = { ...prevBalances };
                            if (!updatedBalances[address]) {
                                updatedBalances[address] = 0;
                            }
                            console.log('Updated balances with connected wallet:', Object.keys(updatedBalances));
                            return updatedBalances;
                        });

                        // Refresh balances immediately after connection
                        try {
                            const response = await fetch('/api/refresh', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user: address })
                            });

                            if (response.ok) {
                                console.log('Balance refresh successful after wallet connection');
                            } else {
                                console.warn('Balance refresh returned non-OK response:', response.status);
                            }
                        } catch (refreshError) {
                            console.error('Error refreshing balances after connection:', refreshError);
                        }

                        // Track wallet connection
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
                            console.log('Wallet tracking successful');
                        } catch (error) {
                            console.error('Error tracking wallet connection:', error);
                        }
                    } else {
                        console.error('Connect wallet returned empty address');
                        setMessageTitle("Connection Error");
                        setMessage("Failed to connect wallet - no address returned");
                    }
                } catch (walletError) {
                    console.error('Error connecting wallet:', walletError);
                    setMessageTitle("Wallet Connection Error");
                    setMessage("Failed to connect wallet. Please try again.");
                }
            }
        } catch (error) {
            console.error('Unexpected error in toggleWalletConnection:', error);
            setMessageTitle("Wallet Error");
            setMessage("An unexpected error occurred with your wallet.");
        }
    };

    // Function to settle batch
    // const settleBatch = async () => {
    //     try {
    //         setIsSettling(true);
    //         const response = await fetch('/api/settle', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ user: blaze.getWalletAddress() })
    //         });

    //         if (!response.ok) {
    //             // Handle specific error codes
    //             if (response.status === 409) {
    //                 setMessageTitle(`Batch Processing In Progress`);
    //                 setMessage(`A batch is already being processed`);
    //             } else if (response.status === 423) {
    //                 setMessageTitle(`Batch Lock Error`);
    //                 setMessage(`Could not acquire lock for batch processing`);
    //             } else if (response.status === 400) {
    //                 setMessageTitle(`No Transactions`);
    //                 setMessage(`There are no transactions in the queue to settle`);
    //             } else {
    //                 setMessageTitle(`Settlement Failed`);
    //                 setMessage(`Failed to settle batch: ${response.statusText}`);
    //             }
    //             setTimeout(() => setMessage(null), 5000);
    //             console.error('Failed to settle batch:', response.statusText);
    //         } else {
    //             const data = await response.json();
    //             console.log('Settlement data:', data);

    //             // Update settlement information
    //             setLastSettlement({
    //                 batchSize: data.batchSize || 0,
    //                 timestamp: Date.now(),
    //                 txId: data.txid
    //             });

    //             // Set message for toast notification
    //             setMessageTitle(`Batch settled`);
    //             setMessage(data.message || `Transactions have been batched and broadcast on-chain`);

    //             // Trigger success animation
    //             triggerSuccessAnimation();

    //             // Clear message after 5 seconds
    //             setTimeout(() => setMessage(null), 5000);
    //         }
    //     } catch (error) {
    //         console.error('Error settling batch:', error);
    //         setMessageTitle(`Settlement Error`);
    //         setMessage(`An error occurred while settling the batch`);
    //         setTimeout(() => setMessage(null), 5000);
    //     } finally {
    //         setIsSettling(false);
    //     }
    // };

    // Update component to better handle timer updates
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 10; // Increase max attempts
        const reconnectDelay = 1000; // Shorter initial delay
        let heartbeatInterval: NodeJS.Timeout | null = null;

        const connectSSE = () => {
            console.log('%c[SSE] Connecting to SSE stream...', 'color: blue; font-weight: bold');

            // Close any existing connection
            if (eventSource) {
                eventSource.close();
            }

            // Add timestamp to URL to prevent caching
            eventSource = new EventSource(`/api/subscribe?t=${Date.now()}`);

            eventSource.onopen = () => {
                console.log('%c[SSE] Connection opened successfully', 'color: green; font-weight: bold');
                setIsLoading(false);
                reconnectAttempts = 0; // Reset attempts on successful connection

                // Send immediate refresh request to get latest data
                fetch('/api/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ force: true })
                }).catch(err => console.error('Error sending refresh request:', err));

                // Set up heartbeat to periodically update wallet activity if connected
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                heartbeatInterval = setInterval(() => {
                    // Send heartbeat to update wallet last seen time
                    const address = blaze.getWalletAddress();
                    if (isWalletConnected && address) {
                        fetch('/api/wallet/track', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                address,
                                action: 'update',
                                balance: balances[address] || 0
                            })
                        }).catch(err => console.error('Error sending wallet heartbeat:', err));
                    }
                }, 60000); // Update every minute
            };

            eventSource.onerror = (error) => {
                console.error('%c[SSE] Connection error:', 'color: red; font-weight: bold', error);

                if (eventSource) {
                    eventSource.close();

                    // Try to reconnect with exponential backoff if under max attempts
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
                        console.log(`%c[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`, 'color: orange');

                        // Also trigger a manual refresh of balances
                        if (isWalletConnected) {
                            const address = blaze.getWalletAddress();
                            if (address) {
                                fetch('/api/refresh', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ user: address })
                                }).catch(err => console.error('Error refreshing balances during reconnect:', err));
                            }
                        }

                        setTimeout(connectSSE, delay);
                    } else {
                        console.error(`%c[SSE] Failed to reconnect after ${maxReconnectAttempts} attempts`, 'color: red; font-weight: bold');
                        setMessageTitle("Connection Error");
                        setMessage("Failed to connect to server. Please refresh the page.");
                    }
                }
            };

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const dataKeys = Object.keys(data);
                    console.log('%c[SSE] Event received with keys:', 'color: purple', dataKeys.join(', '));

                    // Debug timer updates with timestamps for better traceability
                    if (data.nextBatchTime !== undefined) {
                        const now = new Date();
                        console.log(`%c[TIMER ${now.toISOString()}] Update: ${data.nextBatchTime}s`, 'color: blue');
                        setNextBatchTime(data.nextBatchTime);
                    }

                    // Handle batch processing status
                    if (data.isProcessingBatch !== undefined) {
                        console.log(`%c[BATCH] Processing state: ${data.isProcessingBatch}`, 'color: orange');
                        setIsSettling(data.isProcessingBatch);
                    }

                    // Check for settlement events
                    if (data.settlement) {
                        console.log('%c[SETTLEMENT] Event received:', 'color: green; font-weight: bold', data.settlement);

                        // Update settlement information
                        setLastSettlement({
                            batchSize: data.settlement.batchSize,
                            timestamp: data.settlement.timestamp,
                            txId: data.settlement.txid
                        });

                        // Set message for toast notification
                        setMessageTitle(`Batch mined`);
                        setMessage(`${data.settlement.batchSize} transactions have been batched and broadcast on-chain`);

                        // Trigger success animation
                        triggerSuccessAnimation();

                        // Clear message after 5 seconds
                        setTimeout(() => setMessage(null), 5000);
                    }

                    // Update balances - with extensive logging
                    if (data.balances) {
                        const balanceKeys = Object.keys(data.balances);
                        console.log('%c[BALANCES] Received from server:', 'color: green', balanceKeys);

                        if (balanceKeys.length === 0) {
                            console.warn('%c[BALANCES] Warning: Empty balances object received', 'color: orange');
                        }

                        // Make sure we don't lose any addresses that might be in the current state
                        setBalances((prevBalances: Record<string, number>) => {
                            const prevKeys = Object.keys(prevBalances);
                            console.log('%c[BALANCES] Previous keys:', 'color: blue', prevKeys);

                            // Combine previous and new balances to ensure nothing is lost
                            const combinedBalances = { ...prevBalances };

                            // Update with new values from server
                            for (const address of balanceKeys) {
                                combinedBalances[address] = data.balances[address];
                            }

                            // Debug log the final balances
                            const finalKeys = Object.keys(combinedBalances);
                            console.log('%c[BALANCES] Updated with keys:', 'color: green', finalKeys);
                            console.log('%c[BALANCES] Values:', 'color: green', JSON.stringify(combinedBalances));
                            return combinedBalances;
                        });
                    }

                    // Update transaction queue with better logging
                    if (data.queue) {
                        console.log(`%c[QUEUE] Received ${data.queue.length} transactions`, 'color: purple',
                            data.queue.length > 0 ? data.queue : '');
                        setTxRequests(data.queue);
                    }

                    // Exit loading state once we've received data
                    if (isLoading) {
                        setIsLoading(false);
                    }
                } catch (error) {
                    console.error('%c[SSE] Error parsing data:', 'color: red', error);
                    console.error('Raw event data:', event.data);
                }
            };
        };

        // Immediately connect to SSE
        connectSSE();

        // Clean up function to close the EventSource
        return () => {
            if (eventSource) {
                console.log('%c[SSE] Closing connection', 'color: orange');
                eventSource.close();
            }
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
            }
        };
    }, []);

    // Add this new useEffect to log timer updates outside of the SSE connection
    useEffect(() => {
        console.log(`Timer state updated in component: ${nextBatchTime}s`);
    }, [nextBatchTime]);

    // Helper function to format timestamp
    const formatTimestamp = (nonce: number | string) => {
        const timestamp = typeof nonce === 'string' ? parseInt(nonce) : nonce;
        if (isNaN(timestamp)) return 'Pending';
        return new Date(timestamp).toLocaleTimeString();
    };

    // Helper function to format address
    const formatAddress = (address: string) => {
        if (!address) return '---';
        return `${address.slice(0, 8)}...${address.slice(-4)}`;
    };

    // Helper function to format countdown - make it more responsive to timer changes
    const formatCountdown = (seconds: number) => {
        if (isSettling) return 'Mining transaction batch...';
        if (lastSettlement && Date.now() - lastSettlement.timestamp < 2000) {
            return `Mined batch of ${lastSettlement.batchSize} transactions`;
        }

        // Just display the timer value with one decimal place
        return `Next batch in ${seconds.toFixed(1)}s`;
    };

    // Log timer updates with timestamp for debugging
    useEffect(() => {
        const now = new Date();
        console.log(`[${now.toISOString()}] Timer updated to: ${nextBatchTime}s`);
    }, [nextBatchTime]);

    // Helper function to get the pill color based on state
    const getPillClasses = () => {
        const baseClasses = 'px-3 py-1 rounded-full';
        if (isSettling) {
            return `${baseClasses} bg-yellow-200/50 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-700`;
        }
        if (lastSettlement && Date.now() - lastSettlement.timestamp < 2000) {
            return `${baseClasses} bg-green-200/50 dark:bg-green-800/30 border border-green-300 dark:border-green-700`;
        }
        return `${baseClasses} bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800`;
    };

    // Helper function to get the indicator dot color based on state
    const getIndicatorClasses = () => {
        if (isSettling) {
            return 'bg-yellow-600 animate-ping';
        }
        if (lastSettlement && Date.now() - lastSettlement.timestamp < 2000) {
            return 'bg-green-500';
        }
        return 'bg-yellow-500 animate-pulse';
    };

    // Force UI update every second to ensure countdown display is accurate
    const [, setForceUpdate] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setForceUpdate(prev => prev + 1);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Add these new states and effects for smooth timer display
    const [displayTimer, setDisplayTimer] = useState(nextBatchTime);
    const [lastServerUpdate, setLastServerUpdate] = useState(Date.now());

    // Update last server update timestamp when the server timer changes
    useEffect(() => {
        setDisplayTimer(nextBatchTime);
        setLastServerUpdate(Date.now());
        console.log(`Received server timer update: ${nextBatchTime}s`);
    }, [nextBatchTime]);

    // Use client-side interpolation to show smoother countdown
    useEffect(() => {
        // Only run interpolation if not settling and timer is greater than zero
        if (isSettling || nextBatchTime <= 0) return;

        // Update display timer more frequently (every 100ms)
        const interpolationInterval = setInterval(() => {
            setDisplayTimer(prevDisplay => {
                // Calculate time since last server update
                const elapsed = (Date.now() - lastServerUpdate) / 1000;

                // Estimate what the actual timer should be by linearly interpolating
                // Use the original timer speed of 0.5 seconds per real second
                const estimatedTimer = Math.max(0, nextBatchTime - (elapsed * 0.5));

                // Ensure we don't go below zero and round to one decimal place
                return Math.max(0, parseFloat(estimatedTimer.toFixed(1)));
            });
        }, 100); // Update every 100ms for animation

        return () => clearInterval(interpolationInterval);
    }, [nextBatchTime, lastServerUpdate, isSettling]);

    // Function to handle selecting a target address
    const selectTargetAddress = (address: string) => {
        // Don't select your own address as target
        if (isWalletConnected && address === blaze.getWalletAddress()) {
            return;
        }

        setSelectedTargetAddress(address);
        setMessage(`Selected ${formatAddress(address)} as transfer target`);
        setMessageTitle(`Transfer target updated`);
        setTimeout(() => setMessage(null), 3000);
    };

    // Helper function to get the balance card classes based on selection state
    const getBalanceCardClasses = (address: string) => {
        const baseClasses = "p-4 rounded-lg bg-white dark:bg-black/40 border transition-colors cursor-pointer";

        // If this is the user's own address, make it non-selectable but visually distinct
        if (isWalletConnected && address === blaze.getWalletAddress()) {
            return `${baseClasses} border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30`;
        }

        // If this address is selected, highlight it
        if (selectedTargetAddress === address) {
            return `${baseClasses} border-yellow-500 dark:border-yellow-500 ring-2 ring-yellow-500/30`;
        }

        // Default state
        return `${baseClasses} border-gray-100 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500`;
    };

    // Helper function to get a random target address that is not the signer's address
    const getRandomTargetAddress = () => {
        // Get all addresses except the signer's address
        const availableAddresses = Object.keys(balances).filter(address =>
            !isWalletConnected || address !== blaze.getWalletAddress()
        );

        // If no other addresses are available, use a default address
        if (availableAddresses.length === 0) {
            return 'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ';
        }

        // Pick a random address from the available addresses
        const randomIndex = Math.floor(Math.random() * availableAddresses.length);
        const randomAddress = availableAddresses[randomIndex];

        // Show a message about the randomly selected address
        setMessageTitle("Random target selected");
        setMessage(`Randomly selected ${formatAddress(randomAddress)} as transfer target`);
        setTimeout(() => setMessage(null), 3000);

        return randomAddress;
    };

    // Function to handle deposit with pending state
    const handleDeposit = () => {
        if (isWalletConnected) {
            const address = blaze.getWalletAddress();
            blaze.deposit(10000000);
            handlePendingBalanceChange(address);
        }
    };

    // Function to handle withdraw with pending state
    const handleWithdraw = () => {
        if (isWalletConnected) {
            const address = blaze.getWalletAddress();
            blaze.withdraw(5000000);
            handlePendingBalanceChange(address);
        }
    };

    return (
        <div className="max-w-screen-2xl mx-auto">

            {/* Toast Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-2 right-2 sm:top-10 sm:right-16 z-50 min-w-[300px] max-w-[90vw]"
                    >
                        <div className="relative backdrop-blur-xl">
                            <div className="absolute inset-0 bg-black/5  rounded-xl" />
                            <div className="p-4 bg-gradient-to-r from-yellow-50/80 via-yellow-50/80 to-yellow-50/80 dark:from-yellow-900/30 dark:via-yellow-900/20 dark:to-yellow-900/10 rounded-xl text-sm shadow-lg border border-yellow-200 dark:border-yellow-800 relative text-center">
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-100 via-yellow-100 to-yellow-100/50 dark:from-yellow-900/70 dark:via-yellow-900/50 dark:to-yellow-900/30 flex items-center justify-center">
                                        <ArrowRightLeft className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-yellow-900 dark:text-yellow-100 text-left">{messageTitle}</div>
                                        <div className="text-yellow-600/80 dark:text-yellow-300/80">{message}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balances Section */}
            <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10" data-tour="balances-section">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Subnet Balances</h2>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Live Updates • {txRequests.length} Pending Tx{txRequests.length !== 1 ? 's' : ''}
                        </div>
                        <ExplorerLink
                            variant="badge"
                            size="sm"
                            label="View Contract"
                            data-tour="explorer-link"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="wallet-cards">
                    {Object.entries(balances).map(([address, balance]) => (
                        <div
                            key={address}
                            className={getBalanceCardClasses(address)}
                            onClick={() => selectTargetAddress(address)}
                            title={isWalletConnected && address === blaze.getWalletAddress() ?
                                "This is your subnet address and its balances" :
                                `Click to set ${formatAddress(address)} as transfer target`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                                        Wallet Address {isWalletConnected && address === blaze.getWalletAddress()}
                                    </div>
                                    <div className="text-xs font-mono truncate" title={address}>
                                        {formatAddress(address)}
                                        {selectedTargetAddress === address && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                Selected
                                            </span>
                                        )}
                                        {isWalletConnected && address === blaze.getWalletAddress() && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                My Wallet
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Balance</div>
                                <div className="text-xl font-semibold flex items-center">
                                    {Number(balance as number / 10 ** 6).toLocaleString()} WELSH
                                    {pendingBalanceChanges[address] && (
                                        <PendingBalanceAnimation
                                            isActive={true}
                                            onComplete={() => clearPendingBalanceChange(address)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions Section */}
            <div className="mb-12 relative z-10" data-tour="action-buttons">
                <h3 className="text-xl font-semibold mb-6">Subnet Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg ${isWalletConnected ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800' : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800'} hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={toggleWalletConnection}
                        data-tour="wallet-connect"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full ${isWalletConnected ? 'bg-gradient-to-br from-red-100 via-red-100 to-red-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-red-900/30' : 'bg-gradient-to-br from-green-100 via-green-100 to-green-100/50 dark:from-green-900/70 dark:via-green-900/50 dark:to-green-900/30'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                {isWalletConnected ? (
                                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                                ) : (
                                    <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                )}
                            </div>
                            <span className="font-semibold">{isWalletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isWalletConnected
                                ? `Connected: ${formatAddress(blaze.getWalletAddress())}`
                                : 'Connect your Stacks wallet to get started'}
                        </p>
                    </button>

                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={() => {
                            const targetAddress = selectedTargetAddress || getRandomTargetAddress();
                            blaze.transfer({ amount: 1000000, to: targetAddress });
                            // Trigger success animation
                            triggerSuccessAnimation();
                        }}
                        data-tour="transfer-button"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowRightLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Transfer</span>
                            {!selectedTargetAddress && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 animate-pulse">
                                    Random
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedTargetAddress ?
                                `Send WELSH to ${formatAddress(selectedTargetAddress)}` :
                                'Send WELSH tokens to a random address'}
                        </p>
                    </button>

                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={handleDeposit}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Deposit</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Deposit tokens into the subnet</p>
                    </button>

                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={handleWithdraw}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Withdraw</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Withdraw tokens from the subnet</p>
                    </button>
                </div>
            </div>

            {/* Transactions Section */}
            <div className="relative z-10" data-tour="transaction-list">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-semibold">Recent Transactions</h3>
                        <div className={`flex items-center gap-2 ${getPillClasses()}`} data-tour="batch-timer">
                            <div className={`w-2 h-2 rounded-full ${getIndicatorClasses()}`} />
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                {formatCountdown(displayTimer)}
                            </span>
                        </div>
                        {lastSettlement && lastSettlement.txId && Date.now() - lastSettlement.timestamp < 10000 && (
                            <ExplorerLink
                                txId={lastSettlement.txId}
                                variant="badge"
                                size="sm"
                                label="View Batch"
                            />
                        )}
                    </div>
                    <button
                        disabled={!isWalletConnected}
                        onClick={async () => {
                            if (!isWalletConnected) return;
                            const targetAddress = selectedTargetAddress || getRandomTargetAddress();
                            await blaze.transfer({ amount: 1000000, to: targetAddress });
                            // Trigger success animation
                            triggerSuccessAnimation();
                        }}
                        className={`px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-800 text-white hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2 ${!isWalletConnected && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <span>Send Micro Transaction</span>
                        {!selectedTargetAddress && isWalletConnected && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 animate-pulse">
                                Random
                            </span>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {isLoading ? (
                        <div className="col-span-full p-6 text-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin opacity-50 mb-2" />
                            <p>Loading transactions...</p>
                        </div>
                    ) : txRequests.length > 0 ? (
                        <AnimatePresence mode="popLayout" initial={false}>
                            {txRequests.map((t: Transaction) => t.transfer).map((tx: any, index: any) => (
                                <motion.div
                                    key={`${tx.nonce}-${index}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="backdrop-blur-lg p-3 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-100 to-yellow-100 dark:from-red-900/50 dark:to-yellow-900/50 flex items-center justify-center">
                                            <ArrowRightLeft className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Transfer</span>
                                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-red-100/50 to-yellow-100/50 dark:from-red-900/30 dark:to-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-medium">
                                                    Pending
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {formatTimestamp(tx.nonce)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">Amount</span>
                                        <span className="font-medium">{(tx as any).amount / 10 ** 6 || 0} WELSH</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded bg-gray-50 dark:bg-black/20">
                                            <ArrowUpRight className="w-3 h-3 text-gray-400" />
                                            <span className="font-mono truncate" title={(tx as any).signer}>
                                                {formatAddress((tx as any).signer)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded bg-gray-50 dark:bg-black/20">
                                            <ArrowDownLeft className="w-3 h-3 text-gray-400" />
                                            <span className="font-mono truncate" title={(tx as any).to}>
                                                {formatAddress((tx as any).to)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <ExplorerLink
                                            variant="text"
                                            size="sm"
                                            label="View on Explorer"
                                            txId={(tx as any).txId}
                                            showIcon={false}
                                            className="text-[10px] text-gray-500 hover:text-yellow-600"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="backdrop-blur-lg col-span-full p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <div className="mb-2">
                                <PlusCircle className="w-8 h-8 mx-auto opacity-50" />
                            </div>
                            <p>No transactions in queue</p>
                            <p className="text-xs mt-1">Create a test transaction to see it in action</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ActionButtons;