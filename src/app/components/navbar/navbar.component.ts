import { Component, OnInit, HostListener, OnDestroy, ChangeDetectorRef, Renderer2 } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { SchoolService } from 'src/app/services/school.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isScrolled = false;
  isMobileMenuOpen = false;
  isLoggedIn = false;
  userName: string | null = null;
  isAdmin = false;
  schoolName: string = "";
  
  // Track active section
  activeSection: string = 'home';
  
  // Loading state
  isLoading = true;

  private subscriptions: Subscription = new Subscription();
  private scrollTimeout: any;
  private resizeTimeout: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private schoolService: SchoolService,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.initializeNavbar();
    this.setupSubscriptions();
    this.setupRouterSubscription();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    // Remove body scroll lock if menu is open
    if (this.isMobileMenuOpen) {
      this.renderer.removeClass(document.body, 'menu-open');
    }
  }

  private initializeNavbar(): void {
    // Fetch school name from service
    this.schoolService.getSchool().subscribe({
      next: (response) => {

        this.schoolName = response.school?.name || 'École';
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching school name:', error);
        this.schoolName = 'École';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private setupSubscriptions(): void {
    // Subscribe to authentication changes
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isLoggedIn = isAuth;
        this.updateAdminStatus();
        this.cdr.detectChanges();
      })
    );

    // Subscribe to user changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.userName = user?.name || null;
        this.updateAdminStatus();
        this.cdr.detectChanges();
      })
    );
  }

  private setupRouterSubscription(): void {
    // Subscribe to router events to close mobile menu on navigation
    this.subscriptions.add(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        this.closeMobileMenu();
        // Reset active section when navigating away from home
        if (this.router.url !== '/') {
          this.activeSection = 'home';
        }
        this.cdr.detectChanges();
      })
    );
  }

  private updateAdminStatus(): void {
    this.isAdmin = this.authService.isAdminOrHigher();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    // Throttle scroll events for better performance
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    
    this.scrollTimeout = setTimeout(() => {
      const scrollY = window.scrollY;
      this.isScrolled = scrollY > 50;
      
      // Only update active section if we're on the home page
      if (this.router.url === '/' || this.router.url === '') {
        this.updateActiveSection();
      }
      
      this.cdr.detectChanges();
    }, 10);
  }

  @HostListener('window:resize', [])
  onWindowResize(): void {
    // Throttle resize events
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      // Close mobile menu on desktop resize
      if (window.innerWidth >= 1024 && this.isMobileMenuOpen) {
        this.closeMobileMenu();
      }
    }, 100);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  private updateActiveSection(): void {
    const sections = ['home', 'about', 'contact'];
    const scrollPosition = window.scrollY + 120; // Offset for navbar height + buffer
    let newActiveSection = 'home';

    // Check each section
    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = window.scrollY + rect.top;
        const elementBottom = elementTop + element.offsetHeight;

        // Add some overlap to prevent flickering between sections
        if (scrollPosition >= elementTop - 50 && scrollPosition < elementBottom - 50) {
          newActiveSection = section;
        }
      }
    }

    // Default to home if at the very top
    if (window.scrollY < 100) {
      newActiveSection = 'home';
    }

    // Only update if changed to prevent unnecessary re-renders
    if (this.activeSection !== newActiveSection) {
      this.activeSection = newActiveSection;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Prevent body scroll when menu is open
    if (this.isMobileMenuOpen) {
      this.renderer.addClass(document.body, 'menu-open');
    } else {
      this.renderer.removeClass(document.body, 'menu-open');
    }
    
    this.cdr.detectChanges();
  }

  closeMobileMenu(): void {
    if (this.isMobileMenuOpen) {
      this.isMobileMenuOpen = false;
      this.renderer.removeClass(document.body, 'menu-open');
      this.cdr.detectChanges();
    }
  }

  navigateToLogin(): void {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  navigateToDashboard(): void {
    this.closeMobileMenu();
    const role = this.authService.getUserRole();
    if (role) {
      this.router.navigate([`/${role}/dashboard`]);
    } else {
      // Fallback navigation
      this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    this.closeMobileMenu();
    this.authService.logout();
    this.router.navigate(['/']);
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    
    // Set active section immediately for better UX
    this.activeSection = sectionId;
    
    if (this.router.url !== '/' && this.router.url !== '') {
      // Navigate to home first, then scroll
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          this.performScroll(sectionId);
        }, 300); // Allow time for page to load
      });
    } else {
      // Already on home page, just scroll
      this.performScroll(sectionId);
    }
  }

  private performScroll(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 90; // Account for fixed navbar height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  // Helper method to check if a section is active
  isActiveSection(section: string): boolean {
    if (this.router.url !== '/' && this.router.url !== '') {
      return section === 'home'; // Only home is active when not on home page
    }
    return this.activeSection === section;
  }

  // Helper method for accessibility
  getAriaLabel(section: string): string {
    const labels: { [key: string]: string } = {
      'home': 'Aller à la section Accueil',
      'about': 'Aller à la section À Propos',
      'contact': 'Aller à la section Contact'
    };
    return labels[section] || `Aller à la section ${section}`;
  }

  // Helper method to get user initials
  getUserInitials(): string {
    if (!this.userName) return '?';
    
    const names = this.userName.split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
    }
    return this.userName.charAt(0).toUpperCase();
  }

  // Helper method to truncate long school names
  getTruncatedSchoolName(): string {
    if (!this.schoolName) return 'École';
    
    if (this.schoolName.length > 20) {
      return this.schoolName.substring(0, 17) + '...';
    }
    return this.schoolName;
  }
}