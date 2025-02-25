// refresh balances
import { subnet } from '../subnet';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        if (!body.user) {
            await subnet.refreshBalances();
            return new Response(JSON.stringify({ success: true }));
        }
        const user = body.user;
        await subnet.refreshBalances(user);
        return new Response(JSON.stringify({ success: true }));
    } catch (error) {
        console.error('Error refreshing balances:', error);
        return new Response(JSON.stringify({ success: false, error: 'Error refreshing balances' }), { status: 500 });
    }
}