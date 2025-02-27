'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Wallet, ArrowUpCircle, Trophy, Heart, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBlaze } from '@/contexts/blaze/BlazeContext';
import { subscribeToChatroomEvents } from '@/lib/chatroom-client';
import { formatAddress, isValidStacksAddress } from '@/utils/formatters';
import blaze from 'blaze-sdk';
import { ChatBot, BOT_INFO } from '@/lib/bot-service';
import { PointsService } from '@/lib/points-service';

// Message structure
interface Message {
  id: string;
  address: string;
  nickname: string;
  content: string;
  timestamp: number;
  tips: number;
}

// Grouped message interface for rendering
interface GroupedMessage {
  id: string;
  address: string;
  nickname: string;
  messages: { id: string, content: string, timestamp: number, tips: number }[];
  isFirst: boolean;
}

interface UserProfile {
  address: string;
  nickname: string;
  totalTips: number;
  joined: number;
  points?: number;
}

export default function ChatroomPage() {
  // Blaze context for wallet and balance
  const {
    isWalletConnected,
    balances,
    executeTransfer
  } = useBlaze();

  // State for messages and user management
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [nickname, setNickname] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nickname') || '';
    }
    return '';
  });
  const [hasJoined, setHasJoined] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userScores, setUserScores] = useState<Record<string, number>>({});

  // Get current user wallet address
  const currentAddress = isWalletConnected ? blaze.getWalletAddress() : null;

  // Save nickname to localStorage when it changes
  useEffect(() => {
    if (nickname) {
      localStorage.setItem('nickname', nickname);
    }
  }, [nickname]);

  // Set up realtime events
  useEffect(() => {
    if (!hasJoined || !currentAddress || !nickname) return;

    console.log('Setting up chatroom events with:', {
      address: currentAddress,
      nickname: nickname,
      hasJoined: hasJoined
    });

    const cleanup = subscribeToChatroomEvents({
      userInfo: {
        nickname: nickname,
        totalTips: 0,
        joined: Date.now()
      },
      onConnect: () => {
        console.log('Connected to chatroom channel with user:', {
          address: currentAddress,
          nickname: nickname
        });
      },
      onMessageReceived: async (data) => {
        setMessages(prev => [...prev, data]);

        // Process bot response
        const botResponse = await ChatBot.processMessage(data);
        if (botResponse) {
          const botMessage: Message = {
            id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            address: BOT_INFO.address,
            nickname: BOT_INFO.nickname,
            content: botResponse.content,
            timestamp: Date.now(),
            tips: 0
          };

          // Add slight delay for bot response
          setTimeout(() => {
            setMessages(prev => [...prev, botMessage]);
          }, 1000);
        }
      },
      onTransferRequest: async (data) => {
        // Only handle transfer requests for the current user
        if (data.from === currentAddress) {
          console.log('Processing transfer request:', data);

          try {
            // Convert to microWELSH (assuming 6 decimals)
            const microAmount = data.amount * 1_000_000;
            console.log('Executing transfer:', {
              amount: data.amount,
              microAmount,
              to: data.to,
              toNickname: data.toNickname
            });

            // Execute the transfer
            await executeTransfer(microAmount, data.to);
            toast.success(`Transfer of ${data.amount} WELSH to ${data.toNickname} initiated! Waiting for confirmation...`);
          } catch (error: any) {
            console.error('Transfer error:', error);
            toast.error(`Failed to initiate transfer: ${error.message || 'Unknown error'}`);
          }
        }
      },
      onTipReceived: (data) => {
        // Update message and user data when tips are received
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.messageId ? { ...msg, tips: msg.tips + 1 } : msg
          )
        );

        setUsers(prev =>
          prev.map(user =>
            user.address === data.recipientAddress
              ? { ...user, totalTips: user.totalTips + 1 }
              : user
          )
        );

        // Show toast for current user receiving tips
        if (data.recipientAddress === currentAddress) {
          toast.success(`You received a 1 WELSH tip!`);
        }
      },
      onSubscriptionSucceeded: (members) => {
        console.log('Successfully subscribed to presence channel with members:', members);
        console.log('Current user info:', {
          address: currentAddress,
          nickname: nickname
        });

        // Get the members object from the Pusher Members instance
        const membersObj = members.members || {};
        console.log('Members object:', membersObj);

        const memberArray = Object.entries(membersObj).map(([address, member]: [string, any]) => {
          console.log('Processing member:', { address, member });
          const memberInfo = {
            address,
            nickname: member.nickname,
            totalTips: member.total_tips || 0,
            joined: member.joined
          };
          console.log('Processed member info:', memberInfo);
          return memberInfo;
        });

        // Add bot to the users list
        memberArray.push({
          address: BOT_INFO.address,
          nickname: BOT_INFO.nickname,
          totalTips: BOT_INFO.totalTips,
          joined: BOT_INFO.joined
        });

        console.log('Final member array with bot:', memberArray);
        setUsers(memberArray);

        // Add bot welcome message
        const welcomeMessage: Message = {
          id: `bot-welcome-${Date.now()}`,
          address: BOT_INFO.address,
          nickname: BOT_INFO.nickname,
          content: `👋 Welcome to the chatroom, ${nickname}! Type !help to see available commands.`,
          timestamp: Date.now(),
          tips: 0
        };
        setMessages(prev => [...prev, welcomeMessage]);
      },
      onMemberAdded: (member) => {
        console.log('Member added:', member);
        const newUser = {
          address: member.id,
          nickname: member.info.nickname,
          totalTips: member.info.totalTips,
          joined: member.info.joined
        };
        console.log('Adding new user to list:', newUser);
        setUsers(prev => {
          const updated = [...prev, newUser];
          console.log('Updated users list:', updated);
          return updated;
        });
        // Add system message
        const systemMsg: Message = {
          id: `system-${Date.now()}`,
          address: 'system',
          nickname: 'System',
          content: `${member.info.nickname} has joined the chat!`,
          timestamp: Date.now(),
          tips: 0
        };
        setMessages(prev => [...prev, systemMsg]);
      },
      onMemberRemoved: (member) => {
        console.log('Member removed:', member);
        setUsers(prev => prev.filter(user => user.address !== member.id));
        // Add system message
        const systemMsg: Message = {
          id: `system-${Date.now()}`,
          address: 'system',
          nickname: 'System',
          content: `${member.info.nickname} has left the chat`,
          timestamp: Date.now(),
          tips: 0
        };
        setMessages(prev => [...prev, systemMsg]);
      },
      onDisconnect: () => {
        console.log('Disconnected from chatroom');
        setHasJoined(false);
      }
    });

    // Get initial messages
    fetch('/api/chatroom/messages')
      .then(res => res.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(err => console.error('Failed to load chat history:', err));

    return cleanup;
  }, [hasJoined, currentAddress, nickname]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join the chatroom
  const handleJoin = async () => {
    if (!isWalletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!nickname.trim()) {
      toast.error('Please enter a nickname');
      return;
    }

    try {
      setHasJoined(true);
      toast.success('Welcome to the chatroom!');
    } catch (error) {
      console.error('Error joining chatroom:', error);
      toast.error('Failed to join the chatroom');
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!isWalletConnected || !hasJoined) return;
    if (!messageInput.trim()) return;

    try {
      const messageData = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        address: currentAddress,
        nickname: nickname,
        content: messageInput,
        timestamp: Date.now()
      };

      const response = await fetch('/api/chatroom/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) throw new Error('Failed to send message');

      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Send a tip to a message author
  const handleSendTip = async (messageId: string, recipientAddress: string) => {
    if (!isWalletConnected || recipientAddress === currentAddress) return;

    try {
      // First, execute the blockchain transfer but don't record the tip yet
      await executeTransfer(1000000, recipientAddress); // 1 WELSH = 1000000
      toast.success('Transfer initiated! Waiting for confirmation...');

      // The tip will be recorded when we receive the mempool event via Pusher
      // We no longer need to call the /api/chatroom/tip endpoint here
      // It will be handled by the Pusher event handler

    } catch (error) {
      console.error('Error sending tip:', error);
      toast.error('Failed to initiate transfer');
    }
  };

  // Clean up user data when leaving
  const handleLeave = () => {
    setHasJoined(false);
    setNickname('');
    toast.success('Successfully left the chatroom');
  };

  // Add cleanup on unmount or wallet disconnect
  useEffect(() => {
    if (!isWalletConnected && hasJoined) {
      handleLeave();
    }

    return () => {
      if (hasJoined) {
        handleLeave();
      }
    };
  }, [isWalletConnected, hasJoined]);

  // Add effect to fetch scores periodically
  useEffect(() => {
    if (!hasJoined) return;

    const fetchScores = async () => {
      try {
        const leaders = await fetch('/api/points/leaderboard').then(res => res.json());
        const scoreMap = leaders.reduce((acc: Record<string, number>, entry: any) => {
          acc[entry.address] = entry.score.points;
          return acc;
        }, {});
        setUserScores(scoreMap);
      } catch (error) {
        console.error('Failed to fetch scores:', error);
      }
    };

    // Fetch immediately and then every 30 seconds
    fetchScores();
    const interval = setInterval(fetchScores, 30000);

    return () => clearInterval(interval);
  }, [hasJoined]);

  // Group messages by sender
  const groupMessages = (messages: Message[]): GroupedMessage[] => {
    const grouped: GroupedMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const current = messages[i];

      // System messages are always standalone
      if (current.address === 'system') {
        grouped.push({
          id: current.id,
          address: current.address,
          nickname: current.nickname,
          messages: [{
            id: current.id,
            content: current.content,
            timestamp: current.timestamp,
            tips: current.tips
          }],
          isFirst: true
        });
        continue;
      }

      // Check if this message should be grouped with previous one
      const prev = grouped.length > 0 ? grouped[grouped.length - 1] : null;
      const shouldGroup = prev &&
        prev.address === current.address &&
        current.timestamp - prev.messages[prev.messages.length - 1].timestamp < 300000; // 5 minutes

      if (shouldGroup) {
        // Add to existing group
        prev.messages.push({
          id: current.id,
          content: current.content,
          timestamp: current.timestamp,
          tips: current.tips
        });
      } else {
        // Create new group
        grouped.push({
          id: current.id,
          address: current.address,
          nickname: current.nickname,
          messages: [{
            id: current.id,
            content: current.content,
            timestamp: current.timestamp,
            tips: current.tips
          }],
          isFirst: true
        });
      }
    }

    return grouped;
  };

  // Render grouped messages
  const renderGroupedMessage = (group: GroupedMessage) => (
    <div
      key={group.id}
      className={`p-3 rounded-lg ${group.address === 'system'
        ? 'bg-blue-900/20 text-center italic my-1'
        : group.address === BOT_INFO.address
          ? 'bg-purple-900/20 border border-purple-800 my-2'
          : group.address === currentAddress
            ? 'bg-green-900/20 border border-green-800 my-2'
            : 'bg-gray-900/40 border border-gray-800 my-2'
        }`}
    >
      {group.address !== 'system' && (
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${group.address === BOT_INFO.address
              ? 'bg-gradient-to-br from-purple-900/70 via-purple-900/50 to-pink-900/30'
              : 'bg-gradient-to-br from-red-900/70 via-red-900/50 to-yellow-900/30'
              }`}>
              {group.address === BOT_INFO.address ? (
                <span className="text-xs">🎮</span>
              ) : (
                <Wallet className="w-3 h-3 text-red-400" />
              )}
            </div>
            <span className="font-medium">{group.nickname}</span>
            {group.address !== BOT_INFO.address && (
              <span className="text-xs text-gray-400">{formatAddress(group.address)}</span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {new Date(group.messages[0].timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Render all messages in the group */}
      <div className="space-y-1">
        {group.messages.map((msg, idx) => (
          <div key={msg.id} className={group.address === 'system' ? 'text-sm' : ''}>
            <p>{msg.content}</p>

            {/* Only show tip button on the last message of a group */}
            {idx === group.messages.length - 1 &&
              group.address !== 'system' &&
              group.address !== currentAddress &&
              group.address !== BOT_INFO.address && (
                <div className="mt-1 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span>{msg.tips || 0}</span>
                  </div>
                  <button
                    onClick={() => handleSendTip(msg.id, group.address)}
                    className="flex items-center gap-1 py-0.5 px-2 text-xs bg-yellow-900/30 text-yellow-300 rounded-full hover:bg-yellow-800/40 transition-colors"
                  >
                    <ArrowUpCircle className="w-3 h-3" /> Tip 1
                  </button>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render user join form
  if (!hasJoined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md p-6 bg-white dark:bg-black/40 rounded-lg shadow-xl border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold mb-6 text-center">Join the Chatroom</h1>

          {!isWalletConnected ? (
            <div className="text-center mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-700 dark:text-yellow-200 mb-2">Connect your wallet to continue</p>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">Choose a nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                placeholder="Your nickname"
                maxLength={20}
              />

              <button
                onClick={handleJoin}
                disabled={!nickname.trim()}
                className="w-full mt-4 py-2 px-4 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-lg font-medium disabled:opacity-50"
              >
                Join Chatroom
              </button>
            </div>
          )}

          <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            <p>Tip chatters with WELSH tokens and compete for the most tips!</p>
          </div>
        </div>
      </div>
    );
  }

  // Group the messages for display
  const groupedMessages = groupMessages(messages);

  // Render main chatroom
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 flex flex-col">
        {/* Compact Header */}
        <div className="bg-black/40 border-b border-gray-800 p-2">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <h1 className="text-lg font-bold">Chatroom: Tip & Win</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="flex items-center gap-1 py-1 px-2 text-xs bg-yellow-900/40 text-yellow-200 rounded-full hover:bg-yellow-800/60 transition-colors"
              >
                <Trophy className="w-3 h-3" />
                {showLeaderboard ? 'Chat' : 'Ranks'}
              </button>
              <button
                onClick={handleLeave}
                className="flex items-center gap-1 py-1 px-2 text-xs bg-red-900/40 text-red-200 rounded-full hover:bg-red-800/60 transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Chat section */}
          <div className={`flex-1 p-2 ${showLeaderboard ? 'hidden md:block' : 'block'}`}>
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <div className="flex-1 border border-gray-800 bg-black/40 rounded-lg overflow-hidden flex flex-col">
                {/* Messages container - more compact spacing */}
                <div className="flex-1 p-2 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      No messages yet. Be the first to chat!
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {groupedMessages.map(renderGroupedMessage)}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message input - more compact */}
                <div className="p-2 border-t border-gray-800 bg-black/20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message here..."
                      className="flex-1 p-2 border border-gray-700 rounded-lg bg-gray-900 focus:outline-none focus:border-gray-600 text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="px-3 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-lg font-medium disabled:opacity-50 hover:from-red-600 hover:to-yellow-600 transition-colors text-sm"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Leaderboard */}
          <div className={`w-64 border-l border-gray-800 ${showLeaderboard ? 'block' : 'hidden md:block'}`}>
            <div className="h-full flex flex-col p-2">
              <div className="flex-1 flex flex-col">
                <h2 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Leaderboard ({users.length})
                </h2>

                {users.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
                    <p>No users have joined yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1 overflow-y-auto text-xs">
                    {[...users]
                      .sort((a, b) => (userScores[b.address] || 0) - (userScores[a.address] || 0))
                      .map((user, index) => (
                        <div
                          key={user.address}
                          className={`p-1.5 rounded-lg border ${user.address === currentAddress
                            ? 'bg-green-900/20 border-green-800'
                            : 'bg-gray-900/40 border-gray-800'
                            }`}
                        >
                          <div className="flex items-center gap-1">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-300 text-white font-bold text-xs">
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-medium truncate max-w-36">{user.nickname}</div>
                              <div className="flex justify-between">
                                <span className="text-yellow-400">{userScores[user.address] || 0}pts</span>
                                <span className="text-gray-400">{user.totalTips} tips</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* User Stats - Compact */}
              <div className="mt-2 p-2 border border-gray-800 bg-black/40 rounded-lg text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{nickname}</span>
                  <span>{formatAddress(currentAddress || '')}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <div>Points: {currentAddress ? userScores[currentAddress] || 0 : 0}</div>
                  <div>Tips: {users.find(u => u.address === currentAddress)?.totalTips || 0}</div>
                  <div className="col-span-2">
                    Balance: {currentAddress && balances[currentAddress]
                      ? Number(balances[currentAddress] / 10 ** 6).toLocaleString()
                      : 0} WELSH
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}