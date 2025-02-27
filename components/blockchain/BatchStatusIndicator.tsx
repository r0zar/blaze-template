'use client';

import { useBlaze } from '@/contexts/blaze/BlazeContext';
import ExplorerLink from '@/components/ExplorerLink';
import ClientExplorerLink from "@/components/ClientExplorerLink";
import { getStatusText } from "@/utils/formatters";
import { Loader2 } from "lucide-react";
import styles from './BatchStatusIndicator.module.css';

/**
 * Get CSS classes for the status pill based on current state
 * @param isMining Whether a batch is currently being settled
 * @param lastBatch Information about the last settlement
 * @returns CSS classes for the status pill
 */
const getPillClasses = (
    isMining: boolean,
    lastBatch: { batchSize: number; timestamp: number; txId?: string; } | null
): string => {
    const baseClasses = 'px-3 py-1 rounded-full';
    if (isMining) {
        return `${baseClasses} bg-yellow-200/50 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-700 ${styles.miningPill}`;
    }
    if (lastBatch && Date.now() - lastBatch.timestamp < 2000) {
        if (lastBatch.txId) {
            return `${baseClasses} bg-green-200/50 dark:bg-green-800/30 border border-green-300 dark:border-green-700`;
        } else {
            return `${baseClasses} bg-red-200/50 dark:bg-red-800/30 border border-red-300 dark:border-red-700`;
        }
    }
    return `${baseClasses} bg-gray-200/50 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700`;
};

/**
 * Get CSS classes for the status indicator based on current state
 * @param isMining Whether a batch is currently being settled
 * @param lastBatch Information about the last settlement
 * @param txRequestsLength Number of pending transactions
 * @returns CSS classes for the status indicator
 */
const getIndicatorClasses = (
    isMining: boolean,
    lastBatch: { batchSize: number; timestamp: number; txId?: string; } | null,
    txRequestsLength: number
): string => {
    if (isMining) {
        return 'bg-yellow-600 animate-ping';
    }
    if (lastBatch && Date.now() - lastBatch.timestamp < 2000) {
        if (lastBatch.txId) {
            return 'bg-green-500';
        } else {
            return 'bg-red-500';
        }
    }
    return txRequestsLength > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500';
};



export default function BatchStatusIndicator() {
    const {
        isMining,
        lastBatch,
        txRequests,
        connectionState
    } = useBlaze();

    return (
        <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${getPillClasses(isMining, lastBatch)} transition-all duration-300`} data-tour="batch-status">
                {isMining ? (
                    <div className="flex items-center gap-2">
                        <div className={styles.miningIcon}>
                            <Loader2 className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                        </div>
                        <span className={`text-sm font-medium text-yellow-700 dark:text-yellow-300 ${styles.miningText}`}>
                            Mining Batch...
                        </span>
                    </div>
                ) : (
                    <>
                        <div className={`w-2 h-2 rounded-full ${getIndicatorClasses(isMining, lastBatch, txRequests.length)}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {connectionState === 'connected' ?
                                getStatusText(isMining, lastBatch, txRequests.length) :
                                connectionState === 'connecting' ? 'Connecting...' :
                                    connectionState === 'error' ? 'Connection Error' :
                                        connectionState === 'disconnected' ? 'Disconnected' :
                                            'Initializing...'}
                        </span>
                    </>
                )}
            </div>
            {lastBatch && lastBatch.txId && Date.now() - lastBatch.timestamp < 10000 && (
                <ClientExplorerLink
                    txId={lastBatch.txId}
                    variant="badge"
                    size="sm"
                    label="View Batch"
                />
            )}
        </div>
    );
} 