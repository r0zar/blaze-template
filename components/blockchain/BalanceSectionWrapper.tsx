'use client';

import React, { Suspense } from 'react';
import BalanceSection from './BalanceSection';
import BalanceSectionSkeleton from './BalanceSectionSkeleton';

/**
 * Wrapper component for BalanceSection that uses Suspense for loading state
 * Displays a skeleton loading animation while data is being fetched
 */
export default function BalanceSectionWrapper() {
    return (
        <Suspense fallback={<BalanceSectionSkeleton />}>
            <BalanceSection />
        </Suspense>
    );
} 