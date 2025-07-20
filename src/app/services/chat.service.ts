// services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError, tap, retry, timeout } from 'rxjs/operators';
import { BaseService } from './base.service';
import {
  Chat,
  ChatMessage,
  CreateChatRequest,
  CreateChatResponse,
  SendMessageRequest,
  SendMessageResponse,
  UpdateChatTitleRequest,
  UpdateChatTitleResponse,
  DeleteChatResponse,
  ChatListItem,
  TypingStatus
} from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService extends BaseService {
  private endpoint = '/chat';
  
  // State management for active chat
  private activeChatSubject = new BehaviorSubject<Chat | null>(null);
  public activeChat$ = this.activeChatSubject.asObservable();
  
  // State management for chat list
  private chatListSubject = new BehaviorSubject<ChatListItem[]>([]);
  public chatList$ = this.chatListSubject.asObservable();
  
  // Typing indicator
  private typingSubject = new BehaviorSubject<TypingStatus | null>(null);
  public typing$ = this.typingSubject.asObservable();
  
  // Loading states
  private sendingMessageSubject = new BehaviorSubject<boolean>(false);
  public sendingMessage$ = this.sendingMessageSubject.asObservable();

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Create a new chat session
   */
  createChat(request: CreateChatRequest = {}): Observable<Chat> {
    return this.http.post<CreateChatResponse>(
      `${this.apiUrl}${this.endpoint}`,
      request
    ).pipe(
      map(response => this.mapToChatModel(response)),
      tap(chat => {
        // Add to chat list
        this.addToChatList(chat);
        // Set as active chat
        this.setActiveChat(chat);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get all chats for the current student
   */
  getChats(): Observable<ChatListItem[]> {
    return this.http.get<Chat[]>(`${this.apiUrl}${this.endpoint}`)
      .pipe(
        map(chats => this.mapToChatListItems(chats)),
        tap(chatList => this.chatListSubject.next(chatList)),
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific chat with all messages
   */
  getChat(chatId: string): Observable<Chat> {
    return this.http.get<Chat>(`${this.apiUrl}${this.endpoint}/${chatId}`)
      .pipe(
        map(chat => this.mapToChatModel(chat)),
        tap(chat => this.setActiveChat(chat)),
        catchError(this.handleError)
      );
  }

  /**
   * Send a message to the AI
   */
  sendMessage(chatId: string, request: SendMessageRequest): Observable<SendMessageResponse> {
    this.sendingMessageSubject.next(true);
    this.setTyping(chatId, true);

    return this.http.post<SendMessageResponse>(
      `${this.apiUrl}${this.endpoint}/${chatId}/message`,
      request
    ).pipe(
      timeout(45000), // 45 second timeout for AI responses
      tap(response => {
        if (response.success) {
          this.updateActiveChatWithMessages(response);
          this.updateChatListItem(chatId, response);
        }
      }),
      tap(() => {
        this.sendingMessageSubject.next(false);
        this.setTyping(chatId, false);
      }),
      catchError(error => {
        this.sendingMessageSubject.next(false);
        this.setTyping(chatId, false);
        return this.handleError(error);
      })
    );
  }

  /**
   * Update chat title
   */
  updateChatTitle(chatId: string, request: UpdateChatTitleRequest): Observable<Chat> {
    return this.http.patch<UpdateChatTitleResponse>(
      `${this.apiUrl}${this.endpoint}/${chatId}/title`,
      request
    ).pipe(
      map(response => response.chat),
      tap(updatedChat => {
        // Update active chat if it's the same one
        const activeChat = this.activeChatSubject.value;
        if (activeChat && activeChat._id === chatId) {
          this.setActiveChat(updatedChat);
        }
        // Update in chat list
        this.updateChatListItemTitle(chatId, request.title);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Delete a chat
   */
  deleteChat(chatId: string): Observable<DeleteChatResponse> {
    return this.http.delete<DeleteChatResponse>(`${this.apiUrl}${this.endpoint}/${chatId}`)
      .pipe(
        tap(() => {
          // Remove from chat list
          this.removeChatFromList(chatId);
          // Clear active chat if it's the deleted one
          const activeChat = this.activeChatSubject.value;
          if (activeChat && activeChat._id === chatId) {
            this.clearActiveChat();
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Set the active chat
   */
  setActiveChat(chat: Chat | null): void {
    this.activeChatSubject.next(chat);
  }

  /**
   * Clear the active chat
   */
  clearActiveChat(): void {
    this.activeChatSubject.next(null);
  }

  /**
   * Get the current active chat
   */
  getActiveChat(): Chat | null {
    return this.activeChatSubject.value;
  }

  /**
   * Set typing indicator
   */
  setTyping(chatId: string, isTyping: boolean): void {
    this.typingSubject.next({
      chatId,
      isTyping,
      timestamp: new Date()
    });
  }

  /**
   * Check if currently sending a message
   */
  isSendingMessage(): boolean {
    return this.sendingMessageSubject.value;
  }

  /**
   * Refresh chat list
   */
  refreshChatList(): Observable<ChatListItem[]> {
    return this.getChats();
  }

  // Private helper methods

  private mapToChatModel(response: any): Chat {
    return {
      ...response,
      messages: response.messages?.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })) || [],
      lastMessageAt: new Date(response.lastMessageAt),
      createdAt: response.createdAt ? new Date(response.createdAt) : undefined,
      updatedAt: response.updatedAt ? new Date(response.updatedAt) : undefined
    };
  }

  private mapToChatListItems(chats: Chat[]): ChatListItem[] {
    return chats.map(chat => ({
      _id: chat._id!,
      title: chat.title,
      lastMessageAt: new Date(chat.lastMessageAt),
      messageCount: chat.messages?.length || 0,
      lastMessage: chat.messages && chat.messages.length > 0 ? {
        content: chat.messages[chat.messages.length - 1].content,
        role: chat.messages[chat.messages.length - 1].role,
        timestamp: new Date(chat.messages[chat.messages.length - 1].timestamp)
      } : undefined
    }));
  }

  private updateActiveChatWithMessages(response: SendMessageResponse): void {
    const activeChat = this.activeChatSubject.value;
    if (activeChat && activeChat._id === response.chat.id) {
      const updatedChat: Chat = {
        ...activeChat,
        messages: [
          ...activeChat.messages,
          {
            ...response.userMessage,
            timestamp: new Date(response.userMessage.timestamp)
          },
          {
            ...response.assistantMessage,
            timestamp: new Date(response.assistantMessage.timestamp)
          }
        ],
        lastMessageAt: new Date(response.assistantMessage.timestamp)
      };
      this.setActiveChat(updatedChat);
    }
  }

  private updateChatListItem(chatId: string, response: SendMessageResponse): void {
    const currentList = this.chatListSubject.value;
    const updatedList = currentList.map(item => {
      if (item._id === chatId) {
        return {
          ...item,
          messageCount: response.chat.messageCount,
          lastMessageAt: new Date(response.assistantMessage.timestamp),
          lastMessage: {
            content: response.assistantMessage.content,
            role: response.assistantMessage.role,
            timestamp: new Date(response.assistantMessage.timestamp)
          }
        } as ChatListItem;
      }
      return item;
    });
    this.chatListSubject.next(updatedList);
  }

  private addToChatList(chat: Chat): void {
    const currentList = this.chatListSubject.value;
    const newItem: ChatListItem = {
      _id: chat._id!,
      title: chat.title,
      lastMessageAt: chat.lastMessageAt,
      messageCount: chat.messages?.length || 0
    };
    this.chatListSubject.next([newItem, ...currentList]);
  }

  private updateChatListItemTitle(chatId: string, newTitle: string): void {
    const currentList = this.chatListSubject.value;
    const updatedList = currentList.map(item => 
      item._id === chatId ? { ...item, title: newTitle } : item
    );
    this.chatListSubject.next(updatedList);
  }

  private removeChatFromList(chatId: string): void {
    const currentList = this.chatListSubject.value;
    const updatedList = currentList.filter(item => item._id !== chatId);
    this.chatListSubject.next(updatedList);
  }

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 0) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.status === 401) {
        errorMessage = 'You are not authorized. Please log in again.';
      } else if (error.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'The requested chat was not found.';
      } else if (error.status === 408 ) {
        errorMessage = 'The AI is taking longer than usual to respond. Please try again.';
      } else if (error.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }

    console.error('Chat Service Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}