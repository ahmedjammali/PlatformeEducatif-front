import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { SchoolService } from 'src/app/services/school.service';

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

  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private schoolService: SchoolService
  ) {}

  ngOnInit(): void {
    // Fetch school name from service
    this.schoolService.getSchool().subscribe({
      next: (response) => {
        console.log('School data fetched:', response);
        this.schoolName = response.school.name || 'Your School';
        console.log('School Name:', this.schoolName);
      },
      error: (error) => {
        console.error('Error fetching school name:', error);
        this.schoolName = 'Your School';
      }
    });

    // Subscribe to authentication changes
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isLoggedIn = isAuth;
        this.updateAdminStatus();
      })
    );

    // Subscribe to user changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.userName = user?.name || null;
        this.updateAdminStatus();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateAdminStatus(): void {
    this.isAdmin = this.authService.isAdminOrHigher();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
    
    // Only update active section if we're on the home page
    if (this.router.url === '/') {
      this.updateActiveSection();
    }
  }

  private updateActiveSection(): void {
    const sections = ['home', 'about', 'contact'];
    const scrollPosition = window.scrollY + 100; // Offset for navbar height

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementTop = window.scrollY + rect.top;
        const elementBottom = elementTop + element.offsetHeight;

        if (scrollPosition >= elementTop && scrollPosition < elementBottom) {
          this.activeSection = section;
          break;
        }
      }
    }

    // Default to home if at the very top
    if (window.scrollY < 100) {
      this.activeSection = 'home';
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  navigateToLogin(): void {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  navigateToDashboard(): void {
    const role = this.authService.getUserRole();
    if (role) {
      this.router.navigate([`/${role}/dashboard`]);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    
    // Set active section immediately for better UX
    this.activeSection = sectionId;
    
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  // Helper method to check if a section is active
  isActiveSection(section: string): boolean {
    if (this.router.url !== '/') {
      return section === 'home'; // Only home is active when not on home page
    }
    return this.activeSection === section;
  }
}