import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { ContactService } from 'src/app/services/contact.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Contact } from 'src/app/models/contact.model';
import { AuthService } from 'src/app/services/auth.service';
import { SchoolService } from 'src/app/services/school.service';

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


    schoolName  : string  = ""  ; // Replace with actual school name
  contactForm: FormGroup;
  isLoading = false;
  // Update your features array in the component to match the platform functionalities

features = [
  {
    icon: '🤖',
    title: 'Tuteur IA Intelligent',
    description: 'Un assistant virtuel disponible 24/7 pour répondre aux questions des étudiants et les guider dans leur apprentissage.',

  },
  {
    icon: '🔔',
    title: 'Notifications en Temps Réel',
    description: 'Tenez les parents et étudiants informés de tout : devoirs, notes, événements et rappels importants.',

  },
  {
    icon: '📊',
    title: 'Suivi des Progrès',
    description: 'Tableaux de bord détaillés pour suivre les performances et l\'évolution académique de chaque étudiant.',

  },
  {
    icon: '📝',
    title: 'Gestion Notes & Exercices',
    description: 'Plateforme complète pour créer, distribuer et corriger les exercices avec suivi automatique des notes.',

  },
  // {
  //   icon: '👨‍👩‍👧‍👦',
  //   title: 'Espace Parents',
  //   description: 'Interface dédiée permettant aux parents de suivre les résultats de leurs enfants en temps réel.',
  //   color: '#F0BB78'
  // },
  // {
  //   icon: '📚',
  //   title: 'Ressources Pédagogiques',
  //   description: 'Bibliothèque numérique riche avec cours interactifs, vidéos éducatives et supports d\'apprentissage.',
  //   color: '#626F47'
  // }
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
    private snackBar: MatSnackBar ,  private authService: AuthService  ,private schoolService: SchoolService ) { 
       this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      message: ['', [Validators.required, Validators.minLength(10)]]
    });
    }

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

    const isLoggin = this.authService.isLoggedIn();
    if (isLoggin) {
      this.router.navigate(['/login']);
      return;
    }
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