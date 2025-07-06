import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
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
    schoolName  : string  = ""  ;



  socialLinks = [
    { icon: '📘', name: 'Facebook', url: 'https://facebook.com/hibaschool' },
    { icon: '📷', name: 'Instagram', url: 'https://instagram.com/hibaschool' },
    { icon: '🐦', name: 'Twitter', url: 'https://twitter.com/hibaschool' },
    { icon: '💼', name: 'LinkedIn', url: 'https://linkedin.com/company/hibaschool' }
  ];

  quickLinks = [
    { name: 'Accueil', path: '/' },
    { name: 'À Propos', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Connexion', path: '/login' }
  ];

  contactInfo = {
    address: '123 Avenue de l\'Éducation, Tunis 1000',
    phone: '+216 71 234 567',
    email: 'contact@hibaschool.tn',
    hours: 'Lun - Ven: 8h00 - 17h00'
  };

  constructor(private authService: AuthService , private schoolService: SchoolService) {}

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
}