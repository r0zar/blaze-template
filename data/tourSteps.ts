import React from 'react';

export const tourSteps = [
    // Step 1: Welcome
    {
        target: 'body',
        title: 'Welcome to Blaze Subnet Demo',
        content: 'Experience lightning-fast transactions with minimal fees using Blaze\'s subnet technology. This demo will guide you through the key features.',
        placement: 'center',
        disableBeacon: true,
        styles: {
            options: {
                width: 450,
            },
        },
        floaterProps: {
            disableAnimation: true,
        },
    },

    // Step 2: Connect Your Wallet
    {
        target: '[data-tour="wallet-connect"]',
        title: 'Connect Your Wallet',
        content: 'Start by connecting your Stacks wallet. This allows you to interact with the subnet and make transactions.',
        placement: 'bottom',
    },

    // Step 3: Subnet Balances
    {
        target: '[data-tour="balances-section"]',
        title: 'Subnet Balances',
        content: 'This section shows your current balance in the subnet. Balances update in real-time as transactions are processed.',
        placement: 'bottom',
    },

    // Step 4: Transfer Targets
    {
        target: '[data-tour="wallet-cards"]',
        title: 'Transfer Targets',
        content: 'Select a wallet address to send funds to. You can choose from existing addresses or enter a custom one.',
        placement: 'top',
    },

    // Step 5: Subnet Actions
    {
        target: '[data-tour="action-buttons"]',
        title: 'Subnet Actions',
        content: 'Perform key operations like transfers between subnet addresses, deposits from L1, and withdrawals back to L1.',
        placement: 'top',
    },

    // Step 6: Transaction Queue
    {
        target: '[data-tour="transaction-list"]',
        title: 'Transaction Queue',
        content: 'Watch your pending transactions here. Transactions are processed quickly within the subnet.',
        placement: 'top',
    },

    // Step 7: Batch Settlement
    {
        target: '[data-tour="batch-timer"]',
        title: 'Batch Settlement',
        content: 'Transactions are batched and settled on the L1 blockchain periodically. This countdown shows when the next batch will be processed.',
        placement: 'bottom',
    },

    // Step 8: Explorer Links
    {
        target: '[data-tour="explorer-link"]',
        title: 'Blockchain Explorer',
        content: 'View transaction details on the blockchain explorer. This provides transparency and verification for all operations.',
        placement: 'left',
    },

    // Step 9: Create a Transaction
    {
        target: '[data-tour="transfer-button"]',
        title: 'Try It Out!',
        content: 'Ready to create your first transaction? Select a target address and amount, then click transfer to see how fast it processes!',
        placement: 'top',
    },

    // Final step
    {
        target: 'body',
        title: 'You\'re All Set!',
        content: 'You now know the basics of using the Blaze subnet. Enjoy lightning-fast transactions with minimal fees! Questions? Join our Discord community.',
        placement: 'center',
        disableBeacon: true,
    },
]; 