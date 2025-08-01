// teacher-notifications.component.ts
import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { 
  Notification, 
  NotificationFilters, 
  NotificationType, 
  NotificationPriority,
  TargetAudience , 
  CreateNotificationDTO, 
  UpdateNotificationDTO
} from '../../../models/notification.model';
import { Class } from '../../../models/class.model';
import { Subject as SubjectModel } from '../../../models/subject.model';

interface NotificationGroup {
  date: string;
  notifications: Notification[];
}


@Component({
  selector: 'app-teacher-notifications',
  templateUrl: './teacher-notifications.component.html',
  styleUrls: ['./teacher-notifications.component.css']
})


export class TeacherNotificationsComponent implements OnInit, OnDestroy {
  @Input() teacherClasses: Class[] = [];
  @Input() teachingSubjects: SubjectModel[] = [];

  private destroy$ = new Subject<void>();

  // Current user
  currentUser: any = null;

  // Data properties
  notifications: Notification[] = [];
  groupedNotifications: NotificationGroup[] = [];
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalNotifications = 0;
  limit = 20;
  
  // Loading states
  isLoading = false;
  isLoadingMore = false;
  
  // Filter properties
  filters: NotificationFilters = {
    page: 1,
    limit: 20
  };
  
  // Search
  searchTerm = '';
  
  // Filter options
  filterType: string = 'all';
  filterPriority: string = 'all';
  showUnreadOnly = false;
  
  // UI state
  selectedNotifications: Set<string> = new Set();
  showFilters = false;
  viewMode: 'list' | 'cards' = 'cards';
  
  // Modal for notification details
  selectedNotification: Notification | null = null;

  // Create/Edit notification modal
  showCreateModal = false;
  showEditModal = false;
  editingNotification: Notification | null = null;
  // Delete confirmation modal
  showDeleteModal = false;
  notificationToDelete: Notification | null = null;
  isDeleting = false;
  
  // Create notification form
  createForm: CreateNotificationDTO = {
    title: '',
    content: '',
    targetAudience: TargetAudience.SPECIFIC_CLASS,
    type: NotificationType.GENERAL,
    priority: NotificationPriority.MEDIUM
  };

  // File upload
  selectedFiles: File[] = [];
  uploadProgress = 0;
  isUploading = false;

  // Date validation properties
  dateValidationErrors = {
    publishDateInPast: false,
    expiryBeforePublish: false
  };

