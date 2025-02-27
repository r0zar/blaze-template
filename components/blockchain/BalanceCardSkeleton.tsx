'use client';

import React from 'react';

/**
 * Skeleton loading component for balance cards with shimmer animation
 * Used as a fallback when balance data is loading
 */
export default function BalanceCardSkeleton() {
    return (
        <div className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

            {/* Header section */}
            <div className="flex items-center gap-3 mb-3">
                {/* Wallet icon placeholder */}
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />

                <div className="flex-1 min-w-0">
                    {/* Wallet label placeholder */}
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />

                    {/* Address placeholder */}
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>

            {/* Balance section */}
            <div className="flex items-baseline justify-between">
                {/* Balance label placeholder */}
                <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />

                {/* Balance amount placeholder */}
                <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        </div>
    );
} 