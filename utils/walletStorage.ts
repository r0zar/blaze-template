// Utility for storing and retrieving wallet addresses

// Key for storing wallet addresses in localStorage
const WALLET_ADDRESSES_KEY = 'blaze-wallet-addresses';

// Safe localStorage access
const safeLocalStorage = {
    getItem: (key: string): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(key);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, value);
        }
    }
};

// Get all saved wallet addresses
export const getSavedWalletAddresses = (): string[] => {
    const addressesJson = safeLocalStorage.getItem(WALLET_ADDRESSES_KEY);
    if (!addressesJson) return [];

    try {
        return JSON.parse(addressesJson);
    } catch (error) {
        console.error('Error parsing saved wallet addresses:', error);
        return [];
    }
};

// Save a wallet address if it's not already saved
export const saveWalletAddress = (address: string): void => {
    if (!address) return;

    const addresses = getSavedWalletAddresses();

    // Only add if not already in the list
    if (!addresses.includes(address)) {
        addresses.push(address);
        safeLocalStorage.setItem(WALLET_ADDRESSES_KEY, JSON.stringify(addresses));
    }
};

// Save multiple wallet addresses at once
export const saveWalletAddresses = (newAddresses: string[]): void => {
    if (!newAddresses || newAddresses.length === 0) return;

    const addresses = getSavedWalletAddresses();
    let updated = false;

    newAddresses.forEach(address => {
        if (address && !addresses.includes(address)) {
            addresses.push(address);
            updated = true;
        }
    });

    if (updated) {
        safeLocalStorage.setItem(WALLET_ADDRESSES_KEY, JSON.stringify(addresses));
    }
};

// Clear all saved wallet addresses
export const clearSavedWalletAddresses = (): void => {
    safeLocalStorage.setItem(WALLET_ADDRESSES_KEY, JSON.stringify([]));
}; 