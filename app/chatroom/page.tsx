'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Wallet, ArrowUpCircle, Trophy, Heart, Star, MessageCircle, Settings, DoorClosed, DoorOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBlaze } from '@/contexts/blaze/BlazeContext';
import { subscribeToChatroomEvents } from '@/lib/chatroom-client';
import { formatAddress, isValidStacksAddress } from '@/utils/formatters';
import blaze from 'blaze-sdk';
import { ChatBot, BOT_INFO } from '@/lib/bot-service';
import { PointsService } from '@/lib/points-service';
import { Metadata } from 'next';

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

  // Window size tracking for responsive design
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Get current user wallet address
  const currentAddress = isWalletConnected ? blaze.getWalletAddress() : null;

  // Track window size for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine if we're on a large screen
  const isLargeScreen = windowWidth >= 1280;

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
          const botMessage = {
            id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            address: BOT_INFO.address,
            nickname: BOT_INFO.nickname,
            content: botResponse.content,
            timestamp: Date.now(),
            tips: 0
          };

          // Add slight delay for bot response
          setTimeout(async () => {
            try {
              // Send bot message through the API and wait for it to complete
              const response = await fetch('/api/chatroom/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(botMessage)
              });

              if (!response.ok) {
                throw new Error('Failed to send bot message');
              }
            } catch (err) {
              console.error('Failed to send bot message:', err);
            }
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

        // Send bot welcome message through the API
        const welcomeMessage = {
          id: `bot-welcome-${Date.now()}`,
          address: BOT_INFO.address,
          nickname: BOT_INFO.nickname,
          content: `👋 Welcome to the chatroom, ${nickname}! Type !help to see available commands.`,
          timestamp: Date.now(),
          tips: 0
        };

        // Wait for the welcome message to be sent before proceeding
        fetch('/api/chatroom/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(welcomeMessage)
        })
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to send welcome message');
            }
          })
          .catch(err => console.error('Failed to send welcome message:', err));
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
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-black to-gray-900">
        <div className="w-full max-w-md p-6 bg-black/70 backdrop-blur-sm rounded-lg shadow-xl border border-gray-800">
          <h1 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent">Join the Chatroom</h1>

          {!isWalletConnected ? (
            <div className="text-center mb-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-800/50">
              <p className="text-yellow-400 mb-2">Connect your wallet to continue</p>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium">Choose a nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-3 border border-gray-700 rounded-lg bg-gray-900/60 focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Your nickname"
                maxLength={20}
              />

              <button
                onClick={handleJoin}
                disabled={!nickname.trim()}
                className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-lg font-medium disabled:opacity-50 hover:from-red-600 hover:to-yellow-600 transition-all shadow-lg hover:shadow-red-500/20"
              >
                Join Chatroom
              </button>
            </div>
          )}

          <div className="text-sm text-gray-400 text-center mt-6 border-t border-gray-800 pt-4">
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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-black to-gray-900">
      <div className="flex-1 flex flex-col">
        {/* Improved Header */}
        <div className="bg-black/60 backdrop-blur-sm border-b border-gray-800 py-3 px-4 sticky top-0 z-10 shadow-lg">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <h1 className="text-xl font-bold bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-red-500" />
              Chatroom: Tip & Win
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`flex xl:hidden items-center gap-2 py-1.5 px-3 rounded-full transition-colors ${showLeaderboard
                  ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                  : 'bg-yellow-900/40 text-yellow-300 hover:bg-yellow-800/60'
                  }`}
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">{showLeaderboard ? 'Show Chat' : 'Leaderboard'}</span>
              </button>
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 py-1.5 px-3 bg-red-900/40 text-red-300 rounded-full hover:bg-red-800/60 transition-colors"
              >
                <DoorOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main content with better space utilization */}
        <div className="flex-1 flex">
          {/* Chat section */}
          <div className={`flex-1 p-4 ${showLeaderboard && !isLargeScreen ? 'hidden' : 'block'}`}>
            <div className={`mx-auto h-full flex flex-col ${isLargeScreen ? 'max-w-5xl' : 'max-w-4xl'}`}>
              <div className="flex-1 border border-gray-800 bg-black/40 backdrop-blur-sm rounded-lg overflow-hidden flex flex-col shadow-2xl">
                {/* Messages container */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <MessageCircle className="w-12 h-12 mx-auto text-gray-700 mb-4" />
                        <p className="text-lg">No messages yet. Be the first to chat!</p>
                        <p className="text-sm mt-2 text-gray-600">Try saying hello or mentioning @gm to talk to the game master.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupedMessages.map(renderGroupedMessage)}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Message input - improved */}
                <div className="p-4 border-t border-gray-800 bg-black/40">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message here..."
                      className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-900/80 focus:outline-none focus:border-red-500 text-sm transition-colors"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="px-4 bg-gradient-to-r from-red-500 to-yellow-500 text-white rounded-lg font-medium disabled:opacity-50 hover:from-red-600 hover:to-yellow-600 transition-colors shadow-lg"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Improved Leaderboard */}
          <div className={`${isLargeScreen ? 'w-80' : 'w-full'} ${showLeaderboard || isLargeScreen ? 'block' : 'hidden'} ${isLargeScreen ? 'border-l border-gray-800' : ''} p-4`}>
            <div className="h-full flex flex-col">
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Leaderboard
                  </h2>
                  <span className="bg-yellow-900/40 text-yellow-300 py-1 px-2 rounded-full text-xs">
                    {users.length} Players
                  </span>
                </div>

                {users.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <p>No users have joined yet.</p>
                      <p className="text-sm mt-2">Current user: {nickname}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
                    {[...users]
                      .sort((a, b) => (userScores[b.address] || 0) - (userScores[a.address] || 0))
                      .map((user, index) => (
                        <div
                          key={user.address}
                          className={`p-3 rounded-lg border ${user.address === currentAddress
                            ? 'bg-green-900/30 border-green-700'
                            : index < 3
                              ? 'bg-yellow-900/20 border-yellow-700/50'
                              : 'bg-gray-900/40 border-gray-800'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${index === 0
                              ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black'
                              : index === 1
                                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                                : index === 2
                                  ? 'bg-gradient-to-br from-yellow-700 to-yellow-900 text-white'
                                  : 'bg-gray-800 text-gray-200'
                              }`}>
                              {index + 1}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-medium truncate max-w-40">{user.nickname}</div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="flex items-center gap-1 text-yellow-400">
                                  <Star className="w-3 h-3 fill-yellow-400" />
                                  {userScores[user.address] || 0}
                                </span>
                                <span className="flex items-center gap-1 text-red-400">
                                  <Heart className="w-3 h-3 fill-red-400" />
                                  {user.totalTips}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Improved User Stats */}
              <div className="mt-4 p-4 border border-gray-800 bg-black/40 rounded-lg shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-lg">{nickname}</span>
                  <div className="bg-red-900/30 text-red-300 py-1 px-2 rounded-full text-xs">
                    {formatAddress(currentAddress || '')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 p-2 rounded border border-gray-800 flex flex-col items-center">
                    <Star className="w-5 h-5 text-yellow-500 mb-1" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-400">{currentAddress ? userScores[currentAddress] || 0 : 0}</div>
                      <div className="text-xs text-gray-400">Points</div>
                    </div>
                  </div>
                  <div className="bg-black/30 p-2 rounded border border-gray-800 flex flex-col items-center">
                    <Heart className="w-5 h-5 text-red-500 mb-1" />
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-400">{users.find(u => u.address === currentAddress)?.totalTips || 0}</div>
                      <div className="text-xs text-gray-400">Tips Received</div>
                    </div>
                  </div>
                  <div className="col-span-2 bg-black/30 p-2 rounded border border-gray-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Balance:</span>
                      <span className="font-semibold text-yellow-400">
                        {currentAddress && balances[currentAddress]
                          ? Number(balances[currentAddress] / 10 ** 6).toLocaleString()
                          : 0} WELSH
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Help Section */}
                <div className="mt-3 text-xs text-gray-500 bg-black/30 p-2 rounded border border-gray-800">
                  <p>• Type <span className="text-yellow-400">@gm</span> to talk to the Game Master</p>
                  <p>• Tip others to earn points and climb the ranks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}