'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

export type ExplorerLinkVariant = 'button' | 'badge' | 'icon' | 'text' | 'card';
export type ExplorerLinkSize = 'sm' | 'md' | 'lg';

interface ExplorerLinkProps {
    txId?: string;
    contractId?: string;
    label?: string;
    variant?: ExplorerLinkVariant;
    size?: ExplorerLinkSize;
    className?: string;
    showIcon?: boolean;
}

const ExplorerLink: React.FC<ExplorerLinkProps> = ({
    txId,
    contractId = 'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS.blaze-welsh-v0',
    label,
    variant = 'text',
    size = 'md',
    className = '',
    showIcon = true
}) => {
    // Determine the URL based on whether we're linking to a transaction or contract
    const url = txId
        ? `https://explorer.hiro.so/txid/${txId}?chain=mainnet`
        : `https://explorer.hiro.so/txid/${contractId}?chain=mainnet`;

    // Default label based on what we're linking to
    const defaultLabel = txId
        ? `View Transaction`
        : `View Contract`;

    const displayLabel = label || defaultLabel;

    // Size classes
    const sizeClasses = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base'
    };

    // Variant classes
    const getVariantClasses = () => {
        switch (variant) {
            case 'button':
                return `px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:opacity-90 transition-opacity font-medium flex items-center gap-1.5 ${sizeClasses[size]}`;
            case 'badge':
                return `px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 flex items-center gap-1 ${sizeClasses[size]}`;
            case 'icon':
                return `text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors`;
            case 'card':
                return `p-3 rounded-lg bg-white dark:bg-black/40 border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors flex items-center gap-2 ${sizeClasses[size]}`;
            case 'text':
            default:
                return `text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 hover:underline transition-colors flex items-center gap-1 ${sizeClasses[size]}`;
        }
    };

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${getVariantClasses()} ${className}`}
            title={`View on Stacks Explorer: ${txId || contractId}`}
        >
            {displayLabel}
            {showIcon && <ExternalLink className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />}
        </a>
    );
};

export default ExplorerLink; 