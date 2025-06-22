import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

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

  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication changes
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuth => {
        this.isLoggedIn = isAuth;
        // Update admin status when authentication changes
        this.updateAdminStatus();
      })
    );

    // Subscribe to user changes
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.userName = user?.name || null;
        // Update admin status when user changes
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
}