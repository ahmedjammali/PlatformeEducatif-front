// student-navbar.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subject, takeUntil, interval } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { School } from '../../../models/school.model';
import { Notification, NotificationPriority, NotificationType } from '../../../models/notification.model';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-student-navbar',
  templateUrl: './student-navbar.component.html',
  styleUrls: ['./student-navbar.component.css']
})
export class StudentNavbarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private resizeListener?: () => void;
  
  currentUser: User | null = null;
  schoolData: School | null = null;
  
  // Mobile menu state
  isMobileMenuOpen = false;
  
  // Notification state
  notifications: Notification[] = [];
  unreadCount = 0;
  isNotificationDropdownOpen = false;
  isLoadingNotifications = false;

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        // Load school data and notifications when user is available and is a student
        if (user && this.authService.isStudent()) {
          this.loadSchoolData();
          this.loadNotifications();
          this.setupNotificationPolling();
        }
      });

    // Setup resize listener for mobile menu
    this.setupResizeListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up resize listener
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
    
    // Restore body scroll if component is destroyed with menu open
    document.body.style.overflow = '';
  }

  /**
   * Determines if the navbar should be displayed
   * Only show for student users
   */
  shouldShowNavbar(): boolean {
    return this.authService.isStudent();
  }

  /**
   * Load school data for the current student
   */
  private loadSchoolData(): void {
    this.schoolService.getSchool()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.schoolData = response.school;
        },
        error: (error) => {
          console.error('Error loading school data:', error);
          // Don't show error to user, just log it
          // The navbar will still work without school name
        }
      });
  }

  /**
   * Load notifications for the current student
   */
  loadNotifications(): void {
    if (!this.authService.isStudent()) return;
    
    this.isLoadingNotifications = true;
    this.notificationService.getNotifications({ limit: 10, unreadOnly: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.notifications || [];
          this.updateUnreadCount();
          this.isLoadingNotifications = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.notifications = [];
          this.unreadCount = 0;
          this.isLoadingNotifications = false;
        }
      });
  }

  /**
   * Setup periodic polling for new notifications
   */
  private setupNotificationPolling(): void {
    // Poll for new notifications every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.authService.isStudent() && !this.isLoadingNotifications) {
          this.loadNotifications();
        }
      });
  }

  /**
   * Update unread notification count
   */
  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  /**
   * Toggle notification dropdown
   */
  toggleNotificationDropdown(): void {
    this.isNotificationDropdownOpen = !this.isNotificationDropdownOpen;
    
    // Close mobile menu if open
    if (this.isNotificationDropdownOpen && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  /**
   * Close notification dropdown
   */
  closeNotificationDropdown(): void {
    this.isNotificationDropdownOpen = false;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notification: Notification): void {
    if (notification.isRead) return;

    this.notificationService.markAsRead(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.isRead = true;
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;

    const unreadIds = unreadNotifications.map(n => n._id);
    this.notificationService.markMultipleAsRead(unreadIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.forEach(n => n.isRead = true);
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  /**
   * Delete notification
   */
  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.deleteNotification(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n._id !== notification._id);
          this.updateUnreadCount();
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
        }
      });
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.EXAM:
        return '📝';
      case NotificationType.CLASS:
        return '📚';
      case NotificationType.SCHEDULE:
        return '📅';
      case NotificationType.ANNOUNCEMENT:
        return '📢';
      case NotificationType.GENERAL:
        return '💬';
      default:
        return '🔔';
    }
  }

  /**
   * Get notification priority class for styling
   */
  getPriorityClass(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'priority-urgent';
      case NotificationPriority.HIGH:
        return 'priority-high';
      case NotificationPriority.MEDIUM:
        return 'priority-medium';
      case NotificationPriority.LOW:
        return 'priority-low';
      default:
        return 'priority-medium';
    }
  }

  /**
   * Get notification priority label
   */
  getPriorityLabel(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'Urgent';
      case NotificationPriority.HIGH:
        return 'Important';
      case NotificationPriority.MEDIUM:
        return 'Normal';
      case NotificationPriority.LOW:
        return 'Faible';
      default:
        return 'Normal';
    }
  }

  /**
   * Format notification time
   */
  formatNotificationTime(date: Date | string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `il y a ${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `il y a ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `il y a ${diffInDays}j`;
    
    return notificationDate.toLocaleDateString('fr-FR');
  }

  /**
   * Setup window resize listener to close mobile menu on larger screens
   */
  private setupResizeListener(): void {
    this.resizeListener = () => {
      if (window.innerWidth > 768) {
        if (this.isMobileMenuOpen) {
          this.closeMobileMenu();
        }
        if (this.isNotificationDropdownOpen) {
          this.closeNotificationDropdown();
        }
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }

  /**
   * Toggle mobile menu open/closed state
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Close notification dropdown if open
    if (this.isMobileMenuOpen && this.isNotificationDropdownOpen) {
      this.closeNotificationDropdown();
    }
    
    // Prevent body scroll when menu is open
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Also close notification dropdown when opening mobile menu
      this.closeNotificationDropdown();
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Close mobile menu and restore body scroll
   */
  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  /**
   * Get user initials for avatar
   */
  getUserInitials(): string {
    if (!this.currentUser?.name) return 'ET';
    
    return this.currentUser.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Get school abbreviation for responsive display
   */
  getSchoolAbbreviation(): string {
    if (!this.schoolData?.name) return 'EM';
    
    // If the school name is short enough, return it as is
    if (this.schoolData.name.length <= 15) {
      return this.schoolData.name;
    }
    
    // Otherwise, create an abbreviation from the first letters of each word
    const words = this.schoolData.name.split(' ');
    if (words.length > 1) {
      // For multi-word names, take first letter of each word
      return words
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
    }
    
    // If it's a single long word, take the first 10 characters
    return this.schoolData.name.slice(0, 10) + '...';
  }

  /**
   * Handle click outside to close notification dropdown
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationDropdown = target.closest('.notification-dropdown');
    
    if (!notificationDropdown && this.isNotificationDropdownOpen) {
      this.closeNotificationDropdown();
    }
  }

  /**
   * Handle escape key to close dropdowns
   */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isNotificationDropdownOpen) {
      this.closeNotificationDropdown();
    }
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  /**
   * TrackBy function for notification list performance
   */
  trackNotification(index: number, notification: Notification): string {
    return notification._id;
  }

  /**
   * Handle user logout
   */
  logout(): void {
    // Close dropdowns and mobile menu first
    this.closeMobileMenu();
    this.closeNotificationDropdown();
    
    // Proceed with logout
    this.authService.logout();
  }

  /**
   * Navigate to all notifications page
   */
  viewAllNotifications(): void {
    this.router.navigate(['/student/notifications']);
    this.closeNotificationDropdown();
  }

  /**
   * View notification details
   */
  viewNotificationDetails(notification: Notification): void {
    this.markAsRead(notification);
    this.router.navigate(['/student/notifications']);
    this.closeNotificationDropdown();
  }
}