  // Enums for template
  readonly NotificationType = NotificationType;
  readonly NotificationPriority = NotificationPriority;
  readonly TargetAudience = TargetAudience;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadNotifications();
    this.setupRealtimeUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRealtimeUpdates(): void {
    this.notificationService.getNotificationUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        // Check if notification already exists to avoid duplicates
        const existingIndex = this.notifications.findIndex(n => n._id === notification._id);
        
        if (existingIndex === -1) {
          // Only add if it doesn't exist
          this.notifications.unshift(notification);
          this.groupNotificationsByDate();
        } else {
          // Update existing notification
          this.notifications[existingIndex] = notification;
          this.groupNotificationsByDate();
        }
      });
  }

  loadNotifications(reset: boolean = true): void {
    if (reset) {
      this.currentPage = 1;
      this.notifications = [];
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    this.filters.page = this.currentPage;

    const loadMethod = this.searchTerm ? 
      this.notificationService.searchNotifications(this.searchTerm, this.filters) :
      this.notificationService.getNotifications(this.filters);

    loadMethod
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.notifications) {
            // Filter notifications visible to this teacher
            const visibleNotifications = this.filterVisibleNotifications(response.notifications);

            if (reset) {
              this.notifications = visibleNotifications;
            } else {
              this.notifications.push(...visibleNotifications);
            }

            if (response.pagination) {
              this.totalPages = response.pagination.pages;
              this.totalNotifications = response.pagination.total;
              this.currentPage = response.pagination.currentPage;
            }

            this.groupNotificationsByDate();
          }
          
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      });
  }

  private filterVisibleNotifications(notifications: Notification[]): Notification[] {
    const currentUserId = this.currentUser?._id || this.currentUser?.id;
    const teacherClassIds = this.teacherClasses.map(c => c._id);

    return notifications.filter(notification => {
      // Always show notifications created by this teacher
      const createdById = typeof notification.createdBy === 'string' ? 
        notification.createdBy : notification.createdBy._id;
      
      if (createdById === currentUserId) {
        return true;
      }

      // Show notifications targeted to teachers or all
      if (notification.targetAudience === TargetAudience.ALL || 
          notification.targetAudience === TargetAudience.TEACHERS) {
        return true;
      }

      // Show notifications for specific classes that this teacher teaches
      if (notification.targetAudience === TargetAudience.SPECIFIC_CLASS && 
          notification.targetClass && 
          teacherClassIds.includes(notification.targetClass._id)) {
        return true;
      }

      return false;
    });
  }

  // Create notification methods
  openCreateModal(): void {
    this.showCreateModal = true;
    this.resetCreateForm();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetCreateForm();
  }

  private resetCreateForm(): void {
    this.createForm = {
      title: '',
      content: '',
      targetAudience: TargetAudience.SPECIFIC_CLASS,
      type: NotificationType.GENERAL,
      priority: NotificationPriority.MEDIUM,
      targetClass: undefined,
      publishDate: undefined,
      expiryDate: undefined
    };
    this.selectedFiles = [];
    this.uploadProgress = 0;
    this.isUploading = false;
    this.dateValidationErrors = {
      publishDateInPast: false,
      expiryBeforePublish: false
    };
  }

  createNotification(): void {
    if (!this.createForm.title.trim() || !this.createForm.content.trim()) {
      alert('Le titre et le contenu sont obligatoires');
      return;
    }

    if (!this.createForm.targetClass) {
      alert('Vous devez sélectionner une classe');
      return;
    }

    // Check date validation
    if (this.hasDateError()) {
      return;
    }

    this.isUploading = true;
    const createData: CreateNotificationDTO = {
      ...this.createForm,
      attachments: this.selectedFiles
    };

    if (this.selectedFiles.length > 0) {
      this.notificationService.uploadNotificationWithProgress(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (event) => {
            if (event.type === HttpEventType.UploadProgress) {
              if (event.total) {
                this.uploadProgress = Math.round(100 * event.loaded / event.total);
              }
            } else if (event.type === HttpEventType.Response) {
              const response = event.body;
              if (response && response.success && response.notification) {
                // Check if notification already exists (from real-time update)
                const existingIndex = this.notifications.findIndex(n => n._id === response.notification!._id);
                if (existingIndex === -1) {
                  this.notifications.unshift(response.notification);
                  this.groupNotificationsByDate();
                }
                this.closeCreateModal();
              }
              this.isUploading = false;
            }
          },
          error: (error) => {
            console.error('Error creating notification:', error);
            this.isUploading = false;
          }
        });
    } else {
      this.notificationService.createNotification(createData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success && response.notification) {
              // Check if notification already exists (from real-time update)
              const existingIndex = this.notifications.findIndex(n => n._id === response.notification!._id);
              if (existingIndex === -1) {
                this.notifications.unshift(response.notification);
                this.groupNotificationsByDate();
              }
              this.closeCreateModal();
            }
            this.isUploading = false;
          },
          error: (error) => {
            console.error('Error creating notification:', error);
            this.isUploading = false;
          }
        });
    }
  }

  // Edit notification methods
  openEditModal(notification: Notification): void {
    const createdById = typeof notification.createdBy === 'string' ? 
      notification.createdBy : notification.createdBy._id;
    const currentUserId = this.currentUser?._id || this.currentUser?.id;

    if (createdById !== currentUserId) {
      return;
    }

    this.editingNotification = notification;
    this.createForm = {
      title: notification.title,
      content: notification.content,
      type: notification.type,
      priority: notification.priority,
      targetAudience: notification.targetAudience,
      targetClass: notification.targetClass?._id,
      publishDate: notification.publishDate ? this.formatDateForInput(notification.publishDate) : undefined,
      expiryDate: notification.expiryDate ? this.formatDateForInput(notification.expiryDate) : undefined
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingNotification = null;
    this.resetCreateForm();
  }

  updateNotification(): void {
    if (!this.editingNotification || !this.createForm.title.trim() || !this.createForm.content.trim()) {
      return;
    }

    const updateData: UpdateNotificationDTO = {
      title: this.createForm.title,
      content: this.createForm.content,
      type: this.createForm.type,
      priority: this.createForm.priority,
      expiryDate: this.createForm.expiryDate
    };

    this.notificationService.updateNotification(this.editingNotification._id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.notification) {
            // Update the notification in the list (avoid duplicates from real-time updates)
            const index = this.notifications.findIndex(n => n._id === response.notification!._id);
            if (index !== -1) {
              this.notifications[index] = response.notification;
              this.groupNotificationsByDate();
            }
            this.closeEditModal();
          }
        },
        error: (error) => {
          console.error('Error updating notification:', error);
        }
      });
  }

  // Update this method to use the confirmation modal
  deleteNotification(notification: Notification): void {
    this.openDeleteModal(notification);
  }

  // Check if user can edit/delete notification
  canEditNotification(notification: Notification): boolean {
    const createdById = typeof notification.createdBy === 'string' ? 
      notification.createdBy : notification.createdBy._id;
    const currentUserId = this.currentUser?._id || this.currentUser?.id;
    return createdById === currentUserId;
  }

  private groupNotificationsByDate(): void {
    const groups: { [key: string]: Notification[] } = {};
    
    this.notifications.forEach(notification => {
      const date = new Date(notification.createdAt);
      const dateKey = this.getDateKey(date);
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notification);
    });

    this.groupedNotifications = Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        notifications: groups[date].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }));
  }

  private getDateKey(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Aujourd\'hui';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Hier';
    } else if (this.isThisWeek(date)) {
      return this.getDayName(date);
    } else {
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  private isThisWeek(date: Date): boolean {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return date >= weekStart && date <= today;
  }

  private getDayName(date: Date): string {
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.loadNotifications(true);
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onSearch(target.value);
  }

  hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.isRead);
  }

  onFilterChange(): void {
    this.filters = {
      page: 1,
      limit: this.limit,
      unreadOnly: this.showUnreadOnly || undefined,
      type: this.filterType !== 'all' ? this.filterType as NotificationType : undefined,
      priority: this.filterPriority !== 'all' ? this.filterPriority as NotificationPriority : undefined
    };
    
    this.loadNotifications(true);
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'list' ? 'cards' : 'list';
  }

  markAsRead(notification: Notification): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.isRead = true;
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const unreadIds = unreadNotifications.map(n => n._id);
    
    this.notificationService.markMultipleAsRead(unreadIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          unreadNotifications.forEach(n => n.isRead = true);
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  loadMore(): void {
    if (this.currentPage < this.totalPages && !this.isLoadingMore) {
      this.currentPage++;
      this.loadNotifications(false);
    }
  }

  onNotificationClick(notification: Notification): void {
    this.markAsRead(notification);
    this.openNotificationModal(notification);
  }

  toggleNotificationSelection(notificationId: string): void {
    if (this.selectedNotifications.has(notificationId)) {
      this.selectedNotifications.delete(notificationId);
    } else {
      this.selectedNotifications.add(notificationId);
    }
  }

  selectAllVisible(): void {
    this.notifications.forEach(n => this.selectedNotifications.add(n._id));
  }

  clearSelection(): void {
    this.selectedNotifications.clear();
  }

  markSelectedAsRead(): void {
    if (this.selectedNotifications.size === 0) return;

    const selectedIds = Array.from(this.selectedNotifications);
    
    this.notificationService.markMultipleAsRead(selectedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications
            .filter(n => this.selectedNotifications.has(n._id))
            .forEach(n => n.isRead = true);
          this.clearSelection();
        },
        error: (error) => {
          console.error('Error marking selected notifications as read:', error);
        }
      });
  }

  downloadAttachment(notification: Notification, filename: string): void {
    this.notificationService.downloadAttachment(notification._id, filename)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error downloading attachment:', error);
        }
      });
  }

  getNotificationIcon(type: NotificationType): string {
    const icons = {
      [NotificationType.GENERAL]: 'info',
      [NotificationType.CLASS]: 'users',
      [NotificationType.EXAM]: 'file-text',
      [NotificationType.SCHEDULE]: 'calendar',
      [NotificationType.ANNOUNCEMENT]: 'megaphone'
    };
    return icons[type] || 'bell';
  }

  getPriorityColor(priority: NotificationPriority): string {
    const colors = {
      [NotificationPriority.LOW]: 'priority-low',
      [NotificationPriority.MEDIUM]: 'priority-medium',
      [NotificationPriority.HIGH]: 'priority-high',
      [NotificationPriority.URGENT]: 'priority-urgent'
    };
    return colors[priority] || 'priority-medium';
  }

  getTypeColor(type: NotificationType): string {
    const colors = {
      [NotificationType.GENERAL]: 'type-general',
      [NotificationType.CLASS]: 'type-class',
      [NotificationType.EXAM]: 'type-exam',
      [NotificationType.SCHEDULE]: 'type-schedule',
      [NotificationType.ANNOUNCEMENT]: 'type-announcement'
    };
    return colors[type] || 'type-general';
  }

  formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'À l\'instant';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  }

  formatTime(date: Date | string): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isExpired(notification: Notification): boolean {
    if (!notification.expiryDate) return false;
    return new Date(notification.expiryDate) < new Date();
  }

  hasMoreToLoad(): boolean {
    return this.currentPage < this.totalPages;
  }

  openNotificationModal(notification: Notification): void {
    this.selectedNotification = notification;
    this.markAsRead(notification);
  }

  closeNotificationModal(): void {
    this.selectedNotification = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // File upload methods
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      
      // Validate file count
      if (this.selectedFiles.length + newFiles.length > 5) {
        alert('Maximum 5 fichiers autorisés');
        return;
      }
      
      // Validate file size (10MB max)
      const invalidFiles = newFiles.filter(file => file.size > 10 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        alert('Certains fichiers dépassent la limite de 10MB');
        return;
      }
      
      this.selectedFiles = [...this.selectedFiles, ...newFiles];
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  viewAttachment(notificationId: string, filename: string): void {
    const url = this.notificationService.getAttachmentUrl(notificationId, filename);
    window.open(url, '_blank');
  }

  // Delete confirmation methods
  openDeleteModal(notification: Notification): void {
    const createdById = typeof notification.createdBy === 'string' ? 
      notification.createdBy : notification.createdBy._id;
    const currentUserId = this.currentUser?._id || this.currentUser?.id;

    if (createdById !== currentUserId) {
      return;
    }

    this.notificationToDelete = notification;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.notificationToDelete = null;
    this.isDeleting = false;
  }

  confirmDeleteNotification(): void {
    if (!this.notificationToDelete) {
      return;
    }

    this.isDeleting = true;

    this.notificationService.deleteNotification(this.notificationToDelete._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notifications = this.notifications.filter(n => n._id !== this.notificationToDelete!._id);
            this.groupNotificationsByDate();
            this.closeDeleteModal();
          }
          this.isDeleting = false;
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
          this.isDeleting = false;
        }
      });
  }

  // Date validation methods
  getMinDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  getMinExpiryDate(): string {
    if (this.createForm.publishDate) {
      const publishDateTime = new Date(this.createForm.publishDate);
      // Add 1 minute to publish date as minimum expiry
      publishDateTime.setMinutes(publishDateTime.getMinutes() + 1);
      return this.formatDateForInput(publishDateTime);
    }
    return this.getMinDateTime();
  }

  formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  onPublishDateChange(): void {
    this.validateDates();
  }

  onExpiryDateChange(): void {
    this.validateDates();
  }

  private validateDates(): void {
    const now = new Date();
    this.dateValidationErrors = {
      publishDateInPast: false,
      expiryBeforePublish: false
    };

    // Check if publish date is in the past
    if (this.createForm.publishDate) {
      const publishDateTime = new Date(this.createForm.publishDate);
      if (publishDateTime < now) {
        this.dateValidationErrors.publishDateInPast = true;
      }
    }

    // Check if expiry date is before publish date
    if (this.createForm.publishDate && this.createForm.expiryDate) {
      const publishDateTime = new Date(this.createForm.publishDate);
      const expiryDateTime = new Date(this.createForm.expiryDate);
      if (expiryDateTime <= publishDateTime) {
        this.dateValidationErrors.expiryBeforePublish = true;
      }
    }
  }

  hasDateError(): boolean {
    return this.dateValidationErrors.publishDateInPast || 
           this.dateValidationErrors.expiryBeforePublish;
  }

  getDateErrorMessage(): string {
    if (this.dateValidationErrors.publishDateInPast) {
      return 'La date de publication doit être dans le futur';
    }
    if (this.dateValidationErrors.expiryBeforePublish) {
      return "La date d'expiration doit être après la date de publication";
    }
    return '';
  }
}