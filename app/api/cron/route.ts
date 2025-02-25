import { subnet } from '../subnet';

// Helper function to generate random Stacks address
function generateRandomStacksAddress() {
    const prefix = 'SP';
    const characters = '123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = prefix;
    for (let i = 0; i < 31; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Helper function to generate random amount between 1 and 100
function generateRandomAmount() {
    return Math.floor(Math.random() * 100) + 1;
}

// List of fixed addresses to ensure some transactions between known addresses
const FIXED_ADDRESSES = [
    'SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS',
    'SP2D5BGGJ956A635JG7CJQ59FTRFRB0893514EZPJ'
];

export async function GET() {
    try {
        // Generate 1-3 random transactions
        const numTransactions = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < numTransactions; i++) {
            // 30% chance to use fixed addresses, 70% chance for random addresses
            const useFixedAddresses = Math.random() < 0.3;

            const from = useFixedAddresses
                ? FIXED_ADDRESSES[Math.floor(Math.random() * FIXED_ADDRESSES.length)]
                : generateRandomStacksAddress();

            const to = useFixedAddresses
                ? FIXED_ADDRESSES[Math.floor(Math.random() * FIXED_ADDRESSES.length)]
                : generateRandomStacksAddress();

            const txRequest = {
                amount: generateRandomAmount(),
                to: to,
                signer: from,
                nonce: Date.now() + i, // Ensure unique nonce
                signature: '0x' + Math.random().toString(16).slice(2) // Random signature
            };

            // Process transaction
            subnet.processTxRequest(txRequest);
        }

        return new Response(JSON.stringify({
            success: true,
            transactionsGenerated: numTransactions
        }), {
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error('Error in cron job:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
} 