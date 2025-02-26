'use client';

import blaze, { Transaction } from "blaze-sdk";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowUpRight,
    Wallet,
    ArrowDownLeft,
    ArrowRightLeft,
    Loader2,
    PlusCircle,
    LogOut,
    ExternalLink,
} from "lucide-react";
import FloatingElements from "./FloatingElements";
import PendingBalanceAnimation from "./PendingBalanceAnimation";
import ExplorerLink from "./ExplorerLink";
import { useActionButtonState } from "../app/hooks/useActionButtonState";
import { formatTimestamp, formatAddress, getStatusText, getPillClasses, getIndicatorClasses, getBalanceCardClasses } from "../utils/formatters";

function ActionButtons() {
    const { state, actions } = useActionButtonState();

    return (
        <div className="max-w-screen-2xl mx-auto">
            {/* Balances Section */}
            <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10" data-tour="balances-section">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Subnet Balances</h2>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            Live Updates • {state.txRequests.length} Pending Tx{state.txRequests.length !== 1 ? 's' : ''}
                        </div>
                        <ExplorerLink
                            variant="badge"
                            size="sm"
                            label="View Contract"
                            data-tour="explorer-link"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="wallet-cards">
                    {Object.entries(state.balances).map(([address, balance]) => (
                        <div
                            key={address}
                            className={getBalanceCardClasses(address, state.isWalletConnected, blaze.getWalletAddress(), state.selectedTargetAddress)}
                            onClick={() => actions.selectTargetAddress(address)}
                            title={state.isWalletConnected && address === blaze.getWalletAddress() ?
                                "This is your subnet address and its balances" :
                                `Click to set ${formatAddress(address)} as transfer target`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                                        Wallet Address {state.isWalletConnected && address === blaze.getWalletAddress()}
                                    </div>
                                    <div className="text-xs font-mono truncate" title={address}>
                                        {formatAddress(address)}
                                        {state.selectedTargetAddress === address && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                Selected
                                            </span>
                                        )}
                                        {state.isWalletConnected && address === blaze.getWalletAddress() && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                My Wallet
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Balance</div>
                                <div className="text-xl font-semibold flex items-center">
                                    {Number(balance as number / 10 ** 6).toLocaleString()} WELSH
                                    {state.pendingBalanceChanges[address] && (
                                        <PendingBalanceAnimation
                                            isActive={true}
                                            onComplete={() => actions.clearPendingBalanceChange(address)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions Section */}
            <div className="mb-12 relative z-10" data-tour="action-buttons">
                <h3 className="text-xl font-semibold mb-6">Subnet Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg ${state.isWalletConnected ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800' : 'bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800'} hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={actions.toggleWalletConnection}
                        data-tour="wallet-connect"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full ${state.isWalletConnected ? 'bg-gradient-to-br from-red-100 via-red-100 to-red-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-red-900/30' : 'bg-gradient-to-br from-green-100 via-green-100 to-green-100/50 dark:from-green-900/70 dark:via-green-900/50 dark:to-green-900/30'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                {state.isWalletConnected ? (
                                    <LogOut className="w-4 h-4 text-red-600 dark:text-red-400" />
                                ) : (
                                    <Wallet className="w-4 h-4 text-green-600 dark:text-green-400" />
                                )}
                            </div>
                            <span className="font-semibold">{state.isWalletConnected ? 'Disconnect Wallet' : 'Connect Wallet'}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {state.isWalletConnected
                                ? `Connected: ${formatAddress(blaze.getWalletAddress())}`
                                : 'Connect your Stacks wallet to get started'}
                        </p>
                    </button>

                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={() => {
                            const targetAddress = state.selectedTargetAddress || actions.getRandomTargetAddress();
                            blaze.transfer({ amount: 1000000, to: targetAddress });
                            actions.triggerSuccessAnimation();
                        }}
                        data-tour="transfer-button"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowRightLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Transfer</span>
                            {!state.selectedTargetAddress && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 animate-pulse">
                                    Random
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {state.selectedTargetAddress ?
                                `Send WELSH to ${formatAddress(state.selectedTargetAddress)}` :
                                'Send WELSH tokens to a random address'}
                        </p>
                    </button>

                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={actions.handleDeposit}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <span className="font-semibold">Deposit</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Deposit tokens into the subnet</p>
                    </button>

                    <button
                        className={`backdrop-blur-lg p-4 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-all hover:shadow-lg group`}
                        onClick={actions.handleWithdraw}
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

            {/* Transactions Section */}
            <div className="relative z-10" data-tour="transaction-list">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-semibold">Recent Transactions</h3>
                        <div className={`flex items-center gap-2 ${getPillClasses(state.isMining, state.lastBatch)}`} data-tour="batch-status">
                            <div className={`w-2 h-2 rounded-full ${getIndicatorClasses(state.isMining, state.lastBatch, state.txRequests.length)}`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {state.connectionState === 'connected' ?
                                    getStatusText(state.isMining, state.lastBatch, state.txRequests.length) :
                                    state.connectionState === 'connecting' ? 'Connecting...' :
                                        state.connectionState === 'error' ? 'Connection Error' :
                                            state.connectionState === 'disconnected' ? 'Disconnected' :
                                                'Initializing...'}
                            </span>
                        </div>
                        {state.lastBatch && state.lastBatch.txId && Date.now() - state.lastBatch.timestamp < 10000 && (
                            <ExplorerLink
                                txId={state.lastBatch.txId}
                                variant="badge"
                                size="sm"
                                label="View Batch"
                            />
                        )}
                    </div>
                    <button
                        disabled={!state.isWalletConnected}
                        onClick={async () => {
                            if (!state.isWalletConnected) return;
                            const targetAddress = state.selectedTargetAddress || actions.getRandomTargetAddress();
                            await blaze.transfer({ amount: 1000000, to: targetAddress });
                            actions.triggerSuccessAnimation();
                        }}
                        className={`px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-800 text-white hover:opacity-90 transition-opacity text-sm font-medium flex items-center gap-2 ${!state.isWalletConnected && 'opacity-50 cursor-not-allowed'}`}
                    >
                        <span>Send Micro Transaction</span>
                        {!state.selectedTargetAddress && state.isWalletConnected && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 animate-pulse">
                                Random
                            </span>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {state.isLoading ? (
                        <div className="col-span-full p-6 text-center text-gray-500 dark:text-gray-400">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin opacity-50 mb-2" />
                            <p>Loading transactions...</p>
                            <p className="text-xs mt-1">
                                {state.connectionState === 'error'
                                    ? 'Connection error. Please refresh the page.'
                                    : state.connectionState === 'disconnected'
                                        ? 'Disconnected from server. Will reconnect automatically.'
                                        : 'This should only take a moment...'}
                            </p>
                        </div>
                    ) : state.txRequests.length > 0 ? (
                        <AnimatePresence mode="popLayout" initial={false}>
                            {state.txRequests.map((t) => t.transfer).filter((tx: any) => tx !== undefined).map((tx: any, index: number) => (
                                <motion.div
                                    key={`${tx?.nonce}-${index}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="backdrop-blur-lg p-3 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-100 to-yellow-100 dark:from-red-900/50 dark:to-yellow-900/50 flex items-center justify-center">
                                            <ArrowRightLeft className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Transfer</span>
                                                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gradient-to-r from-red-100/50 to-yellow-100/50 dark:from-red-900/30 dark:to-yellow-900/30 text-yellow-600 dark:text-yellow-400 font-medium">
                                                    Pending
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                {formatTimestamp(tx?.nonce)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">Amount</span>
                                        <span className="font-medium">{tx?.amount / 10 ** 6 || 0} WELSH</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded bg-gray-50 dark:bg-black/20">
                                            <ArrowUpRight className="w-3 h-3 text-gray-400" />
                                            <span className="font-mono truncate" title={tx?.signer}>
                                                {formatAddress(tx?.signer)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded bg-gray-50 dark:bg-black/20">
                                            <ArrowDownLeft className="w-3 h-3 text-gray-400" />
                                            <span className="font-mono truncate" title={tx?.to}>
                                                {formatAddress(tx?.to)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <ExplorerLink
                                            variant="text"
                                            size="sm"
                                            label="View on Explorer"
                                            txId={tx.txId}
                                            showIcon={false}
                                            className="text-[10px] text-gray-500 hover:text-yellow-600"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <div className="backdrop-blur-lg col-span-full p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
                            {state.connectionState === 'error' || state.connectionState === 'disconnected' ? (
                                <>
                                    <div className="mb-2">
                                        <Loader2 className="w-8 h-8 mx-auto opacity-50 animate-spin" />
                                    </div>
                                    <p>{state.connectionState === 'error'
                                        ? 'Connection error'
                                        : 'Disconnected from server'}</p>
                                    <p className="text-xs mt-1">
                                        {state.connectionState === 'error'
                                            ? 'Please refresh the page to reconnect'
                                            : 'Attempting to reconnect automatically...'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="mb-2">
                                        <PlusCircle className="w-8 h-8 mx-auto opacity-50" />
                                    </div>
                                    <p>No transactions in queue</p>
                                    <p className="text-xs mt-1">Create a test transaction to see it in action</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ActionButtons;