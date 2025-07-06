// school-management.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SchoolService } from '../../../services/school.service';
import { UserService } from '../../../services/user.service';
import { ClassService } from '../../../services/class.service';
import { SubjectService } from '../../../services/subject.service';
import { ToasterService } from '../../../services/toaster.service';
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

interface ConfirmationModalData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
  action: () => void;
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
  isUpdatingName = false;
  isEditingName = false;
  showBlockModal = false;
  showCreateSchoolModal = false;
  showEditNameModal = false;
  showConfirmationModal = false;
  
  // Confirmation Modal Data
  confirmationModalData: ConfirmationModalData | null = null;
  
  // Forms
  blockForm!: FormGroup;
  createSchoolForm!: FormGroup;
  editNameForm!: FormGroup;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private schoolService: SchoolService,
    private userService: UserService,
    private classService: ClassService,
    private subjectService: SubjectService,
    private toasterService: ToasterService
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

    this.editNameForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]]
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
          this.schoolInfo = null;
          this.isLoading = false;
          this.toasterService.error(
            'Impossible de charger les informations de l\'école',
            'Erreur de chargement'
          );
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
              this.toasterService.warning(
                'Impossible de charger les informations de l\'administrateur',
                'Informations incomplètes'
              );
            }
          });
      }
    }
  }

  // Confirmation Modal Methods
  private showConfirmation(data: ConfirmationModalData): void {
    this.confirmationModalData = data;
    this.showConfirmationModal = true;
  }

  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
    this.confirmationModalData = null;
  }

  confirmAction(): void {
    if (this.confirmationModalData) {
      this.confirmationModalData.action();
      this.closeConfirmationModal();
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
      this.toasterService.warning(
        'Veuillez remplir tous les champs requis correctement',
        'Formulaire incomplet'
      );
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
          this.toasterService.success(
            `L'école "${response.school.name}" a été créée avec succès !`,
            'École créée'
          );
        },
        error: (error) => {
          console.error('Error creating school:', error);
          this.isCreatingSchool = false;
          const errorMessage = error.error?.message || 'Erreur lors de la création de l\'école';
          this.toasterService.error(errorMessage, 'Échec de création');
        }
      });
  }

  // Edit School Name Methods
  openEditNameModal(): void {
    if (this.schoolInfo) {
      this.editNameForm.patchValue({
        name: this.schoolInfo.name
      });
      this.showEditNameModal = true;
    }
  }

  closeEditNameModal(): void {
    this.showEditNameModal = false;
    this.editNameForm.reset();
  }

  updateSchoolName(): void {
    if (this.editNameForm.invalid) {
      this.editNameForm.markAllAsTouched();
      this.toasterService.warning(
        'Veuillez entrer un nom valide pour l\'école',
        'Nom invalide'
      );
      return;
    }

    const newName = this.editNameForm.get('name')?.value?.trim();
    if (!newName || newName === this.schoolInfo?.name) {
      this.closeEditNameModal();
      this.toasterService.info('Aucune modification détectée', 'Pas de changement');
      return;
    }

    this.isUpdatingName = true;

    this.schoolService.updateSchoolName({ name: newName })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('School name updated successfully:', response);
          this.isUpdatingName = false;
          this.closeEditNameModal();
          
          // Update local school info
          if (this.schoolInfo) {
            this.schoolInfo.name = response.school.name;
          }
          
          this.toasterService.success(
            `Le nom de l'école a été modifié de "${response.school.oldName}" vers "${response.school.name}"`,
            'Nom mis à jour'
          );
        },
        error: (error) => {
          console.error('Error updating school name:', error);
          this.isUpdatingName = false;
          const errorMessage = error.error?.message || 'Erreur lors de la mise à jour du nom de l\'école';
          this.toasterService.error(errorMessage, 'Échec de mise à jour');
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

  confirmBlockSchool(): void {
    this.showConfirmation({
      title: 'Bloquer l\'accès à l\'école',
      message: 'Êtes-vous absolument sûr de vouloir bloquer l\'accès à l\'école ? Cette action empêchera TOUS les utilisateurs de se connecter (administrateur, enseignants et étudiants).',
      confirmText: 'Oui, bloquer',
      cancelText: 'Annuler',
      type: 'danger',
      action: () => this.blockSchool()
    });
  }

  blockSchool(): void {
    if (this.blockForm.invalid) {
      this.blockForm.markAllAsTouched();
      this.toasterService.warning(
        'Veuillez fournir une raison pour le blocage (minimum 10 caractères)',
        'Raison requise'
      );
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
          this.toasterService.success(
            'L\'accès à l\'école a été bloqué avec succès',
            'École bloquée'
          );
        },
        error: (error) => {
          console.error('Error blocking school:', error);
          this.isBlocking = false;
          this.toasterService.error(
            'Erreur lors du blocage de l\'école',
            'Échec du blocage'
          );
        }
      });
  }

  confirmUnblockSchool(): void {
    this.showConfirmation({
      title: 'Débloquer l\'accès à l\'école',
      message: 'Êtes-vous sûr de vouloir débloquer l\'accès à l\'école ? Tous les utilisateurs pourront à nouveau se connecter.',
      confirmText: 'Oui, débloquer',
      cancelText: 'Annuler',
      type: 'warning',
      action: () => this.unblockSchool()
    });
  }

  unblockSchool(): void {
    this.schoolService.toggleAccess({ block: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.schoolInfo = response.school;
          this.toasterService.success(
            'L\'accès à l\'école a été débloqué avec succès',
            'École débloquée'
          );
        },
        error: (error) => {
          console.error('Error unblocking school:', error);
          this.toasterService.error(
            'Erreur lors du déblocage de l\'école',
            'Échec du déblocage'
          );
        }
      });
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

  isFieldInvalid(fieldName: string, formName: 'block' | 'create' | 'editName' = 'block'): boolean {
    let field;
    
    switch (formName) {
      case 'block':
        field = this.blockForm.get(fieldName);
        break;
      case 'create':
        field = this.createSchoolForm.get(fieldName);
        break;
      case 'editName':
        field = this.editNameForm.get(fieldName);
        break;
    }
    
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}