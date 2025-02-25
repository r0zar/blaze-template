import { Subnet } from "blaze-sdk";

// Use global variable to maintain state across API calls
declare global {
    var subnet: Subnet | undefined;
}

// Initialize subnet if it doesn't exist
if (!global.subnet) {
    global.subnet = new Subnet();
}

// Export the global instance
export const subnet = global.subnet;