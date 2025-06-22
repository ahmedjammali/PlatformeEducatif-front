import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ContactService } from 'src/app/services/contact.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Contact } from 'src/app/models/contact.model';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface Statistic {
  number: string;
  label: string;
  icon: string;
}

interface Testimonial {
  name: string;
  role: string;
  message: string;
  avatar: string;
  rating: number;
}

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit {

  contactForm: FormGroup;
  isLoading = false;
  features: Feature[] = [
    {
      icon: '🎓',
      title: 'Excellence Académique',
      description: 'Un programme éducatif complet adapté à chaque niveau',
      color: '#A4B465'
    },
    {
      icon: '💻',
      title: 'Plateforme Numérique',
      description: 'Accès 24/7 aux ressources et exercices interactifs',
      color: '#F0BB78'
    },
    {
      icon: '👥',
      title: 'Suivi Personnalisé',
      description: 'Accompagnement individuel de chaque élève',
      color: '#626F47'
    },
    {
      icon: '📊',
      title: 'Rapports Détaillés',
      description: 'Suivez la progression en temps réel',
      color: '#A4B465'
    }
  ];

  statistics: Statistic[] = [
    { number: '500+', label: 'Élèves', icon: '👦' },
    { number: '50+', label: 'Enseignants', icon: '👨‍🏫' },
    { number: '95%', label: 'Taux de Réussite', icon: '🏆' },
    { number: '10+', label: "Années d'Excellence", icon: '⭐' }
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Sarah Ben Ali',
      role: 'Parent d\'élève',
      message: 'HibaSchool a transformé l\'éducation de mon enfant. La plateforme est intuitive et le suivi est exceptionnel.',
      avatar: 'S',
      rating: 5
    },
    {
      name: 'Ahmed Mansouri',
      role: 'Élève de 3ème année',
      message: 'J\'adore les exercices interactifs! Apprendre est devenu un plaisir.',
      avatar: 'A',
      rating: 5
    },
    {
      name: 'Fatma Trabelsi',
      role: 'Enseignante',
      message: 'Un outil pédagogique moderne qui facilite l\'enseignement et le suivi des élèves.',
      avatar: 'F',
      rating: 5
    }
  ];

  currentTestimonialIndex = 0;
  isScrolled = false;

  constructor(private router: Router ,private fb: FormBuilder,
    private contactService: ContactService,
    private snackBar: MatSnackBar) { 
       this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
    }

  ngOnInit(): void {
    this.startTestimonialCarousel();
  }


   onSubmit(): void {
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      return;
    }

    this.isLoading = true;
    const contactData: Contact = this.contactForm.value;

    this.contactService.createContact(contactData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open('Message sent successfully!', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.contactForm.reset();
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Error sending message. Please try again.', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        console.error('Error submitting contact form:', error);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get name() { return this.contactForm.get('name'); }
  get email() { return this.contactForm.get('email'); }
  get phone() { return this.contactForm.get('phone'); }
  get message() { return this.contactForm.get('message'); }
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 100;
  }

  startTestimonialCarousel(): void {
    setInterval(() => {
      this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonials.length;
    }, 5000);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}