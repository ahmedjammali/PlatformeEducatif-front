// notification.component.ts - Updated with date grouping
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { NotificationService } from '../../../services/notification.service';
import { ClassService } from '../../../services/class.service';
import { AuthService } from '../../../services/auth.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  TargetAudience,
  NotificationFilters,
  CreateNotificationDTO,
  UpdateNotificationDTO,
  NotificationStats
} from '../../../models/notification.model';
import { Class } from '../../../models/class.model';
import { HttpEventType } from '@angular/common/http';

// Interface for grouped notifications
interface NotificationGroup {
  title: string;
  notifications: Notification[];
  count: number;
}

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit, OnDestroy {
  // Data
  notifications: Notification[] = [];
  groupedNotifications: NotificationGroup[] = [];
  classes: Class[] = [];
  stats: NotificationStats | null = null;
  
    isMarkingAllRead = false;
  // Form
  notificationForm!: FormGroup;
  selectedFiles: File[] = [];
  
  // UI States
  loading = false;
  isSubmitting = false;
  isDeleting = false;
  showModal = false;
  showViewModal = false;
  showDeleteModal = false;
  uploadProgress = 0;
  
  // View options
  viewMode: 'grouped' | 'list' = 'grouped'; // New property for view mode
  
  // Filters
 filters: NotificationFilters = {
    page: 1,
    limit: 10,
    type: undefined,
    priority: undefined,
    targetAudience: undefined // Add this line
  };
  filterStatus: 'all' | 'active' | 'expired' = 'all';
  searchTerm = '';
  
  // Pagination
  pagination: any = null;
  
  // Current items
  editingNotification: Notification | null = null;
  viewingNotification: Notification | null = null;
  notificationToDelete: Notification | null = null;
  
  // Unread count for layout
  unreadNotificationCount = 0;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private classService: ClassService,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadNotifications();
    this.loadClasses();
    this.loadStats();
    this.setupSearch();
    this.subscribeToNotificationUpdates();
    this.updateUnreadCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.notificationForm = this.fb.group({
      title: ['', [Validators.required]],
      content: ['', [Validators.required]],
      type: [NotificationType.GENERAL],
      priority: [NotificationPriority.MEDIUM],
      targetAudience: [TargetAudience.ALL, [Validators.required]],
      targetClass: [''],
      publishDate: [''],
      expiryDate: ['']
    }, { validators: this.dateRangeValidator.bind(this) });
  }


  private setupSearch(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.filters.page = 1;
        this.loadNotifications();
      });
  }
