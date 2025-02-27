import { NextResponse } from 'next/server';
import { authenticateChannel } from '@/lib/pusher';

export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const socketId = data.get('socket_id') as string;
        const channel = data.get('channel_name') as string;

        // Basic validation
        if (!socketId || !channel) {
            return NextResponse.json(
                { error: 'Socket ID and channel name are required' },
                { status: 400 }
            );
        }

        // For presence channels, we need to validate the user and provide user info
        if (channel.startsWith('presence-')) {
            console.log('Processing presence channel auth request');

            // Extract user address and info from the request
            const address = data.get('user_address') as string;
            const nickname = data.get('nickname') as string;
            const totalTips = Number(data.get('totalTips')) || 0;
            const joined = Number(data.get('joined')) || Date.now();

            console.log('Auth request data:', {
                address,
                nickname,
                totalTips,
                joined,
                socketId,
                channel
            });

            if (!address) {
                console.error('Missing user address in auth request');
                return NextResponse.json(
                    { error: 'User address is required for presence channels' },
                    { status: 400 }
                );
            }

            if (!nickname) {
                console.error('Missing nickname in auth request');
                return NextResponse.json(
                    { error: 'Nickname is required for presence channels' },
                    { status: 400 }
                );
            }

            // Create presence data
            const presenceData = {
                user_id: address,
                user_info: {
                    nickname,
                    totalTips,
                    joined
                }
            };

            console.log('Generated presence data:', presenceData);

            // Authenticate with presence data
            const auth = authenticateChannel(socketId, channel, presenceData);
            if (!auth) {
                console.error('Channel authentication failed');
                return NextResponse.json(
                    { error: 'Failed to authenticate channel' },
                    { status: 500 }
                );
            }

            console.log('Channel authentication successful:', auth);
            return NextResponse.json(auth);
        }

        // For private channels
        const auth = authenticateChannel(socketId, channel);
        if (!auth) {
            return NextResponse.json(
                { error: 'Failed to authenticate channel' },
                { status: 500 }
            );
        }

        return NextResponse.json(auth);

    } catch (error) {
        console.error('Error authenticating Pusher channel:', error);
        return NextResponse.json(
            { error: 'Failed to authenticate channel' },
            { status: 500 }
        );
    }
} 