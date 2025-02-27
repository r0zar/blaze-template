'use client';

import BalanceSectionWrapper from './BalanceSectionWrapper';
import ActionButtonsGroup from './ActionButtonsGroup';
import TransactionListWrapper from './TransactionListWrapper';

export default function BlockchainSection() {
    return (
        <div className="max-w-screen-2xl mx-auto">
            {/* Balances Section with Suspense and Skeleton Loading */}
            <BalanceSectionWrapper />

            {/* Actions Section */}
            <ActionButtonsGroup />

            {/* Transactions Section with Suspense and Skeleton Loading */}
            <TransactionListWrapper />
        </div>
    );
} 