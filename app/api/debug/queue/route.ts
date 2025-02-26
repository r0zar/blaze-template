import { NextResponse } from 'next/server';
import { subnet } from '../../subnet';

// Set Dynamic to avoid ISR caching
export const dynamic = 'force-dynamic';

// Configure this route to run in Node.js environment instead of Edge
export const runtime = 'nodejs';

export async function POST() {
    try {
        // Get the current queue from the subnet
        const queue = subnet.mempool ? await subnet.mempool.getQueue() : [];

        return NextResponse.json({
            queue,
            length: queue.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting queue:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
} 