import { Subnet } from "blaze-sdk";

// Export a single shared instance
export const subnet = new Subnet();

// Set initial balances
subnet.balances = new Map([
    ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS', 1000000],
    ['SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0ZEZPJ', 1000000]
]);