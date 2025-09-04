import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
export class LandingPageComponent implements OnInit, OnDestroy {

  schoolName: string = "";
  schoolAbbreviation: string = "ES"; // Default abbreviation
  contactForm: FormGroup;
  isLoading = false;
  formSubmitted = false;

  // Updated testimonials for school focus
  testimonials: Testimonial[] = [
    {
      name: 'Mme. Leila Benzarti',
      role: 'Parent d\'élève - Primaire',
      message: 'Mon fils s\'épanouit pleinement dans cette école. L\'équipe pédagogique est exceptionnelle et l\'environnement est propice à l\'apprentissage. Les résultats parlent d\'eux-mêmes!',
      avatar: 'L',
      rating: 5
    },
    {
      name: 'Dr. Mohamed Khaldi',
      role: 'Parent d\'élève - Lycée',
      message: 'Ma fille a obtenu son bac avec mention très bien et a été admise dans une grande école française. L\'accompagnement personnalisé et la qualité de l\'enseignement font toute la différence.',
      avatar: 'M',
      rating: 5
    },
    {
      name: 'Sarah Mansouri',
      role: 'Ancienne élève - Promotion 2023',
      message: 'Cette école m\'a donné les bases solides pour réussir mes études supérieures. Les professeurs sont passionnés et toujours disponibles pour nous aider.',
      avatar: 'S',
      rating: 5
    },
    {
      name: 'M. Karim Ayadi',
      role: 'Parent de 3 élèves',
      message: 'Tous mes enfants sont inscrits ici et je suis impressionné par la constance de la qualité. L\'école maintient vraiment ses standards d\'excellence année après année.',
      avatar: 'K',
      rating: 5
    },
    {
      name: 'Amira Ben Salah',
      role: 'Parent d\'élève - Collège',
      message: 'Le suivi personnalisé, les activités parascolaires enrichissantes et l\'ambiance familiale font de cette école un lieu où les enfants aiment apprendre.',
      avatar: 'A',
      rating: 5
    }
  ];

  currentTestimonialIndex = 0;
  isScrolled = false;
  testimonialInterval: any;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private contactService: ContactService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private schoolService: SchoolService
  ) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      subject: [''],
      message: ['', [Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    // Fetch school name from service
    this.schoolService.getSchool().subscribe({
      next: (response) => {

        this.schoolName = response.school.name || 'École Privée Excellence';
        this.schoolAbbreviation = this.generateSchoolAbbreviation(this.schoolName);

      },
      error: (error) => {
        console.error('Error fetching school name:', error);
        this.schoolName = 'École Privée Excellence';
        this.schoolAbbreviation = 'EPE';
      }
    });

    // Check if user is logged in and redirect if needed
    const isLoggedIn = this.authService.isLoggedIn();
    if (isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.startTestimonialCarousel();
  }

  ngOnDestroy(): void {
    if (this.testimonialInterval) {
      clearInterval(this.testimonialInterval);
    }
  }

  /**
   * Generates an abbreviation from the school name
   */
  generateSchoolAbbreviation(schoolName: string): string {
    if (!schoolName || schoolName.trim() === '') {
      return 'ES';
    }

    const ignoreWords = ['de', 'du', 'des', 'le', 'la', 'les', 'et', 'of', 'the', 'and', 'for', 'école', 'lycée', 'collège', 'privé', 'privée'];
    
    const words = schoolName
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .filter(word => !ignoreWords.includes(word.toLowerCase()));

    if (words.length === 0) {
      return 'ES';
    }

    let abbreviation = '';

    if (words.length === 1) {
      const word = words[0];
      abbreviation = word.length >= 3 ? word.substring(0, 3).toUpperCase() : word.toUpperCase();
    } else if (words.length === 2) {
      abbreviation = words.map(word => word.charAt(0)).join('').toUpperCase();
    } else {
      const significantWords = words.slice(0, 3);
      abbreviation = significantWords.map(word => word.charAt(0)).join('').toUpperCase();
    }

    if (abbreviation.length < 2) {
      abbreviation = abbreviation + 'S';
    } else if (abbreviation.length > 4) {
      abbreviation = abbreviation.substring(0, 4);
    }

    return abbreviation;
  }

  onSubmit(): void {
    this.formSubmitted = true;
    
    if (this.contactForm.invalid) {
      this.markFormGroupTouched(this.contactForm);
      this.snackBar.open('Veuillez corriger les erreurs dans le formulaire', 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isLoading = true;
    const contactData: Contact = this.contactForm.value;

    this.contactService.createContact(contactData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open('Message envoyé avec succès! Nous vous contacterons bientôt.', 'Fermer', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.contactForm.reset();
        this.formSubmitted = false;
        
        // Scroll to top of form to show success message
        this.scrollToSection('contact');
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Erreur lors de l\'envoi du message. Veuillez réessayer.', 'Fermer', {
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

  // Form getters for easy access in template
  get name() { return this.contactForm.get('name'); }
  get email() { return this.contactForm.get('email'); }
  get phone() { return this.contactForm.get('phone'); }
  get subject() { return this.contactForm.get('subject'); }
  get message() { return this.contactForm.get('message'); }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 100;
  }

  startTestimonialCarousel(): void {
    this.testimonialInterval = setInterval(() => {
      this.nextTestimonial();
    }, 5000);
  }

  nextTestimonial(): void {
    this.currentTestimonialIndex = (this.currentTestimonialIndex + 1) % this.testimonials.length;
  }

  previousTestimonial(): void {
    this.currentTestimonialIndex = this.currentTestimonialIndex === 0 
      ? this.testimonials.length - 1 
      : this.currentTestimonialIndex - 1;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Scroll to a specific section smoothly
   * @param sectionId - The ID of the section to scroll to
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  }

  /**
   * Get error message for a specific form field
   * @param fieldName - Name of the form field
   * @returns Error message string
   */
  getFieldErrorMessage(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (field && field.errors && (field.dirty || field.touched || this.formSubmitted)) {
      if (field.errors['required']) {
        switch (fieldName) {
          case 'name': return 'Le nom est obligatoire';
          case 'email': return 'L\'email est obligatoire';
          case 'phone': return 'Le téléphone est obligatoire';
          default: return 'Ce champ est obligatoire';
        }
      }
      if (field.errors['minlength']) {
        switch (fieldName) {
          case 'name': return 'Le nom doit contenir au moins 2 caractères';
          case 'message': return 'Le message doit contenir au moins 10 caractères';
          default: return 'Ce champ est trop court';
        }
      }
      if (field.errors['email']) {
        return 'Veuillez saisir un email valide (exemple: nom@domaine.com)';
      }
      if (field.errors['pattern'] && fieldName === 'phone') {
        return 'Le numéro doit contenir exactement 8 chiffres';
      }
    }
    return '';
  }

  /**
   * Check if a field has errors and should show error styling
   * @param fieldName - Name of the form field
   * @returns Boolean indicating if field has errors
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.errors && (field.dirty || field.touched || this.formSubmitted));
  }

  /**
   * Check if a field is valid and should show success styling
   * @param fieldName - Name of the form field
   * @returns Boolean indicating if field is valid
   */
  isFieldValid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.valid && (field.dirty || field.touched));
  }
}