private dateRangeValidator(formGroup: FormGroup): { [key: string]: any } | null {
  const publishDate = formGroup.get('publishDate')?.value;
  const expiryDate = formGroup.get('expiryDate')?.value;
  const now = new Date();
  const errors: any = {};

  // Skip publish date validation when editing an existing notification
  // because the publish date field is disabled and shouldn't be validated
  if (publishDate && !this.editingNotification) {
    const publishDateTime = new Date(publishDate);
    if (publishDateTime < now) {
      errors.publishDateInPast = true;
    }
  }

  // Check if expiry date is before publish date
  if (publishDate && expiryDate) {
    const publishDateTime = new Date(publishDate);
    const expiryDateTime = new Date(expiryDate);
    if (expiryDateTime <= publishDateTime) {
      errors.expiryBeforePublish = true;
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

  private subscribeToNotificationUpdates(): void {
    this.notificationService.getNotificationUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notification => {
        // Update notification in list if it exists
        const index = this.notifications.findIndex(n => n._id === notification._id);
        if (index !== -1) {
          this.notifications[index] = notification;
          this.groupNotificationsByDate(); // Regroup after update
        }
      });
  }

  refreshUnreadCount(): void {
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        // Compare with local count
        const localCount = this.getUnreadNotificationsCount();
        if (count !== localCount) {
          // If counts don't match, reload notifications
          this.loadNotifications();
        }
      });
  }

  private updateUnreadCount(): void {
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadNotificationCount = count;
        // Update parent layout if needed
        if (window.parent) {
          window.parent.postMessage({ type: 'unreadCount', count }, '*');
        }
      });
  }

  loadNotifications(): void {
    this.loading = true;
    
    const filters = { ...this.filters };
    
    this.notificationService.getNotifications(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {

          this.notifications = response.notifications || [];
          this.pagination = response.pagination;
          
          // Apply client-side filters
          if (this.filterStatus !== 'all') {
            this.notifications = this.notifications.filter(n => {
              if (this.filterStatus === 'active') {
                return n.isActive && !n.isExpired;
              } else {
                return n.isExpired;
              }
            });
          }

          // Apply search filter
          if (this.searchTerm) {
            this.notifications = this.notifications.filter(n => 
              n.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
              n.content.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
          }
          
          // Group notifications by date
          this.groupNotificationsByDate();
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.loading = false;
        }
      });
  }

  // New method to group notifications by date
  private groupNotificationsByDate(): void {
    if (!this.notifications || this.notifications.length === 0) {
      this.groupedNotifications = [];
      return;
    }

    // Sort notifications by creation date (newest first)
    const sortedNotifications = [...this.notifications].sort((a, b) => 
      new Date(b.createdAt || b.publishDate).getTime() - new Date(a.createdAt || a.publishDate).getTime()
    );

    const groups: { [key: string]: Notification[] } = {};
    const now = new Date();
    
    sortedNotifications.forEach(notification => {
      const notificationDate = new Date(notification.createdAt || notification.publishDate);
      const groupKey = this.getDateGroupKey(notificationDate, now);
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });

    // Convert to array with proper ordering
    this.groupedNotifications = this.getOrderedDateGroups().map(groupKey => ({
      title: groupKey,
      notifications: groups[groupKey] || [],
      count: (groups[groupKey] || []).length
    })).filter(group => group.count > 0);
  }

  // Helper method to determine date group key
  private getDateGroupKey(date: Date, now: Date): string {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (notificationDate.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (notificationDate.getTime() === yesterday.getTime()) {
      return "Hier";
    } else if (notificationDate >= weekAgo) {
      return "Cette semaine";
    } else if (notificationDate >= monthAgo) {
      return "Ce mois-ci";
    } else {
      return "Plus ancien";
    }
  }

  // Helper method to get ordered date groups
  private getOrderedDateGroups(): string[] {
    return ["Aujourd'hui", "Hier", "Cette semaine", "Ce mois-ci", "Plus ancien"];
  }

  // New method to toggle view mode
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grouped' ? 'list' : 'grouped';
  }

  // Get all notifications for list view
  getAllNotifications(): Notification[] {
    return this.notifications.sort((a, b) => 
      new Date(b.createdAt || b.publishDate).getTime() - new Date(a.createdAt || a.publishDate).getTime()
    );
  }

  loadClasses(): void {
    this.classService.getClasses({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.classes = response.classes;
        },
        error: (error) => {
          console.error('Error loading classes:', error);
        }
      });
  }

  loadStats(): void {
    this.notificationService.getNotificationStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.stats = response.stats;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
        }
      });
  }

  // UI Methods
openCreateModal(): void {
  this.editingNotification = null;
  this.notificationForm.reset({
    type: NotificationType.GENERAL,
    priority: NotificationPriority.MEDIUM,
    targetAudience: TargetAudience.ALL
  });
  
  // Enable all fields for new notifications
  this.notificationForm.get('targetAudience')?.enable();
  this.notificationForm.get('targetClass')?.enable();
  this.notificationForm.get('publishDate')?.enable();
  this.notificationForm.get('expiryDate')?.enable();
  
  this.selectedFiles = [];
  this.showModal = true;
}

  editNotification(notification: Notification): void {
    this.editingNotification = notification;
    this.notificationForm.patchValue({
      title: notification.title,
      content: notification.content,
      type: notification.type,
      priority: notification.priority,
      targetAudience: notification.targetAudience,
      targetClass: notification.targetClass?._id || '',
      publishDate: this.formatDateForInput(notification.publishDate),
      expiryDate: notification.expiryDate ? this.formatDateForInput(notification.expiryDate) : ''
    });

    // Disable fields that should not be editable during modification
    this.notificationForm.get('targetAudience')?.disable();
    this.notificationForm.get('targetClass')?.disable();
    this.notificationForm.get('publishDate')?.disable();
    
    this.showModal = true;
  }

