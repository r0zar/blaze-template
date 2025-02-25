import { NextResponse } from 'next/server';
import { subnet } from '../subnet';

export async function POST(request: Request) {
    try {
        const txRequest = await request.json();
        console.log('Received transaction request:', txRequest);

        subnet.processTxRequest(txRequest);
        const queueLength = subnet.mempool ? subnet.mempool.getQueue().length : 0;
        console.log('Queue length after processing:', queueLength);

        const response = {
            success: true,
            txRequest: txRequest,
            queueLength: queueLength,
            status: subnet.getStatus()
        };
        console.log('Sending response:', response);

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
