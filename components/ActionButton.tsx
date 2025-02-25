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
    const [nextBatchTime, setNextBatchTime] = useState<number>(30); // 30 second batches
    const [isSettling, setIsSettling] = useState(false);
    const [lastSettlement, setLastSettlement] = useState<{ batchSize: number; timestamp: number; txId?: string } | null>(null);
    const [transactionCounter, setTransactionCounter] = useState(0);
    const [isWalletConnected, setIsWalletConnected] = useState(false);
    const [selectedTargetAddress, setSelectedTargetAddress] = useState<string | null>(null);
    const [messageTitle, setMessageTitle] = useState<string | null>(null);
    const [pendingBalanceChanges, setPendingBalanceChanges] = useState<{ [address: string]: boolean }>({});

    // refresh balances on load
    useEffect(() => {
        // Check if wallet is connected on component mount
        const walletConnected = blaze.isWalletConnected();
        setIsWalletConnected(walletConnected);

        if (walletConnected) {
            const address = blaze.getWalletAddress();

            // Initialize balance for the wallet if it doesn't exist
            setBalances((prevBalances: Record<string, number>) => {
                if (!prevBalances[address]) {
                    return { ...prevBalances, [address]: 0 };
                }
                return prevBalances;
            });

            fetch('/api/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: address })
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

    // Function to handle wallet connection toggle
    const toggleWalletConnection = async () => {
        if (isWalletConnected) {
            // Disconnect wallet
            blaze.disconnectWallet();
            setIsWalletConnected(false);
            setMessage("Wallet disconnected successfully");
            setMessageTitle("Wallet disconnected");
            setTimeout(() => setMessage(null), 5000);
        } else {
            // Connect wallet
            const address = await blaze.connectWallet();
            if (address) {
                setIsWalletConnected(true);
                setMessage("Wallet connected successfully");
                setMessageTitle("Wallet connected");
                setTimeout(() => setMessage(null), 5000);

                // Initialize balance for the new wallet if it doesn't exist
                setBalances((prevBalances: Record<string, number>) => {
                    if (!prevBalances[address]) {
                        return { ...prevBalances, [address]: 0 };
                    }
                    return prevBalances;
                });

                // Refresh balances
                fetch('/api/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: address })
                });
            }
        }
    };

    // Function to settle batch
    const settleBatch = async () => {
        try {
            setIsSettling(true);
            const response = await fetch('/api/settle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: blaze.getWalletAddress() })
            });
            if (!response.ok) {
                console.error('Failed to settle batch:', response.statusText);
            } else {
                const data = await response.json();
                console.log('Settlement data:', data);
                setLastSettlement({
                    batchSize: data.batchSize,
                    timestamp: data.timestamp,
                    txId: data.txid
                });
                // Set message for toast notification
                setMessageTitle(`Batch mined`);
                setMessage(`All transactions have been batched and broadcast on-chain`);
                // Trigger success animation
                triggerSuccessAnimation();
                // Clear message after 5 seconds
                setTimeout(() => setMessage(null), 5000);
            }
        } catch (error) {
            console.error('Error settling batch:', error);
        } finally {
            setIsSettling(false);
        }
    };

    useEffect(() => {
        fetch('/api/subscribe')
            .then(response => response.body)
            .then(async body => {
                const reader = body?.getReader();
                while (true) {
                    const { done, value } = await reader?.read() || {};
                    if (done) {
                        console.log('Stream complete');
                        break;
                    }
                    const rawMessage = new TextDecoder().decode(value);
                    const message = JSON.parse(rawMessage.split('data: ')[1]);

                    // Handle settlement notifications
                    if (message.settlement) {
                        setLastSettlement(message.settlement);
                        setIsSettling(false);
                    }

                    // Extract queue from the correct path
                    const queue = message.queue || [];

                    // Ensure we're getting an array and it's not empty
                    console.log('Pending transactions:', queue.length);
                    if (Array.isArray(queue)) {
                        setTxRequests(queue);
                        setIsLoading(false);
                    } else {
                        console.warn('Queue is not an array:', queue);
                    }

                    // Update balances
                    if (message.balances) {
                        setBalances((balances: any) => ({ ...balances, ...message.balances }));
                    }

                    // Handle notification message
                    if (message.text) {
                        setMessage(message.text);
                        setMessageTitle("Transaction submitted");
                        setTimeout(() => setMessage(null), 5000);
                    }
                }
            }).catch(error => {
                console.error('Error processing message:', error);
                setIsLoading(false);
            });

        // Countdown timer effect
        const interval = setInterval(() => {
            setNextBatchTime(prev => {
                if (prev <= 0) {
                    // Trigger batch settlement
                    settleBatch();
                    return 30; // Reset to 30 seconds
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

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

    // Helper function to format countdown
    const formatCountdown = (seconds: number) => {
        if (isSettling) return 'Mining batch...';
        if (lastSettlement && Date.now() - lastSettlement.timestamp < 2000) {
            return `Mined batch of ${lastSettlement.batchSize} transactions`;
        }
        return `${seconds}s`;
    };

    // Helper function to get the pill color based on state
    const getPillClasses = () => {
        if (isSettling) {
            return 'bg-yellow-200/50 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-700';
        }
        if (lastSettlement && Date.now() - lastSettlement.timestamp < 2000) {
            return 'bg-green-200/50 dark:bg-green-800/30 border border-green-300 dark:border-green-700';
        }
        return 'bg-yellow-100/50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800';
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
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
            <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10">
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
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <div className="mb-12 relative z-10">
                <h3 className="text-xl font-semibold mb-6">Subnet Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg ${isWalletConnected ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800' : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800'} hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={toggleWalletConnection}
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
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-semibold">Recent Transactions</h3>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getPillClasses()}`}>
                            <div className={`w-2 h-2 rounded-full ${getIndicatorClasses()}`} />
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                {isSettling ? 'Mining transaction batch...' :
                                    lastSettlement && Date.now() - lastSettlement.timestamp < 2000 ?
                                        `Mined batch of ${lastSettlement.batchSize} transactions` :
                                        `Next batch in ${nextBatchTime}s`}
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
                        <span>Create Micro Transaction</span>
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