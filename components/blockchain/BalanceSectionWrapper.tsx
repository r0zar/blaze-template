'use client';

import React from 'react';
import BalanceSection from './BalanceSection';
import BalanceSectionSkeleton from './BalanceSectionSkeleton';
import { useBlaze } from '@/contexts/blaze/BlazeContext';

/**
 * Wrapper component for BalanceSection that uses Suspense for loading state
 * Displays a skeleton loading animation while data is being fetched
 */
export default function BalanceSectionWrapper() {
    const { isLoading } = useBlaze();
    return isLoading ? <BalanceSectionSkeleton /> : <BalanceSection />;
} 