import Pusher from 'pusher';
import { EVENTS, BLOCKCHAIN_CHANNEL, EventName } from './constants';

// Re-export constants
export { EVENTS, BLOCKCHAIN_CHANNEL };

// Check if environment variables are available
const isPusherConfigured =
    process.env.PUSHER_APP_ID &&
    process.env.PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.PUSHER_CLUSTER;

// Initialize Pusher if configuration exists
let pusher: Pusher | null = null;

if (isPusherConfigured) {
    pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.PUSHER_CLUSTER!,
        useTLS: true,
    });
    console.log('Pusher initialized successfully');
} else {
    console.warn('Pusher is not configured. Real-time updates via Pusher will not be available.');
}

/**
 * Safely trigger a Pusher event - gracefully handles unconfigured Pusher
 */
export async function triggerPusherEvent(
    channel: string,
    event: EventName,
    data: any
): Promise<boolean> {
    // Validate inputs
    if (!pusher) {
        console.warn('Pusher not configured, skipping event:', { channel, event });
        return false;
    }

    // Validate channel
    if (typeof channel !== 'string') {
        console.error('Invalid channel type. Expected string, got:', typeof channel);
        return false;
    }

    // Validate event
    if (typeof event !== 'string' || !event) {
        console.error('Invalid event type or empty. Expected non-empty string, got:', typeof event);
        return false;
    }

    // Validate data
    if (data === undefined || data === null) {
        console.error('Invalid data: data cannot be null or undefined');
        return false;
    }

    try {
        console.log(`Triggering Pusher event: ${event} on channel: ${channel}`);
        await pusher.trigger(channel, event, data);
        console.log(`Successfully triggered event: ${event}`);
        return true;
    } catch (error) {
        console.error('Failed to trigger Pusher event:', error, {
            channel,
            event,
            dataType: typeof data
        });
        return false;
    }
}

// Export the constants and pusher instance
export default pusher; 