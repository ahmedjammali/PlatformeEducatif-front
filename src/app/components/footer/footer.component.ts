import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  isAdmin = false;
  private subscriptions: Subscription = new Subscription();



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

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
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
    this.isAdmin = this.authService.isAdminOrHigher();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}