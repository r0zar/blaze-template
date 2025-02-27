'use client';

import { PlusCircle, Loader2 } from "lucide-react";
import { useBlaze } from "@/contexts/blaze/BlazeContext";
import { AnimatePresence } from "framer-motion";
import TransactionItem from "./TransactionItem";
import BatchStatusIndicator from "./BatchStatusIndicator";

export default function TransactionList() {
    const {
        isWalletConnected,
        selectedTargetAddress,
        txRequests,
        executeTransfer,
        useLoadingResource,
        isMining,
        lastBatch
    } = useBlaze();

    // Use the loading resource to trigger Suspense
    useLoadingResource('transactions');

    // Check if the last batch had an error (no txId means it failed)
    const lastBatchFailed = lastBatch ? !lastBatch.txId : false;

    return (
        <div className="relative z-10" data-tour="transaction-list">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h3 className={`text-xl font-semibold ${isMining ? 'text-yellow-600 dark:text-yellow-400' : lastBatchFailed ? 'text-red-600 dark:text-red-400' : ''}`}>
                        {isMining ? (
                            <div className="flex items-center gap-2">
                                <span>Mining Batch</span>
                                <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                        ) : lastBatchFailed ? (
                            <div className="flex items-center gap-2">
                                <span>Last Batch Failed</span>
                            </div>
                        ) : (
                            'Blaze Mempool'
                        )}
                    </h3>
                    <BatchStatusIndicator />
                </div>
                <button
                    disabled={!isWalletConnected || isMining}
                    onClick={() => {
                        if (!isWalletConnected) return;
                        executeTransfer(1000000);
                    }}
                    className={`px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-800 text-white hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2 ${(!isWalletConnected || isMining) && 'opacity-50 cursor-not-allowed'}`}
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
                {txRequests.length === 0 ? (
                    <div className="col-span-full p-6 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                        <PlusCircle className="w-8 h-8 mx-auto opacity-50 mb-2" />
                        <p>No pending transactions</p>
                        <p className="text-xs mt-1">
                            Send a transaction to see it appear here
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {txRequests.map((tx, index) => (
                            <TransactionItem
                                key={`tx-${index}`}
                                tx={tx.transfer || tx}
                                index={index}
                                hasError={lastBatchFailed && index < (lastBatch?.batchSize || 0)}
                            />
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
} 