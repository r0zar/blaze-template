import { NextRequest, NextResponse } from 'next/server';
import { subnet } from '../subnet';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        await subnet.refreshBalances(body?.user);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Refresh bugging out:', error);
        return NextResponse.json({ success: false });
    }
}