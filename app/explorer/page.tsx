'use client';

import { useState, useEffect } from 'react';
import { Footer } from '@/components/Footer';
import { ArrowLeft, ExternalLink, Clock, ArrowRightLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import ExplorerLink from '@/components/ExplorerLink';

// Mock transaction data for demonstration
const mockTransactions = [
    {
        id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        type: 'batch',
        timestamp: Date.now() - 1000 * 60 * 5,
        count: 12,
        status: 'confirmed'
    },
    {
        id: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        type: 'deposit',
        timestamp: Date.now() - 1000 * 60 * 30,
        amount: 50000000,
        user: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
        status: 'confirmed'
    },
    {
        id: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
        type: 'withdraw',
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        amount: 25000000,
        user: 'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ',
        status: 'confirmed'
    },
    {
        id: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
        type: 'batch',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
        count: 8,
        status: 'confirmed'
    },
    {
        id: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
        type: 'deposit',
        timestamp: Date.now() - 1000 * 60 * 60 * 36,
        amount: 75000000,
        user: 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
        status: 'confirmed'
    }
];

// Format timestamp
const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
};

// Format address
const formatAddress = (address: string | undefined) => {
    if (!address) return '---';
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
};

// Format amount
const formatAmount = (amount: number | undefined) => {
    if (!amount) return '0 WELSH';
    return (amount / 10 ** 6).toLocaleString() + ' WELSH';
};

export default function ExplorerPage() {
    const [transactions, setTransactions] = useState(mockTransactions);
    const [activeTab, setActiveTab] = useState('all');

    // Filter transactions based on active tab
    const filteredTransactions = transactions.filter(tx => {
        if (activeTab === 'all') return true;
        return tx.type === activeTab;
    });

    return (
        <div className="min-h-screen flex flex-col">
            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-16 relative z-10">
                <div className="max-w-6xl mx-auto">
                    {/* Header with back button */}
                    <div className="mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 mb-4">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Demo
                        </Link>
                        <h1 className="text-3xl font-bold mb-2">Blaze Subnet Explorer (Example Data)</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            View all on-chain transactions for the Blaze subnet
                        </p>
                    </div>

                    {/* Contract Info Card */}
                    <div className="mb-8 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-yellow-200 dark:border-yellow-800 backdrop-blur-sm">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold mb-2">Subnet Contract</h2>
                                <div className="font-mono text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
                                    SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.blaze-welsh-v0
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <ExplorerLink
                                    variant="button"
                                    size="md"
                                    label="View Contract"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Transaction Tabs */}
                    <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex overflow-x-auto">
                            {['all', 'batch', 'deposit', 'withdraw'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 font-medium text-sm whitespace-nowrap ${activeTab === tab
                                        ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-500 dark:border-yellow-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)} Transactions
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transactions List */}
                    <div className="space-y-4">
                        {filteredTransactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'batch'
                                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                            : tx.type === 'deposit'
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                            }`}>
                                            {tx.type === 'batch' ? (
                                                <ArrowRightLeft className="w-5 h-5" />
                                            ) : tx.type === 'deposit' ? (
                                                <ArrowDownLeft className="w-5 h-5" />
                                            ) : (
                                                <ArrowUpRight className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium">
                                                    {tx.type === 'batch'
                                                        ? `Batch Settlement (${tx.count} transactions)`
                                                        : tx.type === 'deposit'
                                                            ? `Deposit`
                                                            : `Withdrawal`
                                                    }
                                                </h3>
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                    {tx.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {formatTimestamp(tx.timestamp)}
                                            </div>
                                            {tx.type !== 'batch' && (
                                                <div className="mt-2 flex flex-col gap-1">
                                                    <div className="text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">Amount: </span>
                                                        <span className="font-medium">{formatAmount(tx.amount)}</span>
                                                    </div>
                                                    <div className="text-sm">
                                                        <span className="text-gray-500 dark:text-gray-400">User: </span>
                                                        <span className="font-mono">{formatAddress(tx.user)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <div className="font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={tx.id}>
                                            {tx.id.slice(0, 10)}...{tx.id.slice(-8)}
                                        </div>
                                        <ExplorerLink
                                            txId={tx.id}
                                            variant="badge"
                                            size="sm"
                                            label="View on Explorer"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
} 