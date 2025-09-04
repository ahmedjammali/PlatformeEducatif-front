// student-chat.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Chat, ChatListItem, ChatMessage, SendMessageRequest, CreateChatRequest,UpdateChatTitleRequest } from '../../../models/chat.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-student-chat',
  templateUrl: './student-chat.component.html',
  styleUrls: ['./student-chat.component.css']
})
export class StudentChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageTextarea') messageTextarea!: ElementRef;
  @ViewChild('titleInput') titleInput!: ElementRef;

  // Component State
  currentUser: User | null = null;
  activeChat: Chat | null = null;
  chatList: ChatListItem[] = [];
  newMessage: string = '';
  loading = false;
  chatListLoading = false;
  sendingMessage = false;
  isTyping = false;
  error: string | null = null;
  loadingMessage = '';

  // UI State
  sidebarCollapsed = false;
  showTitleModal = false;
  editingTitle = '';
  editingChatId: string | null = null;

  // Subscriptions
  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
   showConfirmModal = false;
  confirmModalData: {
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    chatId?: string;
    chatTitle?: string;
  } | null = null;


  constructor(
    private chatService: ChatService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.setupSubscriptions();
    this.loadChatList();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  // Initialization Methods
  private loadCurrentUser(): void {
    // Get current user from auth service (synchronous)
    this.currentUser = this.authService.getCurrentUser();
    
    // Also listen to user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User | null) => {
          this.currentUser = user;
        },
        error: (error: any) => {
          console.error('Error loading current user:', error);
          this.showError('Erreur lors du chargement des informations utilisateur');
        }
      });
  }

  private setupSubscriptions(): void {
    // Subscribe to active chat changes
    this.chatService.activeChat$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chat => {
        this.activeChat = chat;
        if (chat) {
          this.shouldScrollToBottom = true;
        }
      });

    // Subscribe to chat list changes
    this.chatService.chatList$
      .pipe(takeUntil(this.destroy$))
      .subscribe(chatList => {
        this.chatList = chatList;
      });

    // Subscribe to sending message state
    this.chatService.sendingMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sending => {
        this.sendingMessage = sending;
        this.isTyping = sending;
      });

    // Subscribe to typing indicator
    this.chatService.typing$
      .pipe(takeUntil(this.destroy$))
      .subscribe(typing => {
        if (typing && typing.chatId === this.activeChat?._id) {
          this.isTyping = typing.isTyping;
        }
      });
  }

  // Chat Management Methods
  loadChatList(): void {
    this.chatListLoading = true;
    this.chatService.getChats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chats) => {
          this.chatListLoading = false;
        },
        error: (error) => {
          this.chatListLoading = false;
          this.showError('Erreur lors du chargement des conversations');
          console.error('Error loading chat list:', error);
        }
      });
  }

  createNewChat(): void {
    if (this.loading) return;

    // Close mobile sidebar when creating new chat
    this.mobileSidebarOpen = false;

    this.loading = true;
    this.loadingMessage = 'Création d\'une nouvelle conversation...';

    const request: CreateChatRequest = {
      title: 'Nouvelle discussion'
    };

    this.chatService.createChat(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat) => {
          this.loading = false;
          this.loadingMessage = '';
        },
        error: (error) => {
          this.loading = false;
          this.loadingMessage = '';
          this.showError('Erreur lors de la création de la conversation');
          console.error('Error creating chat:', error);
        }
      });
  }

  selectChat(chatId: string): void {
    if (this.activeChat?._id === chatId || this.loading) return;

    // Close mobile sidebar when selecting a chat
    this.mobileSidebarOpen = false;

    this.loading = true;
    this.loadingMessage = 'Chargement de la conversation...';

    this.chatService.getChat(chatId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chat) => {
          this.loading = false;
          this.loadingMessage = '';
          this.shouldScrollToBottom = true;
        },
        error: (error) => {
          this.loading = false;
          this.loadingMessage = '';
          this.showError('Erreur lors du chargement de la conversation');
          console.error('Error loading chat:', error);
        }
      });
  }


  deleteChat(chatId: string, event: Event): void {
    event.stopPropagation();
    
    // Find the chat title for better UX
    const chat = this.chatList.find(c => c._id === chatId);
    const chatTitle = chat ? chat.title : 'cette conversation';
    
    // Show confirmation modal instead of browser alert
    this.showDeleteConfirmation(chatId, chatTitle);
  }

  // New method to show delete confirmation
  showDeleteConfirmation(chatId: string, chatTitle: string): void {
    this.confirmModalData = {
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer "${chatTitle}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      chatId: chatId,
      chatTitle: chatTitle
    };
    this.showConfirmModal = true;
    
    // Prevent body scroll on mobile
    document.body.classList.add('modal-open');
  }

  // New method to handle confirmation
  confirmDeletion(): void {
    if (this.confirmModalData?.chatId) {
      const chatId = this.confirmModalData.chatId;
      
      this.chatService.deleteChat(chatId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // Service handles state updates automatically
            this.closeConfirmModal();
          },
          error: (error) => {
            this.showError('Erreur lors de la suppression de la conversation');
            console.error('Error deleting chat:', error);
            this.closeConfirmModal();
          }
        });
    }
  }

  // New method to close confirmation modal
  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmModalData = null;
    
    // Re-enable body scroll
    document.body.classList.remove('modal-open');
  }

  


  // Message Methods
  sendMessage(): void {
    if (!this.newMessage.trim() || !this.activeChat || this.sendingMessage) {
      return;
    }

    const messageContent = this.newMessage.trim();
    this.newMessage = '';
    this.shouldScrollToBottom = true;

    // Auto-resize textarea
    this.resetTextareaHeight();

    const request: SendMessageRequest = {
      message: messageContent
    };

    this.chatService.sendMessage(this.activeChat._id!, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.shouldScrollToBottom = true;
          // Update chat title if it's still default
          if (this.activeChat?.title === 'Nouvelle discussion' && response.success) {
            this.autoUpdateChatTitle(messageContent);
          }
        },
        error: (error) => {
          this.showError('Erreur lors de l\'envoi du message');
          console.error('Error sending message:', error);
        }
      });
  }

  sendSuggestion(suggestion: string): void {
    this.createNewChat();
    
    // Wait a bit for the chat to be created, then send the suggestion
    setTimeout(() => {
      if (this.activeChat) {
        this.newMessage = suggestion;
        this.sendMessage();
      }
    }, 500);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    } else if (event.key === 'Enter' && event.shiftKey) {
      // Allow new line
      this.autoResizeTextarea();
    } else {
      // Auto-resize on other key presses
      setTimeout(() => this.autoResizeTextarea(), 0);
    }
  }

  // Title Management
 editChatTitle(chatId: string, currentTitle: string, event: Event): void {
    event.stopPropagation();
    this.editingChatId = chatId;
    this.editingTitle = currentTitle;
    this.showTitleModal = true;
    
    // Prevent body scroll on mobile
    document.body.classList.add('modal-open');
    
    // Focus input after modal opens
    setTimeout(() => {
      if (this.titleInput) {
        this.titleInput.nativeElement.focus();
      }
    }, 100);
  }

  saveTitleEdit(): void {
    if (!this.editingTitle.trim() || !this.editingChatId) {
      return;
    }

    const request: UpdateChatTitleRequest = {
      title: this.editingTitle.trim()
    };

    this.chatService.updateChatTitle(this.editingChatId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cancelTitleEdit();
        },
        error: (error: any) => {
          this.showError('Erreur lors de la modification du titre');
          console.error('Error updating chat title:', error);
        }
      });
  }

  cancelTitleEdit(): void {
    this.showTitleModal = false;
    this.editingChatId = null;
    this.editingTitle = '';
    
    // Re-enable body scroll
    document.body.classList.remove('modal-open');
  }


  private autoUpdateChatTitle(firstMessage: string): void {
    if (!this.activeChat?._id) return;

    // Generate a title from the first message (max 50 chars)
    let title = firstMessage.length > 50 
      ? firstMessage.substring(0, 47) + '...'
      : firstMessage;

    const request: UpdateChatTitleRequest = { title };

    this.chatService.updateChatTitle(this.activeChat._id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error: any) => {
          console.error('Error auto-updating chat title:', error);
        }
      });
  }

  // UI Helper Methods
  toggleSidebar(): void {

    this.sidebarCollapsed = !this.sidebarCollapsed;

  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private autoResizeTextarea(): void {
    if (this.messageTextarea) {
      const textarea = this.messageTextarea.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  private resetTextareaHeight(): void {
    if (this.messageTextarea) {
      this.messageTextarea.nativeElement.style.height = 'auto';
    }
  }

  // Error Handling
  private showError(message: string): void {
    this.error = message;
    setTimeout(() => {
      this.clearError();
    }, 5000);
  }

  clearError(): void {
    this.error = null;
  }

  // Formatting Methods
  formatMessage(content: string): string {
    // Basic markdown-like formatting
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  formatTime(date: Date): string {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Maintenant';
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours}h`;
    } else {
      return messageDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
  }

  getMessagePreview(content: string): string {
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  }

  // TrackBy Functions
  trackByChatId(index: number, chat: ChatListItem): string {
    return chat._id;
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message._id || `${message.role}-${message.timestamp}-${index}`;
  }

  mobileSidebarOpen = false;

    toggleMobileSidebar(): void {
  this.mobileSidebarOpen = !this.mobileSidebarOpen;
  
  // Reset collapsed state when opening mobile sidebar
  if (this.mobileSidebarOpen) {
    this.sidebarCollapsed = false;
  }
}

    closeMobileSidebar(): void {
      this.mobileSidebarOpen = false;
    }
}