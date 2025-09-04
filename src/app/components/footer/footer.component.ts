import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SchoolService } from 'src/app/services/school.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  isAdmin = false;
  private subscriptions: Subscription = new Subscription();
  schoolName: string = "";

  socialLinks = [
    { icon: '📘', name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=100063506409441' },
    // { icon: '📷', name: 'Instagram', url: 'https://instagram.com/hibaschool' },
    // { icon: '🐦', name: 'Twitter', url: 'https://twitter.com/hibaschool' },
    // { icon: '💼', name: 'LinkedIn', url: 'https://linkedin.com/company/hibaschool' }
  ];

  quickLinks = [
    { name: 'Accueil', section: 'home' },
    { name: 'À Propos', section: 'about' },
    { name: 'Contact', section: 'contact' },
    { name: 'Connexion', path: '/login' } // Keep login as router navigation
  ];

  contactInfo = {
    address: '123 Avenue de l\'Éducation, Tunis 1000',
    phone: '+216 71 234 567',
    email: 'onsschool2019@gmail.com',
    hours: 'Lun - Ven: 8h00 - 17h00'
  };

  constructor(
    private authService: AuthService, 
    private schoolService: SchoolService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Fetch school name from service
    this.schoolService.getSchool().subscribe({
      next: (response) => {

        this.schoolName = response.school.name || 'Your School';

      },
      error: (error) => {
        console.error('Error fetching school name:', error);
        this.schoolName = 'Your School'; // Fallback in case of error
      }
    });

    // Subscribe to authentication changes
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(() => {
        this.updateAdminStatus();
      })
    );

    // Subscribe to user changes  
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(() => {
        this.updateAdminStatus();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private updateAdminStatus(): void {
    this.isAdmin = this.authService.isLoggedIn();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Handle quick link clicks
  handleQuickLinkClick(link: any): void {
    if (link.path) {
      // Handle router navigation (like login)
      this.router.navigate([link.path]);
    } else if (link.section) {
      // Handle section scrolling
      this.scrollToSection(link.section);
    }
  }

  // Same scrolling logic as navbar
  scrollToSection(sectionId: string): void {
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
      setTimeout(() => {
        if (sectionId === 'home') {
          // Scroll to top of the page for home section
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const element = document.getElementById(sectionId);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 500);
    } else {
      if (sectionId === 'home') {
        // Scroll to top of the page for home section
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }
}