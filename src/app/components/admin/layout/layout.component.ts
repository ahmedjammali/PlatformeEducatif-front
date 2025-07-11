// admin-layout.component.ts
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
import { NotificationService } from '../../../services/notification.service';
import { User } from '../../../models/user.model';
import { School } from '../../../models/school.model';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  schoolInfo: School | null = null;
  sidebarCollapsed = false;
  mobileMenuOpen = false; // New property for mobile menu state
  activeRoute = 'dashboard';
  isSuperAdmin = false;
  unreadNotificationCount = 0;
  
  // Logout modal state
  showLogoutModal = false;
  isLoggingOut = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  // Listen for window resize to handle responsive behavior
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.handleWindowResize();
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    
    // Load school info
    this.loadSchoolInfo();
    
    // Subscribe to unread notification count
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadNotificationCount = count;
      });
    
    // Initial unread count load
    this.notificationService.getUnreadNotificationsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe();
    
    // Listen for route changes to update active route
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.setActiveRoute();
        // Close mobile menu on navigation
        this.closeMobileSidebar();
      });
    
    // Set initial active route
    this.setActiveRoute();
    
    // Check for mobile sidebar state
    this.checkMobileView();
    
    // Listen for messages from child components
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent): void {
    if (event.data.type === 'unreadCount') {
      this.unreadNotificationCount = event.data.count;
    }
  }

  toggleSidebar(): void {
    if (this.isMobileView()) {
      this.toggleMobileSidebar();
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      // Save preference for desktop
      localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());
    }
  }

  // New method for mobile sidebar toggle
  toggleMobileSidebar(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    
    // Prevent body scroll when mobile menu is open
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  // New method to close mobile sidebar
  closeMobileSidebar(): void {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
      document.body.style.overflow = '';
    }
  }

  // Check if current view is mobile
  private isMobileView(): boolean {
    return window.innerWidth < 768;
  }

  // Handle window resize
  private handleWindowResize(): void {
    if (!this.isMobileView()) {
      // Close mobile menu when switching to desktop
      this.closeMobileSidebar();
      
      // Restore desktop sidebar state
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        this.sidebarCollapsed = savedState === 'true';
      }
    } else {
      // On mobile, always show full sidebar when opened
      this.sidebarCollapsed = false;
    }
  }

  navigateTo(route: string): void {
    this.activeRoute = route;
    
    const routeMap: { [key: string]: string } = {
      'dashboard': '/admin/dashboard',
      'users': '/admin/users',
      'classes': '/admin/classes',
      'subjects': '/admin/subjects',
      'notifications': '/admin/notifications',
      'grades': '/admin/grades',
      'contact': '/admin/contact',
      'schools': '/superadmin/schools'
    };

    const targetRoute = routeMap[route];
    if (targetRoute) {
      this.router.navigate([targetRoute]);
    }
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'dashboard': 'Tableau de Bord',
      'users': 'Gestion des Utilisateurs',
      'classes': 'Gestion des Classes',
      'subjects': 'Gestion des Matières',
      'notifications': 'Gestion des Notifications',
      'grades': 'Notes des Étudiants',
      'contact': 'Contact',
      'reports': 'Rapports et Statistiques',
      'schools': 'Gestion de l\'École'
    };
    
    return titles[this.activeRoute] || 'Tableau de Bord';
  }

  getUserRoleLabel(): string {
    const roleLabels: { [key: string]: string } = {
      'superadmin': 'Super Administrateur',
      'admin': 'Administrateur',
      'teacher': 'Enseignant',
      'student': 'Étudiant'
    };
    
    return roleLabels[this.currentUser?.role || ''] || 'Utilisateur';
  }

  showNotifications(): void {
    // Navigate to notifications page
    this.navigateTo('notifications');
  }

  // Logout Modal Methods
  openLogoutModal(): void {
    this.showLogoutModal = true;
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
      // Clean up mobile menu state
      this.closeMobileSidebar();
    }, 500);
  }

  // Keep the old logout method for backward compatibility (but update it to use modal)
  logout(): void {
    this.openLogoutModal();
  }

  private loadSchoolInfo(): void {
    this.schoolService.getSchool()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.schoolInfo = response.school;
        },
        error: (error) => {
          console.error('Error loading school info:', error);
        }
      });
  }

  private setActiveRoute(): void {
    const currentUrl = this.router.url;
    
    if (currentUrl.includes('/users')) {
      this.activeRoute = 'users';
    } else if (currentUrl.includes('/classes')) {
      this.activeRoute = 'classes';
    } else if (currentUrl.includes('/subjects')) {
      this.activeRoute = 'subjects';
    } else if (currentUrl.includes('/notifications')) {
      this.activeRoute = 'notifications';
    } else if (currentUrl.includes('/grades')) {
      this.activeRoute = 'grades';
    } else if (currentUrl.includes('/contact')) {
      this.activeRoute = 'contact';
    } else if (currentUrl.includes('/reports')) {
      this.activeRoute = 'reports';
    } else if (currentUrl.includes('/schools')) {
      this.activeRoute = 'schools';
    } else {
      this.activeRoute = 'dashboard';
    }
  }

  private checkMobileView(): void {
    if (this.isMobileView()) {
      // On mobile, start with collapsed sidebar
      this.sidebarCollapsed = false; // But don't collapse the mobile menu itself
      this.mobileMenuOpen = false;
    } else {
      // Restore sidebar state from localStorage for desktop
      const savedState = localStorage.getItem('sidebarCollapsed');
      if (savedState !== null) {
        this.sidebarCollapsed = savedState === 'true';
      }
      
      // Ensure mobile menu is closed on desktop
      this.mobileMenuOpen = false;
    }
  }
}