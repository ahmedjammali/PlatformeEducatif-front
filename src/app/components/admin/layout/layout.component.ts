// admin-layout.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { SchoolService } from '../../../services/school.service';
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
  activeRoute = 'dashboard';
  isSuperAdmin = false;
  notificationCount = 3;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private schoolService: SchoolService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    
    // Load school info
    this.loadSchoolInfo();
    
    // Listen for route changes to update active route
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.setActiveRoute();
      });
    
    // Set initial active route
    this.setActiveRoute();
    
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
    localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed.toString());
  }

  navigateTo(route: string): void {
    this.activeRoute = route;
    
    const routeMap: { [key: string]: string } = {
      'dashboard': '/admin/dashboard',
      'users': '/admin/users',
      'classes': '/admin/classes',
      'subjects': '/admin/subjects',
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
    // Open notifications panel
    console.log('Show notifications');
    // TODO: Implement notifications component
  }

  logout(): void {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
      this.authService.logout();
    }
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
    // Restore sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      this.sidebarCollapsed = savedState === 'true';
    }
    
    // Auto-collapse on mobile
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }
}