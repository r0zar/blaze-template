'use client';

import { Wallet } from "lucide-react";
import PendingBalanceAnimation from "@/components/PendingBalanceAnimation";
import ClientExplorerLink from "../ClientExplorerLink";
import { formatAddress } from "../../utils/formatters";
import blaze from "blaze-sdk";
import { useBlaze } from '@/contexts/blaze/BlazeContext';

/**
 * Get CSS classes for a balance card based on its selection state
 * @param address The address of the card
 * @param isWalletConnected Whether a wallet is connected
 * @param walletAddress The address of the connected wallet
 * @param selectedTargetAddress The currently selected target address
 * @returns CSS classes for the balance card
 */
const getBalanceCardClasses = (
    address: string,
    isWalletConnected: boolean,
    walletAddress: string | null,
    selectedTargetAddress: string | null
): string => {
    const baseClasses = "p-4 rounded-lg bg-white dark:bg-black/40 border transition-colors cursor-pointer";
    if (isWalletConnected && address === walletAddress) {
        return `${baseClasses} border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30`;
    }
    if (selectedTargetAddress === address) {
        return `${baseClasses} border-yellow-500 dark:border-yellow-500 ring-1 ring-yellow-500/30`;
    }
    return `${baseClasses} border-gray-100 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500`;
};

export default function BalanceSection() {
    const {
        isWalletConnected,
        selectedTargetAddress,
        balances,
        pendingBalanceChanges,
        txRequests,
        selectTargetAddress,
        clearPendingBalanceChange
    } = useBlaze();

    // If there are no balances, show a placeholder
    if (Object.keys(balances).length === 0) {
        return (
            <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Subnet Balances</h2>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            No Balances Available
                        </div>
                        <ClientExplorerLink
                            variant="badge"
                            size="sm"
                            label="View Contract"
                            data-tour="explorer-link"
                        />
                    </div>
                </div>
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                    <Wallet className="w-8 h-8 mx-auto opacity-50 mb-2" />
                    <p>No balances found</p>
                    <p className="text-xs mt-1">
                        Connect your wallet or wait for balances to load
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-12 p-6 rounded-xl bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 backdrop-blur-sm relative z-10" data-tour="balances-section">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Subnet Balances</h2>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Live Updates • {txRequests.length} Pending Tx{txRequests.length !== 1 ? 's' : ''}
                    </div>
                    <ClientExplorerLink
                        variant="badge"
                        size="sm"
                        label="View Contract"
                        data-tour="explorer-link"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="wallet-cards">
                {Object.entries(balances).map(([address, balanceAmount]) => (
                    <div
                        key={address}
                        className={getBalanceCardClasses(address, isWalletConnected, blaze.getWalletAddress(), selectedTargetAddress)}
                        onClick={() => selectTargetAddress(address)}
                        title={isWalletConnected && address === blaze.getWalletAddress() ?
                            "This is your subnet address and its balances" :
                            `Click to set ${formatAddress(address)} as transfer target`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 via-red-100 to-yellow-100/50 dark:from-red-900/70 dark:via-red-900/50 dark:to-yellow-900/30 flex items-center justify-center">
                                <Wallet className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                                    Wallet Address {isWalletConnected && address === blaze.getWalletAddress()}
                                </div>
                                <div className="text-xs font-mono truncate" title={address}>
                                    {formatAddress(address)}
                                    {selectedTargetAddress === address && (
                                        <span className="ml-2 inline-flex items-center px-1.5 py-0 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                            Selected
                                        </span>
                                    )}
                                    {isWalletConnected && address === blaze.getWalletAddress() && (
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
                                {Number(balanceAmount as number / 10 ** 6).toLocaleString()} WELSH
                                {pendingBalanceChanges[address] && (
                                    <PendingBalanceAnimation
                                        isActive={true}
                                        onComplete={() => clearPendingBalanceChange(address)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
} 