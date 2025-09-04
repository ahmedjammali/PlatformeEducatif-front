// teacher-layout.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { School } from '../../../models/school.model';

interface ExtendedUser extends User {
  id?: string;
}

@Component({
  selector: 'app-teacher-layout',
  templateUrl: './teacher-layout.component.html',
  styleUrls: ['./teacher-layout.component.css']
})
export class TeacherLayoutComponent implements OnInit, OnDestroy {
  @Input() activeSection: string = 'overview';
  @Output() activeSectionChange = new EventEmitter<string>();
  
  currentUser: ExtendedUser | null = null;
  school: School | null = null;
  sidebarCollapsed = false;
  
  // Mobile state
  mobileMenuOpen = false;
  isMobile = false;
  
  // Logout modal state
  showLogoutModal = false;
  isLoggingOut = false;

  // Notification count
  unreadNotificationCount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkMobileView();
    
    // Close mobile menu if switching to desktop
    if (event.target.innerWidth >= 768 && this.mobileMenuOpen) {
      this.closeMobileSidebar();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.mobileMenuOpen) {
      this.closeMobileSidebar();
    }
    if (this.showLogoutModal) {
      this.closeLogoutModal();
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser() as ExtendedUser | null;
    
    if (this.currentUser && this.currentUser.role === 'teacher') {
      this.loadSchoolInfo();
      this.loadNotificationCount();
    } else {
      this.router.navigate(['/login']);
    }
    
    // Check for mobile sidebar state
    this.checkMobileView();

    // Listen for notification updates
    this.notificationService.getNotificationUpdates()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadNotificationCount();
      });
  }

  ngOnDestroy(): void {
    // Restore body scroll when component is destroyed
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Desktop sidebar toggle
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    // Save preference
    localStorage.setItem('teacherSidebarCollapsed', this.sidebarCollapsed.toString());
  }

  // Mobile sidebar methods
  openMobileSidebar(): void {
    this.mobileMenuOpen = true;
    // Prevent body scroll when mobile menu is open
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  closeMobileSidebar(): void {

    this.mobileMenuOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
    this.activeSectionChange.emit(section);
    
    // Close mobile menu when navigation item is selected
    if (this.isMobile && this.mobileMenuOpen) {
      this.closeMobileSidebar();
    }
    
    // Mark notifications as read when visiting notifications section
    if (section === 'notifications' && this.unreadNotificationCount > 0) {
      setTimeout(() => {
        this.markNotificationsAsRead();
      }, 1000);
    }
  }

  // Notification methods
  showNotifications(): void {
    this.setActiveSection('notifications');
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'overview': 'Vue d\'Ensemble',
      'subjects': 'Mes Matières',
      'classes': 'Mes Classes', 
      'exercises': 'Exercices',
      'grades': 'Notes',
      'progress': 'Progrès Étudiants',
      'notifications': 'Notifications',
      'contact': 'Contact'
    };
    
    return titles[this.activeSection] || 'Vue d\'Ensemble';
  }

  // Logout Modal Methods
  openLogoutModal(): void {
    this.showLogoutModal = true;
    // Close mobile menu if open
    if (this.mobileMenuOpen) {
      this.closeMobileSidebar();
    }
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
    this.isLoggingOut = false;
  }

  confirmLogout(): void {
    this.isLoggingOut = true;
    
    // Simulate logout delay for better UX
    setTimeout(() => {
      this.authService.logout();
      this.closeLogoutModal();
      this.router.navigate(['/login']);
    }, 500);
  }

  // Keep the old logout method for backward compatibility
  logout(): void {
    this.openLogoutModal();
  }

  private loadSchoolInfo(): void {
    this.schoolService.getSchool()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.school = response.school;
        },
        error: (error) => {
          console.error('Error loading school info:', error);
        }
      });
  }

  private loadNotificationCount(): void {
    if (!this.currentUser) return;
    
    this.notificationService.getUnreadNotificationsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.unreadNotificationCount = count;
        },
        error: (error) => {
          console.error('Error loading notification count:', error);
          this.unreadNotificationCount = 0;
        }
      });
  }

  private markNotificationsAsRead(): void {
    this.notificationService.getNotifications({ unreadOnly: true, limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.notifications && response.notifications.length > 0) {
            const unreadIds = response.notifications.map(n => n._id);
            this.notificationService.markMultipleAsRead(unreadIds)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: () => {
                  this.unreadNotificationCount = 0;
                },
                error: (error) => {
                  console.error('Error marking notifications as read:', error);
                }
              });
          }
        },
        error: (error) => {
          console.error('Error fetching unread notifications:', error);
        }
      });
  }

  private checkMobileView(): void {
    this.isMobile = window.innerWidth < 768;
    
    if (!this.isMobile) {
      // Restore sidebar state from localStorage on desktop
      const savedState = localStorage.getItem('teacherSidebarCollapsed');
      if (savedState !== null) {
        this.sidebarCollapsed = savedState === 'true';
      }
      
      // Close mobile menu if switching to desktop
      if (this.mobileMenuOpen) {
        this.closeMobileSidebar();
      }
    } else {
      // On mobile, ensure mobile menu is closed initially
      this.mobileMenuOpen = false;
    }
  }
}