import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import pusher, { triggerPusherEvent } from '@/lib/pusher';
import { CHATROOM } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { messageId, senderAddress, recipientAddress } = await request.json();

    // Basic validation
    if (!messageId || !senderAddress || !recipientAddress) {
      return NextResponse.json(
        { error: 'MessageId, senderAddress, and recipientAddress are required' },
        { status: 400 }
      );
    }

    // Verify message exists
    const messages = await kv.lrange('chatroom:messages', 0, -1).then(messages =>
      messages.map(msg => typeof msg === 'string' ? JSON.parse(msg) : msg)
    ) || [];

    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get recipient user data
    const userData = await kv.hget('chatroom:users', recipientAddress);
    if (!userData) {
      return NextResponse.json(
        { error: 'Recipient user not found' },
        { status: 404 }
      );
    }

    const user = typeof userData === 'string' ? JSON.parse(userData) : userData;

    // Update message tips
    const updatedMessage = { ...messages[messageIndex], tips: (messages[messageIndex].tips || 0) + 1 };
    await kv.lset('chatroom:messages', messageIndex, JSON.stringify(updatedMessage));

    // Update user total tips
    user.totalTips = (user.totalTips || 0) + 1;
    await kv.hset('chatroom:users', { [recipientAddress]: JSON.stringify(user) });

    // Create tip event
    const tipEvent = {
      messageId,
      senderAddress,
      recipientAddress,
      timestamp: Date.now()
    };

    // Log tip to history
    await kv.lpush('chatroom:tips', JSON.stringify(tipEvent));

    // Cap the number of tips to store
    const tipCount = await kv.llen('chatroom:tips');
    if (tipCount > 1000) {
      await kv.ltrim('chatroom:tips', 0, 999);
    }

    // Broadcast tip event
    await triggerPusherEvent(
      CHATROOM_CHANNEL,
      CHATROOM_EVENTS.TIP_SENT,
      tipEvent
    );

    return NextResponse.json({
      success: true,
      tip: tipEvent
    });

  } catch (error) {
    console.error('Error processing tip:', error);
    return NextResponse.json(
      { error: 'Failed to process tip' },
      { status: 500 }
    );
  }
}