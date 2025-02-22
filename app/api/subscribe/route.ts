import { subnet } from '../subnet';

export async function GET(request: Request) {
    console.log('Subscribe route subnet instance:', subnet);

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    const encoder = new TextEncoder()

    // Send initial headers to establish SSE connection
    const response = new Response(stream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    })

    // Function to send events
    const sendEvent = async (data: any) => {
        await writer.write(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
    }

    // Example: Send events every second
    const interval = setInterval(async () => {
        try {
            const status = subnet.getStatus();
            const balances = subnet.getBalances();

            const eventData = {
                status,
                time: new Date().toISOString(),
                queue: subnet.queue,
                balances
            };

            await sendEvent(eventData);

            // if queue length is longer than 20, settle transactions
            const maxQueueLength = 20;
            if (subnet.queue.length >= maxQueueLength) {
                const batchSize = subnet.queue.length;
                await subnet.settleTransactions(maxQueueLength);
                await sendEvent({
                    ...eventData,
                    queue: subnet.queue, // Send updated queue
                    balances: subnet.getBalances(), // Send updated balances
                    settlement: {
                        batchSize,
                        timestamp: Date.now()
                    },
                    text: `${batchSize} transactions have been settled on-chain`
                });
            }
        } catch (e) {
            console.error('Error in interval:', e)
            clearInterval(interval)
            writer.close()
        }
    }, 100)

    // Clean up if client disconnects
    request.signal.addEventListener('abort', () => {
        console.log('Client disconnected, cleaning up');
        clearInterval(interval)
        writer.close()
    })

    return response
}

