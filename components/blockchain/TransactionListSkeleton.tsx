'use client';

import React from 'react';

/**
 * Skeleton loading component for the transaction list
 * Used as a fallback when transaction data is loading
 */
export default function TransactionListSkeleton() {
    // Create an array of 4 items to render 4 skeleton transaction items
    const skeletonItems = Array.from({ length: 4 }, (_, i) => i);

    return (
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
                {/* Title placeholder */}
                <div className="flex items-center gap-4">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                </div>

                {/* Button placeholder */}
                <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>

            {/* Grid of skeleton transaction items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative overflow-hidden">
                {skeletonItems.map((index) => (
                    <div
                        key={index}
                        className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-100 dark:border-gray-800 relative overflow-hidden"
                    >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent" />

                        {/* Transaction header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>

                        {/* Transaction details */}
                        <div className="space-y-2">
                            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>

                        {/* Transaction footer */}
                        <div className="mt-3 flex items-center justify-between">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 