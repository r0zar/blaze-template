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
} from "lucide-react";

function ActionButtons() {

    const [txRequests, setTxRequests] = useState<Transaction[]>([]);
    const [balances, setBalances] = useState<any>({ 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS': 0, 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0ZEZPJ': 0 });
    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [nextBatchTime, setNextBatchTime] = useState<number>(30); // 30 second batches
    const [isSettling, setIsSettling] = useState(false);
    const [lastSettlement, setLastSettlement] = useState<{ batchSize: number; timestamp: number } | null>(null);

    // Function to settle batch
    const settleBatch = async () => {
        try {
            setIsSettling(true);
            const response = await fetch('/api/settle', { method: 'POST' });
            const result = await response.json();
            if (!result.success) {
                console.error('Failed to settle batch:', result.message);
            } else {
                setLastSettlement({
                    batchSize: result.batchSize,
                    timestamp: result.timestamp
                });
                // Set message for toast notification
                setMessage(`All transactions have been settled on-chain`);
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
                try {
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
                            setTimeout(() => setMessage(null), 5000);
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                    setIsLoading(false);
                }
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
        if (isSettling) return 'Settling...';
        if (lastSettlement && Date.now() - lastSettlement.timestamp < 2000) {
            return `Settled ${lastSettlement.batchSize} transactions`;
        }
        return `${seconds}s`;
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
                        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 min-w-[300px] max-w-[90vw]"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-black/5 backdrop-blur-md rounded-xl" />
                            <div className="p-4 bg-gradient-to-r from-purple-50/80 via-purple-50/80 to-purple-50/80 dark:from-purple-900/30 dark:via-purple-900/20 dark:to-purple-900/10 rounded-xl text-sm shadow-lg border border-purple-200 dark:border-purple-800 relative">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 via-purple-100 to-purple-100/50 dark:from-purple-900/70 dark:via-purple-900/50 dark:to-purple-900/30 flex items-center justify-center">
                                        <ArrowRightLeft className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-purple-900 dark:text-purple-100">Batch Settled</div>
                                        <div className="text-purple-600/80 dark:text-purple-300/80">{message}</div>
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
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Live Updates • {txRequests.length} Pending Tx{txRequests.length !== 1 ? 's' : ''}
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(balances).map(([address, balance]) => (
                        <div
                            key={address}
                            className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-100 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-purple-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-purple-900/30 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet Address</div>
                                    <div className="text-sm font-mono truncate" title={address}>{formatAddress(address)}</div>
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Balance</div>
                                <div className="text-xl font-semibold">{Number(balance).toLocaleString()} WELSH</div>
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
                        className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg group"
                        onClick={() => blaze.connectWallet()}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-purple-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Connect Wallet</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Stacks wallet to get started</p>
                    </button>

                    <button
                        className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg group"
                        onClick={() => blaze.transfer({ amount: 1, to: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS' })}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-purple-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowRightLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Transfer</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Send WELSH tokens to another address</p>
                    </button>

                    <button
                        className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg group"
                        onClick={() => blaze.deposit(1)}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-purple-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Deposit</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Deposit tokens into the subnet</p>
                    </button>

                    <button
                        className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg group"
                        onClick={() => blaze.withdraw(1)}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-purple-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
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
                        <h3 className="text-xl font-semibold">Recent Transactions (Simulated)</h3>
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isSettling
                            ? 'bg-purple-200/50 dark:bg-purple-800/30 border-purple-300 dark:border-purple-700'
                            : 'bg-purple-100/50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${isSettling
                                ? 'bg-purple-600 animate-ping'
                                : 'bg-purple-500 animate-pulse'
                                }`} />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                Next batch in {formatCountdown(nextBatchTime)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                const newNonce = Date.now();
                                const dummyTxRequest = {
                                    amount: 1,
                                    to: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0ZEZPJ',
                                    signer: blaze.getWalletAddress() || 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
                                    nonce: newNonce,
                                    signature: '0x1234567890abcdef'
                                } as const;

                                // Send to API
                                console.log('Sending test transaction:', dummyTxRequest);
                                const response = await fetch('/api/process', {
                                    method: 'POST',
                                    body: JSON.stringify(dummyTxRequest)
                                });
                                const result = await response.json();
                                console.log('Transaction response:', result);
                            } catch (error) {
                                console.error('Error:', error);
                                alert('Failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                            }
                        }}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 text-white hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                        Create Test Transaction
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
                                    className="p-3 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-100 to-purple-100 dark:from-red-900/50 dark:to-purple-900/50 flex items-center justify-center">
                                            <ArrowRightLeft className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Transfer</span>
                                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-red-100/50 to-purple-100/50 dark:from-red-900/30 dark:to-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
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
                                        <span className="font-medium">{(tx as any).amount || 0} WELSH</span>
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
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="col-span-full p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
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