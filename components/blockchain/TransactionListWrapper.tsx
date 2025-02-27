'use client';

import React, { Suspense } from 'react';
import TransactionList from './TransactionList';
import TransactionListSkeleton from './TransactionListSkeleton';

/**
 * Wrapper component for TransactionList that uses Suspense for loading state
 * Displays a skeleton loading animation while data is being fetched
 */
export default function TransactionListWrapper() {
    return (
        <Suspense fallback={<TransactionListSkeleton />}>
            <TransactionList />
        </Suspense>
    );
} 