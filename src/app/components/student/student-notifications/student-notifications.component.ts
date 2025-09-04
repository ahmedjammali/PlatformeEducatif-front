// student-notifications.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, catchError, of } from 'rxjs';
import { NotificationService } from '../../../services/notification.service';
import {
  Notification,
  NotificationAttachment,
  NotificationType,
  NotificationPriority,
  NotificationFilters,
  NotificationResponse
} from '../../../models/notification.model';

@Component({
  selector: 'app-student-notifications',
  templateUrl: './student-notifications.component.html',
  styleUrls: ['./student-notifications.component.css']
})
export class StudentNotificationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Component State
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  selectedNotification: Notification | null = null;
  
  // Loading States
  loading = false;
  isLoadingNotifications = false;
  hasMoreNotifications = true;
  currentPage = 1;
  pageSize = 20;
  totalPages = 0;
  error = '';

  // Filter Properties
  selectedTypeFilter = '';
  selectedStatusFilter = '';
  selectedPriorityFilter = '';
  
  notificationTypes = [
    { value: NotificationType.GENERAL, label: 'Général', icon: '📄' },
    { value: NotificationType.CLASS, label: 'Classe', icon: '🎓' },
    { value: NotificationType.EXAM, label: 'Examens', icon: '📝' },
    { value: NotificationType.SCHEDULE, label: 'Planning', icon: '📅' },
    { value: NotificationType.ANNOUNCEMENT, label: 'Annonces', icon: '📢' }
  ];

  // Preview State
  previewFile: NotificationAttachment | null = null;

  // Computed Properties
  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.loadNotifications();
    this.subscribeToNotificationUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    // Check if there's a notification ID in the route
    const notificationId = this.route.snapshot.params['id'];
    if (notificationId) {
      this.loadNotificationById(notificationId);
    }
  }

  private subscribeToNotificationUpdates(): void {
    // Subscribe to real-time notification updates
    this.notificationService.getNotificationUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(updatedNotification => {
        const index = this.notifications.findIndex(n => n._id === updatedNotification._id);
        if (index > -1) {
          this.notifications[index] = updatedNotification;
          this.applyFilters();
        }
      });
  }

  // Data Loading Methods
  loadNotifications(): void {
    this.loading = true;
    this.error = '';
    const filters: NotificationFilters = {
      page: 1,
      limit: this.pageSize
    };

    this.notificationService.getNotifications(filters)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading notifications:', error);
          this.error = 'Erreur lors du chargement des notifications';
          return of({ 
            success: false, 
            notifications: [],
            pagination: undefined 
          } as NotificationResponse);
        })
      )
      .subscribe(response => {
        if (response.success && response.notifications) {
          this.notifications = response.notifications;
          this.totalPages = response.pagination?.pages || 1;
          this.hasMoreNotifications = this.currentPage < this.totalPages;
          this.applyFilters();
        }
        this.loading = false;
      });
  }

  async loadNotificationById(id: string): Promise<void> {
    this.notificationService.getNotification(id)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading notification:', error);
          return of({ 
            success: false, 
            notification: undefined 
          } as NotificationResponse);
        })
      )
      .subscribe(response => {
        if (response.success && response.notification) {
          this.selectedNotification = response.notification;
          if (!response.notification.isRead) {
            this.markAsRead(response.notification);
          }
        }
      });
  }

  async loadMoreNotifications(): Promise<void> {
    if (!this.hasMoreNotifications || this.isLoadingNotifications) return;

    this.isLoadingNotifications = true;
    this.currentPage++;

    const filters: NotificationFilters = {
      page: this.currentPage,
      limit: this.pageSize
    };

    this.notificationService.getNotifications(filters)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error loading more notifications:', error);
          this.currentPage--; // Reset page on error
          return of({ 
            success: false, 
            notifications: [],
            pagination: undefined 
          } as NotificationResponse);
        })
      )
      .subscribe(response => {
        if (response.success && response.notifications) {
          if (response.notifications.length < this.pageSize) {
            this.hasMoreNotifications = false;
          }
          
          this.notifications = [...this.notifications, ...response.notifications];
          this.applyFilters();
        }
        this.isLoadingNotifications = false;
      });
  }

  // Filter Methods
  applyFilters(): void {
    this.filteredNotifications = this.notifications.filter(notification => {
      let matches = true;

      if (this.selectedTypeFilter && notification.type !== this.selectedTypeFilter) {
        matches = false;
      }

      if (this.selectedStatusFilter) {
        if (this.selectedStatusFilter === 'unread' && notification.isRead) {
          matches = false;
        } else if (this.selectedStatusFilter === 'read' && !notification.isRead) {
          matches = false;
        }
      }

      if (this.selectedPriorityFilter && notification.priority !== this.selectedPriorityFilter) {
        matches = false;
      }

      return matches;
    });
  }

  resetFilters(): void {
    this.selectedTypeFilter = '';
    this.selectedStatusFilter = '';
    this.selectedPriorityFilter = '';
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedTypeFilter || this.selectedStatusFilter || this.selectedPriorityFilter);
  }

  // Modal Methods
  openNotificationModal(notification: Notification): void {
    this.selectedNotification = notification;
    if (!notification.isRead) {
      this.markAsRead(notification);
    }
  }

  closeModal(): void {
    this.selectedNotification = null;
  }

  // Notification Actions
  async markAsRead(notification: Notification): Promise<void> {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification._id)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error marking notification as read:', error);
            return of({ 
              success: false, 
              notification: undefined 
            } as NotificationResponse);
          })
        )
        .subscribe(response => {
          if (response.success) {
            notification.isRead = true;
            const mainIndex = this.notifications.findIndex(n => n._id === notification._id);
            if (mainIndex > -1) {
              this.notifications[mainIndex].isRead = true;
            }
          }
        });
    }
  }

  async toggleReadStatus(notification: Notification): Promise<void> {
    // For now, we only support marking as read since the API doesn't have unread functionality
    if (!notification.isRead) {
      await this.markAsRead(notification);
    }
  }

  async deleteNotification(notification: Notification): Promise<void> {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
      this.notificationService.deleteNotification(notification._id)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            console.error('Error deleting notification:', error);
            return of({ 
              success: false, 
              notification: undefined 
            } as NotificationResponse);
          })
        )
        .subscribe(response => {
          if (response.success) {
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
              this.notifications.splice(index, 1);
              this.applyFilters();
              
              if (this.selectedNotification?._id === notification._id) {
                this.closeModal();
              }
            }
          }
        });
    }
  }

  // File Management Methods
  async downloadAttachment(attachment: NotificationAttachment): Promise<void> {
    if (!this.selectedNotification) return;

    this.notificationService.downloadAttachment(this.selectedNotification._id, attachment.filename)
      .pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Error downloading file:', error);
          alert('Erreur lors du téléchargement du fichier. Veuillez réessayer.');
          return of(null);
        })
      )
      .subscribe(blob => {
        if (blob) {

        }
      });
  }

  previewAttachment(attachment: NotificationAttachment): void {
    if (this.canPreview(attachment.mimetype) && this.selectedNotification) {
      this.previewFile = {
        ...attachment,
        url: this.notificationService.getAttachmentUrl(this.selectedNotification._id, attachment.filename)
      };
    }
  }

  closePreview(): void {
    this.previewFile = null;
  }

  canPreview(mimeType: string): boolean {
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    return previewableTypes.includes(mimeType.toLowerCase());
  }

  // Utility Methods
  getTodayNotificationsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.notifications.filter(n => {
      const notificationDate = new Date(n.createdAt);
      notificationDate.setHours(0, 0, 0, 0);
      return notificationDate.getTime() === today.getTime();
    }).length;
  }

  formatNotificationTime(date: Date | string): string {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    
    return notificationDate.toLocaleDateString('fr-FR');
  }

  formatDetailTime(date: Date | string): string {
    const notificationDate = new Date(date);
    return notificationDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDetailMessage(content: string): string {
    // Simple formatting - replace line breaks with <br> tags
    return content.replace(/\n/g, '<br>');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getNotificationIcon(type: NotificationType): string {
    const icons = {
      [NotificationType.GENERAL]: '📄',
      [NotificationType.CLASS]: '🎓',
      [NotificationType.EXAM]: '📝',
      [NotificationType.SCHEDULE]: '📅',
      [NotificationType.ANNOUNCEMENT]: '📢'
    };
    return icons[type] || '📄';
  }

  getSenderInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getPriorityLabel(priority: NotificationPriority): string {
    const labels = {
      [NotificationPriority.URGENT]: 'URGENT',
      [NotificationPriority.HIGH]: 'IMPORTANT',
      [NotificationPriority.MEDIUM]: 'NORMAL',
      [NotificationPriority.LOW]: 'FAIBLE'
    };
    return labels[priority] || priority.toUpperCase();
  }

  getTypeLabel(type: NotificationType): string {
    const labels = {
      [NotificationType.GENERAL]: 'Général',
      [NotificationType.CLASS]: 'Classe',
      [NotificationType.EXAM]: 'Examen',
      [NotificationType.SCHEDULE]: 'Planning',
      [NotificationType.ANNOUNCEMENT]: 'Annonce'
    };
    return labels[type] || type;
  }

  getFileIcon(mimeType: string): string {
    const type = mimeType.toLowerCase();
    
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📽️';
    if (type.includes('image')) return '🖼️';
    if (type.includes('video')) return '🎥';
    if (type.includes('audio')) return '🎵';
    if (type.includes('zip') || type.includes('rar') || type.includes('compress')) return '📦';
    
    return '📎';
  }

  extractCleanFilename(filename: string): string {
  if (!filename) return '';
  
  // Split by hyphens and look for the actual filename part
  const parts = filename.split('-');
  
  // The actual filename usually starts after the last timestamp
  // Look for the part that contains a file extension or meaningful text
  let cleanName = '';
  
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    
    // If this part contains a file extension, it's likely the start of the real filename
    if (part.includes('.') || part.length > 10) {
      // Take this part and all remaining parts
      cleanName = parts.slice(i).join('-');
      break;
    }
  }
  
  // If we didn't find a good match, try a different approach
  if (!cleanName) {
    // Look for parts that don't look like timestamps (not all numbers)
    const meaningfulParts = parts.filter(part => {
      // Skip parts that are purely numeric (likely timestamps)
      return !/^\d+$/.test(part) && part.length > 0;
    });
    
    if (meaningfulParts.length > 0) {
      cleanName = meaningfulParts.join('-');
    } else {
      // Fallback: use the original filename
      cleanName = filename;
    }
  }
  
  // Clean up common artifacts
  cleanName = cleanName
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, '') // Remove trailing hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  return cleanName || filename; // Fallback to original if cleaning failed
}

/**
 * Truncates filename for display while preserving the extension
 * @param filename - The filename to truncate
 * @param maxLength - Maximum length (default 30)
 * @returns Truncated filename with extension preserved
 */
truncateFilename(filename: string, maxLength: number = 30): string {
  if (!filename || filename.length <= maxLength) return filename;
  
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    // No extension, just truncate
    return filename.substring(0, maxLength - 3) + '...';
  }
  
  const extension = filename.substring(lastDotIndex);
  const nameWithoutExt = filename.substring(0, lastDotIndex);
  
  const availableLength = maxLength - extension.length - 3; // 3 for "..."
  
  if (availableLength <= 0) {
    // Extension is too long, just show truncated name
    return filename.substring(0, maxLength - 3) + '...';
  }
  
  return nameWithoutExt.substring(0, availableLength) + '...' + extension;
}

/**
 * Gets the display name for a file attachment
 * @param attachment - The attachment object
 * @returns Clean, truncated filename for display
 */
getDisplayFilename(attachment: NotificationAttachment): string {
  const originalName = attachment.originalName || attachment.filename;
  const cleanName = this.extractCleanFilename(originalName);
  return this.truncateFilename(cleanName, 28); // Adjusted for mobile display
}


}