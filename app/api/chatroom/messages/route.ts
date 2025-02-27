import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Get all messages and users from KV store
export async function GET() {
  try {
    // Get messages from KV store
    const messages = await kv.lrange('chatroom:messages', 0, -1).then(messages =>
      messages.map(msg => typeof msg === 'string' ? JSON.parse(msg) : msg)
    ) || [];

    // Get users from KV store
    const users = await kv.hgetall('chatroom:users') || {};

    // Format users as array
    const usersArray = Object.entries(users).map(([address, userData]) => {
      const user = typeof userData === 'string' ? JSON.parse(userData) : userData;
      return {
        address,
        nickname: user.nickname,
        totalTips: user.totalTips || 0,
        joined: user.joined
      };
    });

    return NextResponse.json({
      messages,
      users: usersArray
    });
  } catch (error) {
    console.error('Error fetching chatroom data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chatroom data' },
      { status: 500 }
    );
  }
}