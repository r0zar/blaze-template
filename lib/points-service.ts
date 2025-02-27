import { kv } from '@vercel/kv';

// Favor level thresholds
const FAVOR_LEVELS = {
    HIGH: 3,   // 3+ tips to bot
    MEDIUM: 1  // 1-2 tips to bot
    // 0 tips = LOW favor
};

interface PlayerScore {
    points: number;
    tipsGiven: number;
    tipsReceived: number;
    lastUpdated: number;
    botFavor: number; // Track favor with the bot
    [key: string]: number; // Add index signature for Record type
}

interface GameRules {
    tipMultiplier: number;
    participationPoints: number;
    customRules: string[];
    lastModified: number;
    modifiedBy: string;
}

export class PointsService {
    static async getPlayerScore(address: string): Promise<PlayerScore> {
        const score = await kv.hget<PlayerScore>('player-scores', address);
        return score || {
            points: 0,
            tipsGiven: 0,
            tipsReceived: 0,
            botFavor: 0,
            lastUpdated: Date.now()
        };
    }

    private static async getGameRules(): Promise<GameRules> {
        const rules = await kv.get<GameRules>('game-rules');
        return rules || {
            tipMultiplier: 10, // Each tip is worth 10 points by default
            participationPoints: 1, // Point for each message
            customRules: [],
            lastModified: Date.now(),
            modifiedBy: 'GameMaster'
        };
    }

    static async updateGameRules(newRules: Partial<GameRules>, modifier: string): Promise<GameRules> {
        const currentRules = await this.getGameRules();
        const updatedRules = {
            ...currentRules,
            ...newRules,
            lastModified: Date.now(),
            modifiedBy: modifier
        };
        await kv.set('game-rules', updatedRules);
        return updatedRules;
    }

    static async addPoints(address: string, points: number, reason: string): Promise<PlayerScore> {
        const score = await this.getPlayerScore(address);
        const updatedScore = {
            ...score,
            points: score.points + points,
            lastUpdated: Date.now()
        };
        await kv.hset('player-scores', { [address]: updatedScore });
        return updatedScore;
    }

    static async recordTip(from: string, to: string): Promise<void> {
        const [senderScore, recipientScore, rules] = await Promise.all([
            this.getPlayerScore(from),
            this.getPlayerScore(to),
            this.getGameRules()
        ]);

        // Update sender's score
        const updatedSenderScore = {
            ...senderScore,
            tipsGiven: senderScore.tipsGiven + 1,
            points: senderScore.points + Math.floor(rules.tipMultiplier / 2), // Half points for giving tips
            lastUpdated: Date.now()
        };

        // Update recipient's score
        const updatedRecipientScore = {
            ...recipientScore,
            tipsReceived: recipientScore.tipsReceived + 1,
            points: recipientScore.points + rules.tipMultiplier,
            lastUpdated: Date.now()
        };

        await kv.hset('player-scores', {
            [from]: updatedSenderScore,
            [to]: updatedRecipientScore
        });
    }

    static async recordParticipation(address: string): Promise<void> {
        const [score, rules] = await Promise.all([
            this.getPlayerScore(address),
            this.getGameRules()
        ]);

        const updatedScore = {
            ...score,
            points: score.points + rules.participationPoints,
            lastUpdated: Date.now()
        };

        await kv.hset('player-scores', { [address]: updatedScore });
    }

    static async getLeaderboard(): Promise<{ address: string; score: PlayerScore }[]> {
        const scores = await kv.hgetall<Record<string, PlayerScore>>('player-scores');
        if (!scores) return [];

        return Object.entries(scores)
            .map(([address, score]) => ({ address, score }))
            .sort((a, b) => b.score.points - a.score.points);
    }

    static async getCurrentRules(): Promise<string> {
        const rules = await this.getGameRules();
        return `🎮 Current Game Rules:
• Each tip given: ${Math.floor(rules.tipMultiplier / 2)} points
• Each tip received: ${rules.tipMultiplier} points
• Each message: ${rules.participationPoints} point
${rules.customRules.map(rule => '• ' + rule).join('\n')}

Last modified by: ${rules.modifiedBy}`;
    }

    static async getPlayerFavor(address: string): Promise<number> {
        const score = await this.getPlayerScore(address);
        return score.botFavor || 0;
    }

    static async getFavorLevel(address: string): Promise<'HIGH' | 'MEDIUM' | 'LOW'> {
        const favor = await this.getPlayerFavor(address);
        if (favor >= FAVOR_LEVELS.HIGH) return 'HIGH';
        if (favor >= FAVOR_LEVELS.MEDIUM) return 'MEDIUM';
        return 'LOW';
    }

    static async recordBotTip(from: string): Promise<void> {
        const [senderScore, rules] = await Promise.all([
            this.getPlayerScore(from),
            this.getGameRules()
        ]);

        // Update sender's score and favor with bonus points for bot tips
        const updatedSenderScore = {
            ...senderScore,
            tipsGiven: senderScore.tipsGiven + 1,
            points: senderScore.points + Math.floor(rules.tipMultiplier), // Full points for tipping bot
            botFavor: (senderScore.botFavor || 0) + 1,
            lastUpdated: Date.now()
        };

        await kv.hset('player-scores', {
            [from]: updatedSenderScore
        });
    }
} 