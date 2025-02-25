import { Subnet } from "blaze-sdk";

// Use global variable to maintain state across API calls
declare global {
    var subnet: Subnet | undefined;
}

// Initialize subnet if it doesn't exist
if (!global.subnet) {
    global.subnet = new Subnet();
    // Set initial balances
    // global.subnet.balances = new Map([
    //     ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS', 1000000],
    //     ['SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ', 1000000]
    // ]);
    console.log(global.subnet)
}

// Export the global instance
export const subnet = global.subnet;