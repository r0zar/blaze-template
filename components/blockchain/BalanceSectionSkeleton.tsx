'use client';

import React from 'react';
import BalanceCardSkeleton from './BalanceCardSkeleton';

/**
 * Skeleton loading component for the entire balance section
 * Displays multiple card skeletons in a grid layout
 */
export default function BalanceSectionSkeleton() {
    // Create an array of 6 items to render 6 skeleton cards
    const skeletonCards = Array.from({ length: 6 }, (_, i) => i);

    return (
        <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10">
            <div className="flex items-center justify-between mb-6">
                {/* Section title placeholder */}
                <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded" />

                {/* Controls placeholder */}
                <div className="flex items-center gap-3">
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>

            {/* Grid of skeleton cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {skeletonCards.map((index) => (
                    <BalanceCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
} 