viewNotification(notification: Notification): void {
    this.viewingNotification = notification;
    this.showViewModal = true;
    
    // Mark as read and update the notification immediately
    if (!notification.isRead) {
      // Update UI immediately for better UX
      const notificationIndex = this.notifications.findIndex(n => n._id === notification._id);
      if (notificationIndex !== -1) {
        // Create a copy and update it
        this.notifications[notificationIndex] = { ...this.notifications[notificationIndex], isRead: true };
        // Regroup notifications to reflect the change
        this.groupNotificationsByDate();
      }
      
      // Update the viewing notification
      if (this.viewingNotification) {
        this.viewingNotification.isRead = true;
      }

      // Make API call in background
      this.notificationService.markAsRead(notification._id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {

            // The UI is already updated, so no need to do anything else
          },
          error: (error) => {
            console.error('Error marking notification as read:', error);
            // Revert UI changes if API call fails
            if (notificationIndex !== -1) {
              this.notifications[notificationIndex] = { ...this.notifications[notificationIndex], isRead: false };
              this.groupNotificationsByDate();
            }
            if (this.viewingNotification) {
              this.viewingNotification.isRead = false;
            }
          }
        });
    }
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  deleteNotification(notification: Notification): void {
    this.notificationToDelete = notification;
    this.showDeleteModal = true;
  }

  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) {
      return;
    }

    this.isMarkingAllRead = true;
    const unreadIds = unreadNotifications.map(n => n._id!);

    // Update UI immediately for better UX
    const originalNotifications = [...this.notifications];
    this.notifications.forEach(notification => {
      if (!notification.isRead) {
        notification.isRead = true;
      }
    });
    this.groupNotificationsByDate();

    // Use existing service method
    this.notificationService.markMultipleAsRead(unreadIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isMarkingAllRead = false;

          // UI is already updated, no need to reload
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
          this.isMarkingAllRead = false;
          
          // Revert UI changes if API call fails
          this.notifications = originalNotifications;
          this.groupNotificationsByDate();
          
          // Optionally show error message to user
          alert('Erreur lors du marquage des notifications. Veuillez réessayer.');
        }
      });
  }

  private updateNotificationInArray(notificationId: string, updates: Partial<Notification>): void {
    const index = this.notifications.findIndex(n => n._id === notificationId);
    if (index !== -1) {
      this.notifications[index] = { ...this.notifications[index], ...updates };
    }
  }
  confirmDelete(): void {
    if (!this.notificationToDelete) return;
    
    this.isDeleting = true;
    this.notificationService.deleteNotification(this.notificationToDelete._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n._id !== this.notificationToDelete!._id);
          this.groupNotificationsByDate(); // Regroup after deletion
          this.closeDeleteModal();
          this.loadStats(); // Reload stats
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
          this.isDeleting = false;
        }
      });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingNotification = null;
    this.selectedFiles = [];
    this.uploadProgress = 0;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingNotification = null;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.notificationToDelete = null;
    this.isDeleting = false;
  }

  // Form Methods
  onAudienceChange(): void {
    const targetAudience = this.notificationForm.get('targetAudience')?.value;
    const targetClassControl = this.notificationForm.get('targetClass');
    
    if (targetAudience === TargetAudience.SPECIFIC_CLASS) {
      targetClassControl?.setValidators([Validators.required]);
    } else {
      targetClassControl?.clearValidators();
      targetClassControl?.setValue('');
    }
    targetClassControl?.updateValueAndValidity();
  }

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
  
  onSubmit(): void {
    // Check for date errors first
    if (this.hasDateError()) {
      return;
    }

    // Temporarily enable disabled fields to get their values
    const wasTargetAudienceDisabled = this.notificationForm.get('targetAudience')?.disabled;
    const wasTargetClassDisabled = this.notificationForm.get('targetClass')?.disabled;
    const wasPublishDateDisabled = this.notificationForm.get('publishDate')?.disabled;
    
    if (this.editingNotification) {
      this.notificationForm.get('targetAudience')?.enable();
      this.notificationForm.get('targetClass')?.enable();
      this.notificationForm.get('publishDate')?.enable();
    }

    if (this.notificationForm.invalid) {
      Object.keys(this.notificationForm.controls).forEach(key => {
        this.notificationForm.get(key)?.markAsTouched();
      });
      
      // Re-disable fields if they were disabled
      if (this.editingNotification) {
        if (wasTargetAudienceDisabled) this.notificationForm.get('targetAudience')?.disable();
        if (wasTargetClassDisabled) this.notificationForm.get('targetClass')?.disable();
        if (wasPublishDateDisabled) this.notificationForm.get('publishDate')?.disable();
      }
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.notificationForm.value;
    
    if (this.editingNotification) {
      // Update notification - only include editable fields
      const updateData: UpdateNotificationDTO = {
        title: formValue.title,
        content: formValue.content,
        type: formValue.type,
        priority: formValue.priority,
        expiryDate: formValue.expiryDate || undefined
        // Note: Don't include targetAudience, targetClass, or publishDate in updates
      };
      
      this.notificationService.updateNotification(this.editingNotification._id!, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadNotifications();
            this.closeModal();
            this.isSubmitting = false;
          },
          error: (error) => {
            console.error('Error updating notification:', error);
            this.isSubmitting = false;
            
            // Re-disable fields on error
            if (wasTargetAudienceDisabled) this.notificationForm.get('targetAudience')?.disable();
            if (wasTargetClassDisabled) this.notificationForm.get('targetClass')?.disable();
            if (wasPublishDateDisabled) this.notificationForm.get('publishDate')?.disable();
          }
        });
    } else {
      // Create notification - include all fields
      const createData: CreateNotificationDTO = {
        ...formValue,
        attachments: this.selectedFiles
      };
      
      if (this.selectedFiles.length > 0) {
        // Use upload with progress
        this.notificationService.uploadNotificationWithProgress(createData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (event) => {

              if (event.type === HttpEventType.UploadProgress) {
                this.uploadProgress = Math.round(100 * event.loaded / event.total!);
              } else if (event.type === HttpEventType.Response) {
                this.loadNotifications();
                this.loadStats();
                this.closeModal();
                this.isSubmitting = false;
              }
            },
            error: (error) => {
              console.error('Error creating notification:', error);
              this.isSubmitting = false;
            }
          });
      } else {
        // Create without files
        this.notificationService.createNotification(createData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.loadNotifications();
              this.loadStats();
              this.closeModal();
              this.isSubmitting = false;
            },
            error: (error) => {
              console.error('Error creating notification:', error);
              this.isSubmitting = false;
            }
          });
      }
    }
  }

  // Filter Methods
  applyFilters(): void {
    this.filters.page = 1;
    this.loadNotifications();
  }

  onSearch(): void {
    this.searchSubject$.next(this.searchTerm);
  }

  changePage(page: number): void {
    this.filters.page = page;
    this.loadNotifications();
  }

  // Attachment Methods
  viewAttachment(notificationId: string, filename: string): void {
    const url = this.notificationService.getAttachmentUrl(notificationId, filename);
    window.open(url, '_blank');
  }

  downloadAttachment(notificationId: string, filename: string): void {
    this.notificationService.downloadAttachment(notificationId, filename)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
  }

  // Helper Methods
  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'general': 'Général',
      'class': 'Classe',
      'exam': 'Examen',
      'schedule': 'Emploi du temps',
      'announcement': 'Annonce'
    };
    return labels[type] || type;
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'low': 'Faible',
      'medium': 'Moyenne',
      'high': 'Haute',
      'urgent': 'Urgente'
    };
    return labels[priority] || priority;
  }

  getAudienceLabel(notification: Notification): string {
    switch (notification.targetAudience) {
      case 'all':
        return 'Tous';
      case 'students':
        return 'Étudiants';
      case 'teachers':
        return 'Enseignants';
      case 'specific_class':
        return notification.targetClass ? 
          `${notification.targetClass.name} - ${notification.targetClass.grade}` : 
          'Classe spécifique';
      default:
        return notification.targetAudience;
    }
  }

  getUrgentCount(): number {
    return this.stats?.byPriority.find(p => p._id === 'urgent')?.count || 0;
  }

  getActiveCount(): number {
    return this.notifications.filter(n => n.isActive && !n.isExpired).length;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  resetFilters(): void {
    // Reset all filter values
    this.filters = {
      page: 1,
      limit: 10,
      type: undefined,
      priority: undefined,
      targetAudience: undefined
    };
    this.searchTerm = '';
    this.filterStatus = 'all';
    
    // Clear the search subject
    this.searchSubject$.next('');
    
    // Reload notifications with default filters
    this.loadNotifications();
  }

  // Get minimum date for date inputs (current date/time)
  getMinDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Get minimum expiry date based on publish date
  getMinExpiryDate(): string {
    const publishDate = this.notificationForm.get('publishDate')?.value;
    if (publishDate) {
      const publishDateTime = new Date(publishDate);
      // Add 1 minute to publish date as minimum expiry
      publishDateTime.setMinutes(publishDateTime.getMinutes() + 1);
      return this.formatDateForInput(publishDateTime);
    }
    return this.getMinDateTime();
  }

  // Check if form has date errors
  hasDateError(): boolean {
    return this.notificationForm.hasError('publishDateInPast') || 
           this.notificationForm.hasError('expiryBeforePublish');
  }

  // Get specific date error message
  getDateErrorMessage(): string {
    if (this.notificationForm.hasError('publishDateInPast')) {
      return 'La date de publication doit être dans le futur';
    }
    if (this.notificationForm.hasError('expiryBeforePublish')) {
      return "La date d'expiration doit être après la date de publication";
    }
    return '';
  }

  // Listen to date changes to trigger validation
  onPublishDateChange(): void {
    this.notificationForm.get('expiryDate')?.updateValueAndValidity();
  }

  onExpiryDateChange(): void {
    this.notificationForm.get('publishDate')?.updateValueAndValidity();
  }
  
}