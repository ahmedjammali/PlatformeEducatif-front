// models/chat.model.ts
import { User } from './user.model';

export interface ChatMessage {
  _id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Chat {
  _id?: string;
  student: User | string;
  title: string;
  messages: ChatMessage[];
  isActive: boolean;
  lastMessageAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateChatRequest {
  title?: string;
}

export interface CreateChatResponse {
  _id: string;
  student: string;
  title: string;
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  success: boolean;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  chat: {
    id: string;
    title: string;
    messageCount: number;
  };
  timing?: {
    total: number;
    aiCall: number;
  };
}

export interface UpdateChatTitleRequest {
  title: string;
}

export interface UpdateChatTitleResponse {
  success: boolean;
  chat: Chat;
}

export interface DeleteChatResponse {
  success: boolean;
  message: string;
}

// For real-time typing indicator
export interface TypingStatus {
  chatId: string;
  isTyping: boolean;
  timestamp: Date;
}

// For chat list display
export interface ChatListItem {
  _id: string;
  title: string;
  lastMessageAt: Date;
  messageCount: number;
  lastMessage?: {
    content: string;
    role: 'user' | 'assistant' | 'system';
    timestamp: Date;
  };
}