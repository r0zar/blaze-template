import { NextResponse } from 'next/server';
import { subnet } from '@/lib/subnet';
import { triggerPusherEvent } from '@/lib/pusher';
import { EVENTS, BLOCKCHAIN_CHANNEL } from '@/lib/constants';

// Define transaction interface to match subnet types
interface Transaction {
    signer: string;
    to: string;
    amount: number;
    nonce?: number;
    [key: string]: any;
}

export async function POST(request: Request) {
    try {
        const txRequest = await request.json();
        console.log('Received transaction request:', JSON.stringify(txRequest, null, 2));

        // Validate request
        if (!txRequest || !txRequest.signer || !txRequest.to || typeof txRequest.amount === 'undefined') {
            console.error('Invalid transaction request, missing required fields');
            return NextResponse.json({
                success: false,
                error: 'Invalid transaction request. Required fields: signer, to, amount'
            }, { status: 400 });
        }

        // Process transaction
        console.log(`Processing transaction from ${txRequest.signer} to ${txRequest.to} for amount ${txRequest.amount}`);
        await subnet.processTxRequest(txRequest);

        // Get queue state after processing
        const queue = subnet.mempool ? subnet.mempool.getQueue() : [];
        const queueLength = queue.length;
        console.log('Queue length after processing:', queueLength);

        // Get updated state
        const status = subnet.getStatus();
        console.log('Current subnet status:', status);

        // Get balances - use Promise.all to parallelize requests
        const balances = await subnet.getBalances();
        console.log('Current balances:', JSON.stringify(balances, null, 2));

        // Trigger all Pusher events in parallel for faster delivery
        console.log('Triggering Pusher events in parallel...');
        await Promise.all([
            // Transaction added event
            triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.TRANSACTION_ADDED, {
                queue: queue,
                status: { ...status, state: 'idle' }
            }).then(() => console.log('TRANSACTION_ADDED event triggered successfully'))
                .catch(err => console.error('Error triggering TRANSACTION_ADDED event:', err)),

            // Balance updates event
            triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.BALANCE_UPDATES, balances)
                .then(() => console.log('BALANCE_UPDATES event triggered successfully'))
                .catch(err => console.error('Error triggering BALANCE_UPDATES event:', err)),

            // Status update event
            triggerPusherEvent(BLOCKCHAIN_CHANNEL, EVENTS.STATUS_UPDATE, {
                status: { ...status, state: 'idle' },
                queue,
                balances,
                time: new Date().toISOString()
            }).then(() => console.log('STATUS_UPDATE event triggered successfully'))
                .catch(err => console.error('Error triggering STATUS_UPDATE event:', err))
        ]);

        const response = {
            success: true,
            txRequest: txRequest,
            queueLength: queueLength,
            status: status,
            balances: balances
        };

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error processing request:', error);

        // Try to get current state even if there was an error
        let errorResponse: any = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };

        try {
            errorResponse.status = subnet.getStatus();
            errorResponse.queueLength = subnet.mempool ? subnet.mempool.getQueue().length : 0;
        } catch (stateError) {
            console.error('Error getting subnet state:', stateError);
        }

        return NextResponse.json(errorResponse, { status: 500 })
    }
}
