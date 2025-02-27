'use client';

import React from 'react';
import TransactionList from './TransactionList';
import TransactionListSkeleton from './TransactionListSkeleton';
import { useBlaze } from '@/contexts/blaze/BlazeContext';

/**
 * Wrapper component for TransactionList that uses Suspense for loading state
 * Displays a skeleton loading animation while data is being fetched
 */
export default function TransactionListWrapper() {
    const { isLoading } = useBlaze();
    return isLoading ? <TransactionListSkeleton /> : <TransactionList />;
} 