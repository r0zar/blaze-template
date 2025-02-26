import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint to verify API connectivity
 * Returns 200 OK with basic server info
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV,
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
    });
}

/**
 * HEAD method for lightweight health checks
 */
export async function HEAD() {
    return new Response(null, { status: 200 });
} 