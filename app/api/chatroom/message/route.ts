import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';
import { CHATROOM } from '@/lib/constants';
import { kv } from '@vercel/kv';

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

    const message = {
      id,
      address,
      nickname,
      content,
      timestamp,
      tips: 0
    };

    // Save message to KV store
    await kv.rpush('chatroom:messages', JSON.stringify(message));

    // Keep only last 100 messages
    const messageCount = await kv.llen('chatroom:messages');
    if (messageCount > 100) {
      await kv.ltrim('chatroom:messages', -100, -1);
    }

    // Broadcast the message to all subscribers
    await pusherServer.trigger(CHATROOM.CHANNEL, CHATROOM.EVENTS.MESSAGE_SENT, message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}