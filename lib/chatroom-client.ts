'use client';

import PusherClient, { PresenceChannel } from 'pusher-js';
import { initPusherClient, UserInfo } from './pusher-client';
import { CHATROOM } from './constants';

// Detect browser environment
const isBrowser = typeof window !== 'undefined';

// Event handler types
export interface Message {
  id: string;
  role: string;
  address: string;
  nickname: string;
  content: string;
  timestamp: number;
  tips: number;
}

export interface TipEvent {
  messageId: string;
  senderAddress: string;
  recipientAddress: string;
  timestamp: number;
}

export interface Member {
  id: string;
  info: UserInfo;
}

interface TransferRequestData {
  amount: number;
  from: string;
  fromNickname: string;
  to: string;
  toNickname: string;
  messageId: string;
}

export interface ChatroomEventHandlers {
  userInfo: UserInfo;
  onConnect?: () => void;
  onMessageReceived?: (data: Message) => void;
  onTipReceived?: (data: TipEvent) => void;
  onSubscriptionSucceeded?: (members: { [userId: string]: Member }) => void;
  onMemberAdded?: (member: Member) => void;
  onMemberRemoved?: (member: Member) => void;
  onDisconnect?: () => void;
  onTransferRequest?: (data: TransferRequestData) => void;
  onError?: (error: Error) => void;
}

/**
 * Subscribe to the chatroom channel and register event handlers
 */
export function subscribeToChatroomEvents(handlers: ChatroomEventHandlers): () => void {
  if (!isBrowser) return () => { };

  console.log('Initializing chatroom subscription with user info:', handlers.userInfo);

  const pusher = initPusherClient(handlers.userInfo);
  if (!pusher) {
    console.error('Failed to initialize Pusher client for chatroom');
    return () => { };
  }

  // Force reconnect if not connected
  if (pusher.connection.state !== 'connected') {
    console.log('Pusher not connected, connecting now...');
    pusher.connect();
  }

  console.log('Current connection state:', pusher.connection.state);
  console.log('Attempting to subscribe to channel:', CHATROOM.CHANNEL);

  // Subscribe to the presence channel
  const channel = pusher.subscribe(CHATROOM.CHANNEL) as PresenceChannel;
  console.log('Subscribing to presence channel:', CHATROOM.CHANNEL);

  // Log all events for debugging
  channel.bind_global((event: string, data: any) => {
    console.log(`Received event ${event} on channel ${CHATROOM.CHANNEL}:`, data);
  });

  // Handle presence events
  channel.bind('pusher:subscription_succeeded', (members: any) => {
    console.log('Successfully subscribed to presence channel. Current members:', members);
    handlers.onSubscriptionSucceeded?.(members);
  });

  channel.bind('pusher:subscription_error', (error: any) => {
    console.error('Failed to subscribe to presence channel:', error);
    if (handlers.onError) {
      handlers.onError(new Error('Failed to subscribe to presence channel: ' + error));
    }
  });

  if (handlers.onMemberAdded) {
    channel.bind('pusher:member_added', (member: Member) => {
      console.log('Member added:', member);
      handlers.onMemberAdded!(member);
    });
  }

  if (handlers.onMemberRemoved) {
    channel.bind('pusher:member_removed', (member: Member) => {
      console.log('Member removed:', member);
      handlers.onMemberRemoved!(member);
    });
  }

  // Register message event handler
  if (handlers.onMessageReceived) {
    console.log('Binding message event handler for:', CHATROOM.EVENTS.MESSAGE_SENT);
    channel.bind(CHATROOM.EVENTS.MESSAGE_SENT, (data: Message) => {
      console.log('Received message event:', data);
      handlers.onMessageReceived!(data);
    });
  }

  // Register tip event handler
  if (handlers.onTipReceived) {
    channel.bind(CHATROOM.EVENTS.TIP_SENT, (data: TipEvent) => {
      console.log('Received tip event:', data);
      handlers.onTipReceived!(data);
    });
  }

  // Register transfer request handler
  if (handlers.onTransferRequest) {
    console.log('Binding transfer request handler for:', CHATROOM.EVENTS.TRANSFER_REQUEST);
    channel.bind(CHATROOM.EVENTS.TRANSFER_REQUEST, (data: TransferRequestData) => {
      console.log('Received transfer request:', data);
      handlers.onTransferRequest!(data);
    });
  }

  // Add connection state handlers
  if (handlers.onConnect) {
    pusher.connection.bind('connected', () => {
      console.log('Connection established');
      handlers.onConnect!();
    });
  }

  if (handlers.onDisconnect) {
    pusher.connection.bind('disconnected', () => {
      console.log('Connection lost');
      if (handlers.onDisconnect) handlers.onDisconnect();
    });
  }

  if (handlers.onError) {
    pusher.connection.bind('error', (error: Error) => {
      console.error('Connection error:', error);
      handlers.onError!(error);
    });
  }

  // Return cleanup function
  return () => {
    console.log('Cleaning up channel subscriptions');
    channel.unbind_all();
    if (handlers.onConnect) pusher.connection.unbind('connected', handlers.onConnect);
    if (handlers.onDisconnect) pusher.connection.unbind('disconnected', handlers.onDisconnect);
    if (handlers.onError) pusher.connection.unbind('error', handlers.onError);
    pusher.unsubscribe(CHATROOM.CHANNEL);
  };
}