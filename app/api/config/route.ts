/**
 * API Route to provide client-side configuration values
 * This allows us to safely expose public keys without embedding them in the built JS
 */
export async function GET() {
    const config = {
        pusher: {
            key: process.env.PUSHER_KEY,
            cluster: process.env.PUSHER_CLUSTER,
        }
    };

    // Only include defined values
    const validConfig = {
        pusher: Object.fromEntries(
            Object.entries(config.pusher).filter(([_, value]) => value !== undefined)
        )
    };

    return Response.json(validConfig);
} 