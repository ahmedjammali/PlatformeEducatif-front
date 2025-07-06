// teacher-layout.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
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
  
  // Logout modal state
  showLogoutModal = false;
  isLoggingOut = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser() as ExtendedUser | null;
    
    if (this.currentUser && this.currentUser.role === 'teacher') {
      this.loadSchoolInfo();
    } else {
      this.router.navigate(['/login']);
    }
    
    // Listen for route changes to update active section (optional)
    // Since you're using conditional rendering, this might not be needed
    /*
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.setActiveSectionFromRoute();
      });
    
    // Set initial active section from route
    this.setActiveSectionFromRoute();
    */
    
    // Check for mobile sidebar state
    this.checkMobileView();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    // Save preference
    localStorage.setItem('teacherSidebarCollapsed', this.sidebarCollapsed.toString());
  }

  setActiveSection(section: string): void {
    this.activeSection = section;
    this.activeSectionChange.emit(section);
    
    // Optional: Navigate to corresponding route if you have different routes
    // For now, we'll just update the section without navigation
    // since you're using a single route with conditional rendering
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'overview': 'Vue d\'Ensemble',
      'subjects': 'Mes Matières',
      'classes': 'Mes Classes', 
      'exercises': 'Exercices',
      'grades': 'Notes',
      'progress': 'Progrès Étudiants',
      'contact': 'Contact'
    };
    
    return titles[this.activeSection] || 'Vue d\'Ensemble';
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
      this.router.navigate(['/login']);
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
          this.school = response.school;
        },
        error: (error) => {
          console.error('Error loading school info:', error);
        }
      });
  }

  private setActiveSectionFromRoute(): void {
    // Since you're using conditional rendering instead of separate routes,
    // we don't need to update activeSection from route changes
    // The activeSection will be managed by the parent component
    
    // If you do want route-based navigation later, uncomment this:
    /*
    const currentUrl = this.router.url;
    
    if (currentUrl.includes('/subjects')) {
      this.activeSection = 'subjects';
    } else if (currentUrl.includes('/classes')) {
      this.activeSection = 'classes';
    } else if (currentUrl.includes('/exercises')) {
      this.activeSection = 'exercises';
    } else if (currentUrl.includes('/grades')) {
      this.activeSection = 'grades';
    } else if (currentUrl.includes('/progress')) {
      this.activeSection = 'progress';
    } else if (currentUrl.includes('/contact')) {
      this.activeSection = 'contact';
    } else {
      this.activeSection = 'overview';
    }
    
    // Emit the change
    this.activeSectionChange.emit(this.activeSection);
    */
  }

  private checkMobileView(): void {
    // Restore sidebar state from localStorage
    const savedState = localStorage.getItem('teacherSidebarCollapsed');
    if (savedState !== null) {
      this.sidebarCollapsed = savedState === 'true';
    }
    
    // Auto-collapse on mobile
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }
}