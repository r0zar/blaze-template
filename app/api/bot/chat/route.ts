import { NextResponse } from 'next/server';
import { Message } from '@/lib/chatroom-client';
import { PointsService } from '@/lib/points-service';
import Anthropic from '@anthropic-ai/sdk';
import { pusherServer } from '@/lib/pusher-server';
import { CHATROOM } from '@/lib/constants';
import * as kvStore from '@/lib/kv';

// Add this line if it doesn't already exist in PointsService
// This is a mock implementation if needed
// PointsService.updateRules = async (rules: string) => { /* Implementation */ };

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: CLAUDE_API_KEY
});

async function buildSystemPrompt() {
    // Get current rules from KV store
    const rules = await PointsService.getCurrentRules();

    // Get all known wallets
    const walletAddresses = await kvStore.getTrackedWallets();
    const knownUsers = walletAddresses.join('\n');

    return `You are the chatroom host, facilitating a game where users compete for points.
keep your responses very short, almost uninterested. let ppl know they can tip each other welsh tokens.

Current Game Rules:
${rules}

Known Wallet Addresses:
${knownUsers}

Your Role:
1. Help users understand and follow the rules
2. Process natural language tip requests between users using the requestTransfer tool
3. Track points and maintain game state
4. Consider rule proposals and implement fair ones using the changeGameRules tool

When you detect a tip request:
- Use the requestTransfer tool with the amount and recipient
- Confirm the action to the user
- Be encouraging and positive about tipping

When users propose rule changes:
- Evaluate if the proposal is fair for all players
- If the proposal meets these criteria, use the changeGameRules tool
- If not, explain why the proposal can't be accepted
- Be diplomatic but firm about keeping the game balanced

Keep responses concise and encouraging.
Focus on making the game fun and fair for everyone.`;
}

export async function POST(req: Request) {
    try {
        const { message, chatContext }: {
            message: Message,
            chatContext: Message[]
        } = await req.json();

        if (!CLAUDE_API_KEY) {
            throw new Error('Claude API key not configured');
        }

        // Build dynamic system prompt with current state
        const systemPrompt = await buildSystemPrompt();

        // Format recent chat context
        const recentMessages = chatContext.slice(-5).map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user' as const,
            content: msg.role === 'assistant' ? msg.content : `${msg.nickname}: ${msg.content}`
        }));

        // Add the current message
        recentMessages.push({
            role: 'user' as const,
            content: `${message.nickname}: ${message.content}`
        });

        // Get Claude's response with tool calling
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 150,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: `${message.nickname}: ${message.content}`
                }
            ],
            temperature: 0.7,
            tools: [
                {
                    name: 'requestTransfer',
                    description: 'Request a transfer of WELSH tokens between users',
                    input_schema: {
                        type: 'object',
                        properties: {
                            amount: {
                                type: 'integer',
                                description: 'Amount of WELSH tokens to transfer'
                            },
                            recipientNickname: {
                                type: 'string',
                                description: 'Nickname of the recipient'
                            }
                        },
                        required: ['amount', 'recipientNickname']
                    }
                },
                {
                    name: 'changeGameRules',
                    description: 'Update the game rules based on player suggestions',
                    input_schema: {
                        type: 'object',
                        properties: {
                            newRules: {
                                type: 'string',
                                description: 'The new set of game rules to implement'
                            },
                            reason: {
                                type: 'string',
                                description: 'Justification for the rule change'
                            }
                        },
                        required: ['newRules', 'reason']
                    }
                }
            ]
        });

        let claudeResponse = '';
        let toolCallProcessed = false;

        // Process each content item
        for (const content of response.content) {
            if (content.type === 'text') {
                claudeResponse += content.text;
            } else if (content.type === 'tool_use') {
                const toolUse = content;
                if (toolUse.name === 'requestTransfer') {
                    const { amount, recipientNickname } = toolUse.input as { amount: number, recipientNickname: string };

                    // Find recipient's address from chat context
                    const recipient = chatContext.find(msg =>
                        msg.nickname && msg.nickname.toLowerCase() === recipientNickname.toLowerCase()
                    );

                    if (recipient) {
                        // Trigger transfer request event
                        await pusherServer.trigger(CHATROOM.CHANNEL, CHATROOM.EVENTS.TRANSFER_REQUEST, {
                            amount: amount,
                            from: message.address,
                            fromNickname: message.nickname,
                            to: recipient.address,
                            toNickname: recipient.nickname,
                            messageId: message.id
                        });

                        toolCallProcessed = true;
                    } else {
                        claudeResponse += `\n(I couldn't find a user with the nickname "${recipientNickname}")`;
                    }
                } else if (toolUse.name === 'changeGameRules') {
                    const { newRules, reason } = toolUse.input as { newRules: string, reason: string };

                    // Validate that the rules include WELSH tipping
                    const includesWelshTipping = newRules.toLowerCase().includes('welsh') &&
                        newRules.toLowerCase().includes('tip');

                    if (includesWelshTipping) {
                        // Update the game rules in the KV store
                        await PointsService.updateGameRules({
                            customRules: [newRules],
                            lastModified: Date.now(),
                            modifiedBy: message.nickname
                        }, message.nickname);

                        // Notify all users of the rule change
                        await pusherServer.trigger(CHATROOM.CHANNEL, CHATROOM.EVENTS.MESSAGE_SENT, {
                            role: 'assistant',
                            address: message.address,
                            nickname: 'GameMaster',
                            content: `The game rules have been updated! \n${newRules}`,
                            timestamp: Date.now(),
                            tips: 0
                        });

                        toolCallProcessed = true;
                        claudeResponse += `\n(The game rules have been updated)`;
                    } else {
                        claudeResponse += `\n(I can't accept these rules as they don't include WELSH tipping as a core component. Please make sure tipping is included in your rule proposal.)`;
                    }
                }
            }
        }

        // Record participation
        await PointsService.recordParticipation(message.address);

        return NextResponse.json({ content: claudeResponse || 'ok' });

    } catch (error) {
        console.error('Bot chat error:', error);
        return NextResponse.json(
            { error: 'Failed to process bot response' },
            { status: 500 }
        );
    }
}