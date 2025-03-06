# Batch Processing Synchronization with Vercel KV

This document explains how we've implemented synchronized batch processing across serverless functions using Vercel KV.

## Overview

The main challenge with serverless functions is their stateless nature. In our application, we need to synchronize batch processing timers across multiple serverless instances to prevent race conditions and duplicate batch processing. 

To solve this, we use Vercel KV (a Redis-compatible key-value store) to maintain shared state across all instances.

## Setup Instructions

### 1. Add Vercel KV to Your Project

```bash
# Install @vercel/kv package
npm install @vercel/kv

# Link your project to Vercel and add KV
npx vercel link
npx vercel integrations add vercel-kv
```

### 2. Configure Environment Variables

After setting up Vercel KV, you'll get REST API credentials. Add these to your `.env.local` file and to your Vercel environment variables:

```
KV_REST_API_URL=your-kv-url
KV_REST_API_TOKEN=your-kv-token
KV_REST_API_READ_ONLY_TOKEN=your-kv-read-only-token
```

### 3. Using KV in Your Application

The implementation consists of:

#### A. KV Utility File (`app/api/kv.ts`)

This file contains all functions for interacting with the KV store:
- Fetching/updating batch timers
- Processing batch state management
- Distributed locking mechanisms

#### B. Subscribe Route (`app/api/subscribe/route.ts`)

- Uses KV for timer management
- Implements distributed locking for timer decrementation
- Ensures only one instance handles timer decrementation
- Coordinates batch processing across instances

#### C. Settle Route (`app/api/settle/route.ts`)

- Uses KV for manual batch settlement
- Implements locking to prevent concurrent batch processing
- Handles errors for cases like "batch already processing"

## Distributed Locking

A key feature of our implementation is distributed locking. This prevents multiple serverless instances from processing the same batch or decrementing timers simultaneously.

Locks are implemented with:
- Unique server IDs for each instance
- Lock acquisition with TTL (time-to-live)
- Lock release after processing
- Lock renewal for long-running operations

## Testing the Implementation

1. Start your application locally: `npm run dev`
2. Open multiple browser tabs with your application
3. Observe that all tabs show the same countdown timer
4. When a batch processes, all tabs should update simultaneously

## Production Considerations

1. **Lock TTLs**: Adjust the TTL values based on your expected processing times
2. **Monitoring**: Add monitoring for lock failures and KV connection issues
3. **Fallback**: Consider implementing fallback mechanisms for KV outages
4. **Costs**: Monitor your KV usage as high-frequency operations can affect billing

## Alternative Approaches

If Vercel KV isn't suitable for your needs, consider these alternatives:

1. **Vercel Cron Jobs**: Schedule batch processing at fixed intervals
2. **Webhooks**: Use external services to trigger batch processing
3. **Upstash Redis**: Alternative Redis provider with similar capabilities
4. **Dedicated Processing Server**: Move batch processing to a non-serverless component

## Troubleshooting

If batch processing isn't syncing properly:

1. Check KV credentials in environment variables
2. Verify locks are being acquired/released properly (add logging)
3. Make sure serverless function timeouts are long enough for batch processing
4. Check for Redis connection errors in logs 