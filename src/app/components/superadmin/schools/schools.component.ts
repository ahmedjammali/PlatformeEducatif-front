// school-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SchoolService } from '../../../services/school.service';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { School, CreateSchoolRequest } from '../../../models/school.model';
import { User } from '../../../models/user.model';

interface Statistics {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  activeClasses: number;
  totalSubjects: number;
  totalExercises?: number;
}

interface Activity {
  type: 'access' | 'user' | 'system';
  message: string;
  time: string;
}

@Component({
  selector: 'app-schools',
  templateUrl: './schools.component.html',
  styleUrls: ['./schools.component.css']
})
export class SchoolsComponent implements OnInit, OnDestroy {
  // Data
  schoolInfo: School | null = null;
  adminUser: User | null = null;
  statistics: Statistics = {
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalClasses: 0,
    activeClasses: 0,
    totalSubjects: 0,
    totalExercises: 0
  };
  
  // UI State
  isLoading = false;
  isBlocking = false;
  isCreatingSchool = false;
  showBlockModal = false;
  showCreateSchoolModal = false;
  
  // Forms
  blockForm!: FormGroup;
  createSchoolForm!: FormGroup;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private schoolService: SchoolService,
    private userService: UserService,
    private classService: ClassService,
    private subjectService: SubjectService
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadSchoolInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.blockForm = this.fb.group({
      reason: ['', [Validators.required, Validators.minLength(10)]]
    });

    this.createSchoolForm = this.fb.group({
      schoolName: ['', [Validators.required]],
      adminName: ['', [Validators.required]],
      adminEmail: ['', [Validators.required, Validators.email]],
      adminPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  private loadSchoolInfo(): void {
    this.isLoading = true;
    
    this.schoolService.getSchool()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.schoolInfo = response.school;
          this.statistics = response.statistics || this.statistics;
          if (this.schoolInfo) {
            this.loadAdminInfo();
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading school info:', error);
          // If no school exists, set schoolInfo to null
          this.schoolInfo = null;
          this.isLoading = false;
        }
      });
  }

  private loadAdminInfo(): void {
    if (this.schoolInfo?.admin) {
      const adminId = typeof this.schoolInfo.admin === 'string' 
        ? this.schoolInfo.admin 
        : this.schoolInfo.admin._id;
      
      if (adminId) {
        this.userService.getUserById(adminId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (user) => {
              this.adminUser = user;
            },
            error: (error) => {
              console.error('Error loading admin info:', error);
            }
          });
      }
    }
  }

  // Create School Methods
  openCreateSchoolModal(): void {
    this.createSchoolForm.reset();
    this.showCreateSchoolModal = true;
  }

  closeCreateSchoolModal(): void {
    this.showCreateSchoolModal = false;
    this.createSchoolForm.reset();
  }

  createSchool(): void {
    if (this.createSchoolForm.invalid) {
      this.createSchoolForm.markAllAsTouched();
      return;
    }

    this.isCreatingSchool = true;
    const formValue = this.createSchoolForm.value;
    
    const createRequest: CreateSchoolRequest = {
      schoolName: formValue.schoolName,
      adminName: formValue.adminName,
      adminEmail: formValue.adminEmail,
      adminPassword: formValue.adminPassword
    };

    this.schoolService.createSchool(createRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('School created successfully:', response);
          this.isCreatingSchool = false;
          this.closeCreateSchoolModal();
          this.schoolInfo = response.school;
          this.loadAdminInfo();
          alert('École créée avec succès!');
        },
        error: (error) => {
          console.error('Error creating school:', error);
          this.isCreatingSchool = false;
          const errorMessage = error.error?.message || 'Erreur lors de la création de l\'école';
          alert(errorMessage);
        }
      });
  }

  // Block Modal Methods
  openBlockModal(): void {
    this.blockForm.reset();
    this.showBlockModal = true;
  }

  closeBlockModal(): void {
    this.showBlockModal = false;
    this.blockForm.reset();
  }

  blockSchool(): void {
    if (this.blockForm.invalid) {
      this.blockForm.markAllAsTouched();
      return;
    }

    const confirmMessage = `Êtes-vous absolument sûr de vouloir bloquer l'accès à l'école?\n\n` +
                          `Cette action empêchera TOUS les utilisateurs de se connecter.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    this.isBlocking = true;
    const reason = this.blockForm.get('reason')?.value;

    this.schoolService.toggleAccess({ block: true, reason })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('School blocked successfully:', response);
          this.isBlocking = false;
          this.closeBlockModal();
          this.schoolInfo = response.school;
        },
        error: (error) => {
          console.error('Error blocking school:', error);
          this.isBlocking = false;
          alert('Erreur lors du blocage. Veuillez réessayer.');
        }
      });
  }

  unblockSchool(): void {
    if (confirm('Êtes-vous sûr de vouloir débloquer l\'accès à l\'école?')) {
      this.schoolService.toggleAccess({ block: false })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.schoolInfo = response.school;
          },
          error: (error) => {
            console.error('Error unblocking school:', error);
            alert('Erreur lors du déblocage. Veuillez réessayer.');
          }
        });
    }
  }

  // Utility Methods
  getAdminName(): string {
    if (this.adminUser) {
      return `${this.adminUser.name} (${this.adminUser.email})`;
    }
    return 'Chargement...';
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const blockField = this.blockForm.get(fieldName);
    const createField = this.createSchoolForm.get(fieldName);
    
    const field = blockField || createField;
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}