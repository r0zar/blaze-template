import { Message } from './chatroom-client';

export const BOT_INFO = {
    address: 'bot-host',
    nickname: 'GameMaster',
    totalTips: 0,
    joined: Date.now()
};

interface BotResponse {
    content: string;
    isAction?: boolean;
}

export class ChatBot {
    private static messageHistory: Message[] = [];

    static addToHistory(message: Message) {
        this.messageHistory.push(message);
        // Keep last 10 messages for context
        if (this.messageHistory.length > 10) {
            this.messageHistory.shift();
        }
    }

    static async processMessage(message: Message): Promise<BotResponse | null> {
        return null;
        // Add message to history
        this.addToHistory(message);

        console.log('Processing message:', message);

        // Don't respond to system messages
        if (message.address === 'system') return null;

        // Don't respond to bot's own messages
        if (message.address === BOT_INFO.address) return null;

        try {
            const response = await fetch('/api/bot/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    chatContext: this.messageHistory
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get bot response');
            }

            const data = await response.json();
            return {
                content: data.content,
                isAction: data.content.startsWith('*') && data.content.endsWith('*')
            };
        } catch (error) {
            console.error('Error getting bot response:', error);
            return {
                content: "🤖 Oops! I'm having trouble thinking right now. Give me a moment!"
            };
        }
    }
} 