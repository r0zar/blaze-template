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

    // Refresh balances initially to ensure we have the latest on-chain state
    try {
        await subnet.refreshBalances();
        console.log('Initial balance refresh completed');
    } catch (e) {
        console.error('Error during initial balance refresh:', e);
    }

    // Example: Send events every second
    const interval = setInterval(async () => {
        try {
            const status = subnet.getStatus ? subnet.getStatus() : 'online';
            const balances = await subnet.getBalances();
            const queue = subnet.mempool ? subnet.mempool.getQueue() : [];

            const eventData = {
                status,
                time: new Date().toISOString(),
                queue,
                balances
            };

            await sendEvent(eventData);

            // if queue length is longer than 20, mine a block
            const maxQueueLength = 20;
            if (queue.length >= maxQueueLength) {
                const batchSize = queue.length;
                // Mine a block with the transactions in the mempool
                await subnet.mineBlock(maxQueueLength);

                // Explicitly refresh balances to get updated on-chain state
                await subnet.refreshBalances();

                // Get updated data after mining
                const updatedQueue = subnet.mempool ? subnet.mempool.getQueue() : [];
                const updatedBalances = await subnet.getBalances();

                await sendEvent({
                    status,
                    time: new Date().toISOString(),
                    queue: updatedQueue,
                    balances: updatedBalances,
                    settlement: {
                        batchSize,
                        timestamp: Date.now()
                    },
                    text: `${batchSize} transactions have been mined in a block and settled on-chain`
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

