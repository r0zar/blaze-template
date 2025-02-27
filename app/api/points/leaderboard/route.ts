import { NextResponse } from 'next/server';
import { PointsService } from '@/lib/points-service';

export async function GET() {
    try {
        const leaders = await PointsService.getLeaderboard();
        return NextResponse.json(leaders);
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return NextResponse.json(
            { error: 'Failed to fetch leaderboard' },
            { status: 500 }
        );
    }
} 