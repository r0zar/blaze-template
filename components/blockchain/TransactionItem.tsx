'use client';

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, Loader2, AlertCircle } from "lucide-react";
import { formatAddress, formatTimestamp } from "@/utils/formatters";
import ExplorerLink from "@/components/ExplorerLink";
import { motion } from "framer-motion";
import { useBlaze } from "@/contexts/blaze/BlazeContext";
import styles from './TransactionItem.module.css';

interface TransactionItemProps {
    tx: any;
    index: number;
    hasError?: boolean;
}

export default function TransactionItem({ tx, index, hasError = false }: TransactionItemProps) {
    const { isMining } = useBlaze();

    // Determine the status of the transaction
    const getStatusClasses = () => {
        if (hasError) {
            return {
                border: 'border-red-500 dark:border-red-500',
                bg: 'bg-gradient-to-br from-red-300 to-red-500 dark:from-red-600 dark:to-red-800',
                text: 'text-red-600 dark:text-red-400',
                label: 'bg-gradient-to-r from-red-300 to-red-500 dark:from-red-600 dark:to-red-800 text-white dark:text-white',
                animation: styles.errorItem
            };
        }
        if (isMining) {
            return {
                border: 'border-yellow-500 dark:border-yellow-500',
                bg: 'bg-gradient-to-br from-yellow-300 to-yellow-500 dark:from-yellow-600 dark:to-yellow-800',
                text: 'text-yellow-600 dark:text-yellow-400',
                label: 'bg-gradient-to-r from-yellow-300 to-yellow-500 dark:from-yellow-600 dark:to-yellow-800 text-white dark:text-white ' + styles.miningLabel,
                animation: styles.miningItem
            };
        }
        return {
            border: 'hover:border-yellow-500 dark:hover:border-yellow-500',
            bg: 'bg-gradient-to-br from-red-100 to-yellow-100 dark:from-red-900/50 dark:to-yellow-900/50',
            text: 'text-yellow-600 dark:text-yellow-400',
            label: 'bg-gradient-to-r from-red-100/50 to-yellow-100/50 dark:from-red-900/30 dark:to-yellow-900/30 text-yellow-600 dark:text-yellow-400',
            animation: ''
        };
    };

    const statusClasses = getStatusClasses();

    return (
        <motion.div
            key={`${tx?.nonce}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className={`backdrop-blur-lg p-3 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 ${statusClasses.border} ${statusClasses.animation} transition-colors`}
        >
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full ${statusClasses.bg} flex items-center justify-center ${isMining ? styles.miningIcon : ''}`}>
                    {isMining ? (
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : hasError ? (
                        <AlertCircle className="w-3 h-3 text-white" />
                    ) : (
                        <ArrowRightLeft className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                    )}
                </div>
                <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Transfer</span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${statusClasses.label} font-medium`}>
                            {hasError ? 'Failed' : isMining ? 'Mining' : 'Pending'}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {formatTimestamp(tx?.nonce)}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500 dark:text-gray-400 text-xs">Amount</span>
                <span className="font-medium">{tx?.amount / 10 ** 6 || 0} WELSH</span>
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded bg-gray-50 dark:bg-black/20">
                    <ArrowUpRight className="w-3 h-3 text-gray-400" />
                    <span className="font-mono truncate" title={tx?.signer}>
                        {formatAddress(tx?.signer)}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded bg-gray-50 dark:bg-black/20">
                    <ArrowDownLeft className="w-3 h-3 text-gray-400" />
                    <span className="font-mono truncate" title={tx?.to}>
                        {formatAddress(tx?.to)}
                    </span>
                </div>
            </div>
            {isMining && (
                <div className="mt-2 pt-2 border-t border-yellow-200/30 dark:border-yellow-800/30">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-yellow-600 dark:text-yellow-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Mining transaction...</span>
                    </div>
                </div>
            )}
            {hasError && (
                <div className="mt-2 pt-2 border-t border-red-200/30 dark:border-red-800/30">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-red-600 dark:text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>Transaction failed</span>
                    </div>
                </div>
            )}
        </motion.div>
    );
} 