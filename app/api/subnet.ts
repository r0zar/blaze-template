import { Subnet } from "blaze-sdk";

// Use global variable to maintain state across API calls
declare global {
    var subnet: Subnet | undefined;
}

// Initialize subnet if it doesn't exist
if (!global.subnet) {
    global.subnet = new Subnet();

    // Initialize with a default signer
    // This is a test network signer - replace with your actual address in production
    global.subnet.signer = 'SP2MR4YP9C7P93EJZC4W1JT8HKAX8Q4HR9Q6X3S88';
    console.log('Subnet initialized with default signer');
}

// Function to set the signer
export function setSubnetSigner(signer: string) {
    if (global.subnet) {
        global.subnet.signer = signer;
        console.log(`Subnet signer updated to: ${signer}`);
    }
}

// Export the global instance
export const subnet = global.subnet;