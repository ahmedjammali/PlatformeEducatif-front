// admin-layout.component.ts - UPDATED WITH SCHEDULE
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
  mobileMenuOpen = false;
  activeRoute = 'dashboard';
  isSuperAdmin = false;
  unreadNotificationCount = 0;

  // Logout modal state
  showLogoutModal = false;
  isLoggingOut = false;

  private destroy$ = new Subject<void>();
  private isMobile = false; // Track current mobile state

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private notificationService: NotificationService,
    private router: Router
  ) { }

  // Listen for window resize to handle responsive behavior
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.handleWindowResize();
  }

  // Handle escape key to close mobile menu
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
    this.currentUser = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();

    // Load school info
    this.loadSchoolInfo();

    // Subscribe to unread notification count
    this.subscribeToNotifications();

    // Listen for route changes
    this.subscribeToRouteChanges();

    // Set initial active route
    this.setActiveRoute();

    // Initialize responsive state
    this.initializeResponsiveState();

    // Listen for messages from child components
    this.setupMessageListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanup();
  }

  // ============================================
  // SIDEBAR TOGGLE METHODS
  // ============================================

  toggleSidebar(): void {
    if (this.isMobileView()) {
      this.toggleMobileSidebar();
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      // Save preference for desktop
      localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());

      // Force a reflow to ensure proper layout calculation
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);

      // Trigger a custom event for other components that might need to know about sidebar state
      window.dispatchEvent(new CustomEvent('sidebarToggle', {
        detail: { collapsed: this.sidebarCollapsed }
      }));
    }
  }

  // Enhanced mobile sidebar toggle with better UX
  toggleMobileSidebar(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.updateBodyScrollLock();
  }

  // New method to specifically open mobile sidebar
  openMobileSidebar(): void {
    if (this.isMobileView() && !this.mobileMenuOpen) {
      this.mobileMenuOpen = true;
      this.updateBodyScrollLock();
    }
  }

  // Enhanced method to close mobile sidebar with animation callback
  closeMobileSidebar(): void {
    if (this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
      this.updateBodyScrollLock();

      // Focus management for accessibility
      const menuButton = document.querySelector('.mobile-menu-toggle') as HTMLElement;
      if (menuButton) {
        setTimeout(() => menuButton.focus(), 150);
      }
    }
  }

  // ============================================
  // NAVIGATION METHODS
  // ============================================

  navigateTo(route: string): void {
    this.activeRoute = route;

    const routeMap: { [key: string]: string } = {
      'dashboard': '/admin/dashboard',
      'users': '/admin/users',
      'classes': '/admin/classes',
      'subjects': '/admin/subjects',
      'schedule': '/admin/schedule', // ADDED: Schedule route for admin
      'notifications': '/admin/notifications',
      'grades': '/admin/grades',
      'contact': '/admin/contact',
      'schools': '/superadmin/schools',
      'payments': '/admin/payments',
      'financialOverview': '/admin/financial-overview',
      'charges': '/admin/charges',
      'salary': '/admin/salary',
    };

    const targetRoute = routeMap[route];
    if (targetRoute) {
      // Close mobile menu before navigation for better UX
      if (this.isMobileView()) {
        this.closeMobileSidebar();
        // Add small delay to let animation complete
        setTimeout(() => {
          this.router.navigate([targetRoute]);
        }, 150);
      } else {
        this.router.navigate([targetRoute]);
      }
    }
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'dashboard': 'Tableau de Bord',
      'users': 'Gestion des Utilisateurs',
      'classes': 'Gestion des Classes',
      'subjects': 'Gestion des Matières',
      'schedule': 'Gestion de l\'Emploi du Temps', // ADDED: Schedule title
      'notifications': 'Gestion des Notifications',
      'grades': 'Notes des Étudiants',
      'contact': 'Contact',
      'reports': 'Rapports et Statistiques',
      'schools': 'Gestion de l\'École',
      'payments': 'Gestion des Paiements',
      'financialOverview': 'Aperçu Financier',
      'charges': 'Gestion des Charges',
      'salary': 'Gestion des Salaires',
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

  // ============================================
  // NOTIFICATION METHODS
  // ============================================

  showNotifications(): void {
    // Close mobile menu first if open
    if (this.isMobileView() && this.mobileMenuOpen) {
      this.closeMobileSidebar();
    }

    // Navigate to notifications page
    setTimeout(() => {
      this.navigateTo('notifications');
    }, this.mobileMenuOpen ? 150 : 0);
  }

  // ============================================
  // LOGOUT MODAL METHODS
  // ============================================

  openLogoutModal(): void {
    this.showLogoutModal = true;
    // Add focus trap for accessibility
    setTimeout(() => {
      const modal = document.querySelector('.modal-content') as HTMLElement;
      if (modal) {
        modal.focus();
      }
    }, 100);
  }

  closeLogoutModal(): void {
    this.showLogoutModal = false;
    this.isLoggingOut = false;

    // Return focus to logout button
    const logoutButton = document.querySelector('.logout-btn') as HTMLElement;
    if (logoutButton) {
      setTimeout(() => logoutButton.focus(), 100);
    }
  }

  confirmLogout(): void {
    this.isLoggingOut = true;

    // Enhanced logout with proper cleanup
    setTimeout(() => {
      try {
        // Clean up state before logout
        this.cleanup();

        // Perform logout
        this.authService.logout();
        this.closeLogoutModal();
        // Redirect will be handled by auth guard or the logout method itself
      } catch (error) {
        console.error('Logout error:', error);
        this.isLoggingOut = false;
        // Handle logout error if needed
      }
    }, 500);
  }

  // Keep backward compatibility
  logout(): void {
    this.openLogoutModal();
  }

  // ============================================
  // RESPONSIVE METHODS
  // ============================================

  private isMobileView(): boolean {
    return window.innerWidth < 768;
  }

  private handleWindowResize(): void {
    const wasMobile = this.isMobile;
    this.isMobile = this.isMobileView();

    // Handle transition between mobile and desktop
    if (wasMobile && !this.isMobile) {
      // Switching from mobile to desktop
      this.closeMobileSidebar();
      this.restoreDesktopSidebarState();
    } else if (!wasMobile && this.isMobile) {
      // Switching from desktop to mobile
      this.prepareMobileState();
    }
  }

  private restoreDesktopSidebarState(): void {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      this.sidebarCollapsed = savedState === 'true';
    }
  }

  private prepareMobileState(): void {
    // On mobile, always show full sidebar when opened
    this.sidebarCollapsed = false;
    this.mobileMenuOpen = false;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private updateBodyScrollLock(): void {
    // Prevent body scroll when mobile menu is open
    if (this.mobileMenuOpen && this.isMobileView()) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }

  private initializeResponsiveState(): void {
    this.isMobile = this.isMobileView();

    if (this.isMobile) {
      this.prepareMobileState();
    } else {
      this.restoreDesktopSidebarState();
    }
  }

  // ============================================
  // DATA LOADING METHODS
  // ============================================

  private loadSchoolInfo(): void {
    if (this.isSuperAdmin) {
      // Super admin might not have a specific school
      return;
    }

    this.schoolService.getSchool()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.schoolInfo = response.school;
        },
        error: (error) => {
          console.error('Error loading school info:', error);
          // Handle error gracefully - maybe show a toast notification
        }
      });
  }

  private subscribeToNotifications(): void {
    // Subscribe to unread notification count
    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.unreadNotificationCount = count;
        },
        error: (error) => {
          console.error('Error loading notification count:', error);
        }
      });

    // Initial unread count load
    this.notificationService.getUnreadNotificationsCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (error) => {
          console.error('Error loading initial notification count:', error);
        }
      });
  }

  private subscribeToRouteChanges(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.setActiveRoute();
        // Close mobile menu on navigation for better UX
        if (this.isMobileView()) {
          this.closeMobileSidebar();
        }
      });
  }

  private setActiveRoute(): void {
    const currentUrl = this.router.url;

    // More robust route detection with proper hierarchy
    const routes = [
      // Order matters: more specific routes first
      { path: '/admin/schedule', route: 'schedule' }, // ADDED: Admin schedule route
      { path: '/admin/financial-overview', route: 'financialOverview' },
      { path: '/admin/payments', route: 'payments' },
      { path: '/admin/charges', route: 'charges' },
      { path: '/admin/salary', route: 'salary' },
      { path: '/admin/users', route: 'users' },
      { path: '/admin/classes', route: 'classes' },
      { path: '/admin/subjects', route: 'subjects' },
      { path: '/admin/notifications', route: 'notifications' },
      { path: '/admin/grades', route: 'grades' },
      { path: '/admin/contact', route: 'contact' },
      { path: '/admin/reports', route: 'reports' },
      { path: '/superadmin/schools', route: 'schools' },
    ];

    // Find the most specific matching route
    const activeRoute = routes.find(r => currentUrl === r.path ||
      (currentUrl.startsWith(r.path) && currentUrl.charAt(r.path.length) === '/') ||
      currentUrl === r.path + '/'
    );

    this.activeRoute = activeRoute ? activeRoute.route : 'dashboard';
  }

  private setupMessageListener(): void {
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent): void {
    if (event.data.type === 'unreadCount') {
      this.unreadNotificationCount = event.data.count;
    }
  }

  private cleanup(): void {
    // Clean up mobile menu state
    this.closeMobileSidebar();

    // Clean up body styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    // Remove event listeners
    window.removeEventListener('message', this.handleMessage.bind(this));
  }
}