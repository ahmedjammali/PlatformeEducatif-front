// login.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';
import { SchoolService } from 'src/app/services/school.service';
import { School } from 'src/app/models/school.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  focusedField = '';
  availableRoles = ['admin', 'teacher', 'student'];
  schoolName  : string  = ""  ; // Replace with actual school name


  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router , private schoolService: SchoolService
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

    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      this.navigateToAppropriateDashboard();
    }

    // Initialize form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });

    // Load remembered email if exists
    this.loadRememberedEmail();

    // Clear error message when user starts typing
    this.loginForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessage) {
          this.errorMessage = '';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials: LoginRequest = {
        email: this.loginForm.get('email')?.value,
        password: this.loginForm.get('password')?.value
      };

      this.authService.login(credentials)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {

            
            // Handle remember me
            if (this.loginForm.get('rememberMe')?.value) {
              this.setRememberMe(credentials.email);
            }

            // Small delay for better UX
            setTimeout(() => {
              this.isLoading = false;
              this.navigateToAppropriateDashboard();
            }, 500);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Login error:', error);
            
            // Handle different error scenarios
            if (error.status === 403 && error.error?.message?.includes('blocked')) {
              this.errorMessage = 'School access has been blocked. Please contact support.';
            } else if (error.status === 401) {
              this.errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.status === 404) {
              this.errorMessage = 'Account not found. Please check your credentials.';
            } else if (error.status === 0) {
              this.errorMessage = 'Unable to connect to server. Please check your connection.';
            } else {
              this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
            }

            // Shake animation for error
            this.shakeForm();
          }
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      
      // Focus on first invalid field
      if (this.loginForm.get('email')?.invalid) {
        document.getElementById('email')?.focus();
      } else if (this.loginForm.get('password')?.invalid) {
        document.getElementById('password')?.focus();
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onInputFocus(fieldName: string): void {
    this.focusedField = fieldName;
  }

  onInputBlur(fieldName: string): void {
    if (this.focusedField === fieldName) {
      this.focusedField = '';
    }
  }

  getRoleColor(role: string): string {
    const colors = {
      admin: '#626F47',
      teacher: '#A4B465',
      student: '#F0BB78'
    };
    return colors[role as keyof typeof colors] || '#626F47';
  }

  private navigateToAppropriateDashboard(): void {
    const userRole = this.authService.getUserRole();
    
    switch (userRole) {
      case 'superadmin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'teacher':
        this.router.navigate(['/teacher/dashboard']);
        break;
      case 'student':
        this.router.navigate(['/student/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  private setRememberMe(email: string): void {
    // Store email for remember me functionality
    localStorage.setItem('remembered_email', email);
  }

  private shakeForm(): void {
    const formCard = document.querySelector('.form-card');
    if (formCard) {
      formCard.classList.add('shake');
      setTimeout(() => {
        formCard.classList.remove('shake');
      }, 500);
    }
  }

  // Load remembered email on init
  private loadRememberedEmail(): void {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      this.loginForm.patchValue({
        email: rememberedEmail,
        rememberMe: true
      });
    }
  }
}