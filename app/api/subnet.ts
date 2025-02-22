import { Subnet } from "blaze-sdk";

// Use global variable to maintain state across API calls
declare global {
    var subnet: Subnet | undefined;
}

// Initialize subnet if it doesn't exist
if (!global.subnet) {
    global.subnet = new Subnet();
    // Set initial balances
    global.subnet.balances = new Map([
        ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS', 1000000],
        ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0ZEZPJ', 1000000]
    ]);
}

// Export the global instance
export const subnet = global.subnet;