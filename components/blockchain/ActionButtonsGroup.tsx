'use client';

import { useBlaze } from '@/contexts/blaze/BlazeContext';
import blaze from "blaze-sdk";
import {
    Wallet,
    ArrowRightLeft,
    ArrowDownLeft,
    ArrowUpRight,
    LogOut
} from "lucide-react";
import { formatAddress } from "@/utils/formatters";

export default function ActionButtonsGroup() {
    const {
        isWalletConnected,
        selectedTargetAddress,
        balances,
        executeTransfer,
        handleDeposit,
        handleWithdraw,
        toggleWalletConnection
    } = useBlaze();

    return (
        <div className="mb-12 relative z-10" data-tour="action-buttons">
            <h3 className="text-xl font-semibold mb-6">Subnet Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Wallet Connect/Disconnect Button */}
                <button
                    className={`backdrop-blur-lg p-4 rounded-lg ${isWalletConnected ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800' : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800'} hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                    onClick={toggleWalletConnection}
                    data-tour="wallet-connect"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-8 h-8 rounded-full ${isWalletConnected ? 'bg-gradient-to-br from-red-100 via-red-100 to-red-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-red-900/30' : 'bg-gradient-to-br from-green-100 via-green-100 to-green-100/50 dark:from-green-900/70 dark:via-green-900/50 dark:to-green-900/30'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            {isWalletConnected ? (
                                <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                            ) : (
                                <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                            )}
                        </div>
                        <span className="font-semibold">{isWalletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {isWalletConnected
                            ? `Connected: ${formatAddress(blaze.getWalletAddress())}`
                            : 'Connect your Stacks wallet to get started'}
                    </p>
                </button>

                {/* Transfer Button */}
                <button
                    className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                    onClick={() => executeTransfer(1000000)}
                    data-tour="transfer-button"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowRightLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-semibold">Transfer</span>
                        {!selectedTargetAddress && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 animate-pulse">
                                Random
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedTargetAddress ?
                            `Send WELSH to ${formatAddress(selectedTargetAddress)}` :
                            'Send WELSH tokens to a random address'}
                    </p>
                </button>

                {/* Deposit Button */}
                <button
                    className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                    onClick={handleDeposit}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-semibold">Deposit</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Deposit tokens into the subnet</p>
                </button>

                {/* Withdraw Button */}
                <button
                    className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                    onClick={handleWithdraw}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="font-semibold">Withdraw</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Withdraw tokens from the subnet</p>
                </button>
            </div>
        </div>
    );
} 