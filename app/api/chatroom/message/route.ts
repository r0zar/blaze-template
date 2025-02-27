import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';
import { CHATROOM } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, address, nickname, content, timestamp } = body;

    if (!id || !address || !nickname || !content || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Broadcast the message to all subscribers
    await pusherServer.trigger(CHATROOM.CHANNEL, CHATROOM.EVENTS.MESSAGE_SENT, {
      id,
      address,
      nickname,
      content,
      timestamp,
      tips: 0
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}