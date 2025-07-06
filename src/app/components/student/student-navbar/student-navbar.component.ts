// student-navbar.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
import { User } from '../../../models/user.model';
import { School } from '../../../models/school.model';

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

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        // Load school data when user is available and is a student
        if (user && this.authService.isStudent()) {
          this.loadSchoolData();
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
   * Setup window resize listener to close mobile menu on larger screens
   */
  private setupResizeListener(): void {
    this.resizeListener = () => {
      if (window.innerWidth > 768 && this.isMobileMenuOpen) {
        this.closeMobileMenu();
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }

  /**
   * Toggle mobile menu open/closed state
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    
    // Prevent body scroll when menu is open
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
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
   * Handle user logout
   */
  logout(): void {
    // Close mobile menu first if open
    this.closeMobileMenu();
    
    // Proceed with logout
    this.authService.logout();
  }
}
