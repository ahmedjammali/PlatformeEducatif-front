// payment-management.component.ts - Cleaned Version
import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Subject, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith, map, catchError } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { Router, ActivatedRoute } from '@angular/router';

import { PaymentService } from '../../../services/payment.service';
import { ClassService } from '../../../services/class.service';
import { UserService } from '../../../services/user.service';
import { PaymentDialogComponent, PaymentDialogData } from '../payment-dialog/payment-dialog.component';

import {
  StudentWithPayment,
  PaymentDashboard,
  PaymentFilters,
  PaymentConfiguration,
  BulkUpdateResult,
  Grade,
  GradeCategory,
  AvailableGradesResponse,
  GeneratePaymentRequest,
  BulkGeneratePaymentRequest,
  StudentPayment,
  MonthlyPayment,
  PaymentHistoryItem,
  UpdatePaymentRecordRequest
} from '../../../models/payment.model';
import { Class } from '../../../models/class.model';
import { User } from '../../../models/user.model';

// ===== INTERFACES =====
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
}

interface ConfirmationState {
  isOpen: boolean;
  config: ConfirmationConfig | null;
  resolve?: (value: boolean) => void;
}

interface PaymentStatus {
  value: string;
  label: string;
  icon: string;
  color: string;
}

interface GradeCategoryOption {
  value: GradeCategory | '';
  label: string;
  color: string;
}

interface GradeOption {
  value: Grade | '';
  label: string;
  category: GradeCategory | null;
}

interface QuickAction {
  id: string;
  label: string;
  count: number;
  icon: string;
  color: string;
  action: () => void;
}

@Component({
  selector: 'app-payment-management',
  templateUrl: './payment-management.component.html',
  styleUrls: ['./payment-management.component.css'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'scale(0.9) translateY(-20px)', opacity: 0 }),
        animate('250ms ease-out', style({ transform: 'scale(1) translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'scale(0.9) translateY(-20px)', opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in', style({ transform: 'translateX(0%)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class PaymentManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  
  // ===== CORE DATA PROPERTIES =====
  students: StudentWithPayment[] = [];
  dashboard: PaymentDashboard | null = null;
  paymentConfig: PaymentConfiguration | null = null;
  classes: Class[] = [];
  totalStudents = 0;
  availableGrades: AvailableGradesResponse | null = null;
  
  // ===== UI STATE =====
  isLoading = false;
  selectedStudent: StudentWithPayment | null = null;
  expandedStudentId: string | null = null;
  
  // ===== FORMS AND FILTERS =====
  filterForm: FormGroup;
  searchControl: FormControl;
  generateForm: FormGroup;
  editForm: FormGroup;
  academicYears: string[] = [];
  currentAcademicYear: string;
  
  // ===== PAGINATION =====
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  
  // ===== MODAL STATES =====
  isPaymentDialogOpen = false;
  isGenerateDialogOpen = false;
  isEditDialogOpen = false;
  currentDialogData: PaymentDialogData | null = null;
  
  // ===== TOAST AND CONFIRMATION SYSTEMS =====
  toasts: Toast[] = [];
  confirmationState: ConfirmationState = {
    isOpen: false,
    config: null
  };
  
  // ===== CONFIGURATION DATA =====
  paymentStatuses: PaymentStatus[] = [
    { value: '', label: 'Tous les statuts', icon: 'list', color: '#666666' },
    { value: 'completed', label: 'Payé', icon: 'check_circle', color: '#4CAF50' },
    { value: 'partial', label: 'Partiel', icon: 'schedule', color: '#FF9800' },
    { value: 'pending', label: 'En attente', icon: 'hourglass_empty', color: '#7AB2D3' },
    { value: 'overdue', label: 'En retard', icon: 'error', color: '#F44336' },
    { value: 'no_record', label: 'Sans dossier', icon: 'help_outline', color: '#666666' }
  ];
  
  gradeCategories: GradeCategoryOption[] = [
    { value: '', label: 'Tous les niveaux', color: '#666666' },
    { value: 'maternelle', label: 'Maternelle', color: '#E91E63' },
    { value: 'primaire', label: 'Primaire', color: '#2196F3' },
    { value: 'secondaire', label: 'Secondaire', color: '#4CAF50' }
  ];
  
  grades: GradeOption[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private classService: ClassService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.currentAcademicYear = this.paymentService.getCurrentAcademicYear();
    this.academicYears = this.paymentService.getAcademicYears();
    
    // Initialize forms
    this.searchControl = new FormControl('');
    this.filterForm = this.fb.group({
      paymentStatus: [''],
      gradeCategory: [''],
      grade: [''],
      classId: [''],
      academicYear: [this.currentAcademicYear]
    });

    this.generateForm = this.fb.group({
      hasUniform: [false],
      transportationType: ['']
    });

    this.editForm = this.fb.group({
      hasUniform: [false],
      transportationType: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
    this.loadDashboard();
    this.checkQueryParams();
  }

  ngAfterViewInit(): void {
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALIZATION METHODS =====

  private checkQueryParams(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['status']) {
        this.filterForm.patchValue({ paymentStatus: params['status'] });
      }
      if (params['gradeCategory']) {
        this.filterForm.patchValue({ gradeCategory: params['gradeCategory'] });
      }
      if (params['grade']) {
        this.filterForm.patchValue({ grade: params['grade'] });
      }
    });
  }

  private loadInitialData(): void {
    this.loadAvailableGrades();
    this.loadClasses();
    this.loadPaymentConfig();
    this.loadStudents();
  }

  private loadAvailableGrades(): void {
    this.paymentService.getAvailableGrades().subscribe({
      next: (grades) => {
        this.availableGrades = grades;
        this.buildGradeOptions();
      },
      error: (error) => {
        console.error('Error loading available grades:', error);
        this.showError('Erreur lors du chargement des niveaux');
      }
    });
  }

  private buildGradeOptions(): void {
    if (!this.availableGrades) return;
    
    this.grades = [
      { value: '', label: 'Tous les niveaux', category: null }
    ];
    
    Object.entries(this.availableGrades.categorizedGrades).forEach(([category, gradeList]) => {
      gradeList.forEach(grade => {
        this.grades.push({
          value: grade,
          label: this.paymentService.getGradeLabel(grade),
          category: category as GradeCategory
        });
      });
    });
  }

  private loadClasses(): void {
    this.classService.getClasses().subscribe({
      next: (response) => {
        this.classes = response.classes || [];
      },
      error: (error) => {
        console.error('Error loading classes:', error);
        this.showError('Erreur lors du chargement des classes');
      }
    });
  }

  private loadPaymentConfig(): void {
    const academicYear = this.filterForm.get('academicYear')?.value;
    this.paymentService.getPaymentConfig(academicYear).subscribe({
      next: (config) => {
        this.paymentConfig = config;
      },
      error: (error) => {
        if (error.status === 404) {
          this.showWarning('Configuration de paiement non trouvée. Veuillez la configurer.');
        } else {
          console.error('Error loading payment config:', error);
        }
      }
    });
  }

  private setupFilters(): void {
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadStudents());

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadStudents();
        this.loadDashboard();
        this.loadPaymentConfig();
        this.currentAcademicYear = this.filterForm.get('academicYear')?.value || this.currentAcademicYear;
      });
  }

  // ===== FILTER HELPERS =====
  
  getFilteredClasses(): Class[] {
    const selectedGradeCategory = this.filterForm.get('gradeCategory')?.value;
    const selectedGrade = this.filterForm.get('grade')?.value;
    
    if (selectedGrade) {
      return this.classes.filter(classItem => classItem.grade === selectedGrade);
    }
    
    if (selectedGradeCategory) {
      return this.classes.filter(classItem => {
        const gradeCategory = this.getGradeCategoryFromGrade(classItem.grade);
        return gradeCategory === selectedGradeCategory;
      });
    }
    
    return this.classes;
  }

  getFilteredGrades(): GradeOption[] {
    const selectedGradeCategory = this.filterForm.get('gradeCategory')?.value;
    
    if (!selectedGradeCategory) {
      return this.grades;
    }
    
    return this.grades.filter(grade => 
      !grade.category || grade.category === selectedGradeCategory
    );
  }

  private getGradeCategoryFromGrade(grade: string): GradeCategory | null {
    if (!this.availableGrades) return null;
    
    for (const [category, gradeList] of Object.entries(this.availableGrades.categorizedGrades)) {
      if (gradeList.includes(grade as Grade)) {
        return category as GradeCategory;
      }
    }
    return null;
  }

  // ===== TOAST SYSTEM =====

  private generateToastId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  showToast(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      ...toast,
      id: this.generateToastId(),
      duration: toast.duration || 5000
    };

    this.toasts = [...this.toasts, newToast];

    if (!newToast.persistent) {
      setTimeout(() => {
        this.removeToast(newToast.id);
      }, newToast.duration);
    }
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }

  showSuccess(message: string, title?: string, duration?: number): void {
    this.showToast({ type: 'success', title, message, duration });
  }

  showError(message: string, title?: string, duration?: number): void {
    this.showToast({ type: 'error', title: title || 'Erreur', message, duration: duration || 6000 });
  }

  showWarning(message: string, title?: string, duration?: number): void {
    this.showToast({ type: 'warning', title: title || 'Attention', message, duration });
  }

  showInfo(message: string, title?: string, duration?: number): void {
    this.showToast({ type: 'info', title, message, duration });
  }

  // ===== CONFIRMATION SYSTEM =====

  confirm(config: ConfirmationConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationState = {
        isOpen: true,
        config,
        resolve
      };
      document.body.style.overflow = 'hidden';
    });
  }

  confirmDelete(itemName: string, customMessage?: string): Promise<boolean> {
    return this.confirm({
      title: 'Confirmer la suppression',
      message: customMessage || `Êtes-vous sûr de vouloir supprimer ${itemName} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger',
      icon: '🗑️'
    });
  }

  confirmAction(title: string, message: string, type: 'danger' | 'warning' | 'info' | 'success' = 'info'): Promise<boolean> {
    return this.confirm({
      title,
      message,
      type,
      confirmText: 'Confirmer',
      cancelText: 'Annuler'
    });
  }

  onConfirmationConfirm(): void {
    if (this.confirmationState.resolve) {
      this.confirmationState.resolve(true);
    }
    this.closeConfirmation();
  }

  onConfirmationCancel(): void {
    if (this.confirmationState.resolve) {
      this.confirmationState.resolve(false);
    }
    this.closeConfirmation();
  }

  private closeConfirmation(): void {
    this.confirmationState = {
      isOpen: false,
      config: null
    };
    document.body.style.overflow = 'auto';
  }

  getDefaultConfirmationIcon(): string {
    switch (this.confirmationState.config?.type) {
      case 'danger': return '⚠️';
      case 'warning': return '⚡';
      case 'success': return '✅';
      case 'info': 
      default: return 'ℹ️';
    }
  }

  // ===== DATA LOADING METHODS =====

  loadStudents(): void {
    this.isLoading = true;
    
    const filters: PaymentFilters = {
      search: this.searchControl.value?.trim() || undefined,
      paymentStatus: this.filterForm.get('paymentStatus')?.value || undefined,
      gradeCategory: this.filterForm.get('gradeCategory')?.value || undefined,
      grade: this.filterForm.get('grade')?.value || undefined,
      classId: this.filterForm.get('classId')?.value || undefined,
      academicYear: this.filterForm.get('academicYear')?.value,
      page: this.currentPage,
      limit: this.pageSize
    };

    this.paymentService.getAllStudentsWithPayments(filters).subscribe({
      next: (response) => {
        this.students = response.students || [];
        this.totalStudents = response.pagination?.totalStudents || 0;
        this.totalPages = Math.ceil(this.totalStudents / this.pageSize);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.showError('Erreur lors du chargement des étudiants');
        this.isLoading = false;
        this.students = [];
      }
    });
  }

  loadDashboard(): void {
    const academicYear = this.filterForm.get('academicYear')?.value;
    this.paymentService.getPaymentDashboard(academicYear).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.showError('Erreur lors du chargement du tableau de bord');
      }
    });
  }

  refreshData(): void {
    this.loadStudents();
    this.loadDashboard();
    this.showSuccess('Données actualisées');
  }

  // ===== BULK OPERATIONS =====

  async bulkGeneratePayments(): Promise<void> {
    if (!this.dashboard) {
      this.showWarning('Tableau de bord non disponible');
      return;
    }

    const studentsWithoutRecord = this.dashboard.statusCounts.no_record || 0;
    
    if (studentsWithoutRecord === 0) {
      this.showInfo('Tous les étudiants ont déjà un dossier de paiement');
      return;
    }

    const confirmed = await this.confirmAction(
      'Génération en masse',
      `Voulez-vous générer des dossiers de paiement pour ${studentsWithoutRecord} étudiant(s) ?\n\nOptions par défaut:\n- Uniforme: Non inclus\n- Transport: Non inclus\n\nVous pourrez personnaliser chaque dossier individuellement après la création.`,
      'info'
    );

    if (confirmed) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      this.isLoading = true;
      
      const options: BulkGeneratePaymentRequest = {
        academicYear,
        defaultUniform: false,
        defaultTransportation: null
      };
      
      this.paymentService.bulkGeneratePayments(options).subscribe({
        next: (response) => {
          const message = `Génération terminée: ${response.results.success} réussis, ${response.results.errors.length} erreurs`;
          this.showSuccess(message);
          this.loadStudents();
          this.loadDashboard();
          this.isLoading = false;
          
          if (response.results.errors.length > 0) {
            this.showBulkErrors(response.results.errors);
          }
        },
        error: (error) => {
          console.error('Error in bulk generation:', error);
          this.showError('Erreur lors de la génération en masse');
          this.isLoading = false;
        }
      });
    }
  }

  async updateExistingPayments(): Promise<void> {
    if (!this.paymentConfig) {
      this.showWarning('Configuration de paiement non disponible');
      return;
    }

    const confirmed = await this.confirmAction(
      'Mise à jour des paiements',
      'Voulez-vous mettre à jour tous les dossiers de paiement existants avec les nouveaux montants ?',
      'warning'
    );
    
    if (confirmed) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      this.isLoading = true;
      
      this.paymentService.updateExistingPaymentRecords(academicYear, true).subscribe({
        next: (result: BulkUpdateResult) => {
          const message = `Mise à jour terminée: ${result.results.updated} mis à jour, ${result.results.skipped} ignorés`;
          this.showSuccess(message);
          this.loadStudents();
          this.loadDashboard();
          this.isLoading = false;
          
          if (result.results.errors.length > 0) {
            this.showBulkErrors(result.results.errors);
          }
        },
        error: (error) => {
          console.error('Error updating payments:', error);
          this.showError('Erreur lors de la mise à jour');
          this.isLoading = false;
        }
      });
    }
  }

  async deleteAllPaymentRecords(): Promise<void> {
    if (!this.dashboard) {
      this.showWarning('Tableau de bord non disponible');
      return;
    }

    const studentsWithRecord = this.getStudentsWithRecord();
    
    if (studentsWithRecord === 0) {
      this.showInfo('Aucun dossier de paiement à supprimer');
      return;
    }

    const confirmed = await this.confirmDelete(
      'tous les dossiers de paiement',
      `⚠️ ATTENTION: Cette action supprimera définitivement TOUS les dossiers de paiement (${studentsWithRecord} dossier${studentsWithRecord > 1 ? 's' : ''}) pour l'année académique ${this.currentAcademicYear}.\n\nCette action est IRRÉVERSIBLE. Tous les paiements enregistrés seront perdus.\n\nÊtes-vous absolument sûr de vouloir continuer ?`
    );

    if (confirmed) {
      const doubleConfirmed = await this.confirmAction(
        'Confirmation finale',
        `Dernière confirmation: Supprimer ${studentsWithRecord} dossier${studentsWithRecord > 1 ? 's' : ''} de paiement ?`,
        'danger'
      );

      if (doubleConfirmed) {
        const academicYear = this.filterForm.get('academicYear')?.value;
        this.isLoading = true;
        
        this.paymentService.deleteAllPaymentRecords(academicYear).subscribe({
          next: (response) => {
            const message = `Suppression terminée: ${response.results.deleted} dossier${response.results.deleted > 1 ? 's' : ''} supprimé${response.results.deleted > 1 ? 's' : ''}`;
            this.showSuccess(message);
            this.loadStudents();
            this.loadDashboard();
            this.isLoading = false;
            
            if (response.results.errors.length > 0) {
              this.showBulkErrors(response.results.errors);
            }
          },
          error: (error) => {
            console.error('Error deleting all payment records:', error);
            this.showError('Erreur lors de la suppression de tous les dossiers');
            this.isLoading = false;
          }
        });
      }
    }
  }

  private showBulkErrors(errors: Array<{ studentId: string; error: string }>): void {
    if (errors.length > 0) {
      const errorMessage = `Erreurs rencontrées:\n${errors.map(e => `- ${e.error}`).join('\n')}`;
      this.showError(errorMessage, 'Erreurs lors de l\'opération', 8000);
    }
  }

  // ===== STUDENT MANAGEMENT =====

  toggleExpandRow(student: StudentWithPayment): void {
    if (!student.hasPaymentRecord) return;
    this.expandedStudentId = this.expandedStudentId === student._id ? null : student._id;
  }

  // ===== GENERATE PAYMENT DIALOG =====

  openGenerateDialog(student: StudentWithPayment): void {
    this.selectedStudent = student;
    this.generateForm.reset({
      hasUniform: false,
      transportationType: ''
    });
    this.isGenerateDialogOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeGenerateDialog(): void {
    this.isGenerateDialogOpen = false;
    this.selectedStudent = null;
    document.body.style.overflow = 'auto';
  }

  generatePaymentRecord(): void {
    if (!this.selectedStudent?._id) {
      this.showError('ID étudiant manquant');
      return;
    }

    const formValues = this.generateForm.value;
    const academicYear = this.filterForm.get('academicYear')?.value;
    
    const options: GeneratePaymentRequest = {
      academicYear,
      hasUniform: formValues.hasUniform || false,
      transportationType: formValues.transportationType || null
    };
    
    this.isLoading = true;
    
    this.paymentService.generatePaymentForStudent(this.selectedStudent._id, options).subscribe({
      next: (paymentRecord) => {
        this.showSuccess(`Dossier de paiement généré pour ${this.selectedStudent?.name}`);
        this.loadStudents();
        this.loadDashboard();
        this.closeGenerateDialog();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error generating payment record:', error);
        const errorMessage = this.paymentService.handlePaymentError(error);
        this.showError(errorMessage);
        this.isLoading = false;
      }
    });
  }

  // ===== EDIT PAYMENT DIALOG =====

  editPaymentRecord(student: StudentWithPayment): void {
    this.selectedStudent = student;
    
    const currentUniform = this.isUniformPurchased(student);
    const currentTransportationType = this.getTransportationTypeForStudent(student);
    
    this.editForm.patchValue({
      hasUniform: currentUniform,
      transportationType: currentTransportationType
    });
    
    if (this.isUniformPaid(student)) {
      this.editForm.get('hasUniform')?.disable();
    } else {
      this.editForm.get('hasUniform')?.enable();
    }
    
    this.isEditDialogOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closeEditDialog(): void {
    this.isEditDialogOpen = false;
    this.selectedStudent = null;
    document.body.style.overflow = 'auto';
  }

  updatePaymentRecord(): void {
    if (!this.selectedStudent?._id || !this.selectedStudent.paymentRecord) {
      this.showError('Dossier de paiement introuvable');
      return;
    }

    const formValues = this.editForm.value;
    const academicYear = this.filterForm.get('academicYear')?.value;
    
    const updateRequest: UpdatePaymentRecordRequest = {
      academicYear,
      hasUniform: formValues.hasUniform || false,
      transportationType: formValues.transportationType || null
    };

    this.isLoading = true;
    
    this.paymentService.updatePaymentRecordComponents(this.selectedStudent._id, updateRequest).subscribe({
      next: (updatedPaymentRecord) => {
        this.showSuccess(`Dossier de paiement mis à jour pour ${this.selectedStudent?.name}`);
        
        const studentIndex = this.students.findIndex(s => s._id === this.selectedStudent?._id);
        if (studentIndex !== -1) {
          this.students[studentIndex].paymentRecord = updatedPaymentRecord;
        }
        
        this.loadStudents();
        this.loadDashboard();
        this.closeEditDialog();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error updating payment record:', error);
        const errorMessage = this.paymentService.handlePaymentError(error);
        this.showError(errorMessage || 'Erreur lors de la mise à jour du dossier');
        this.isLoading = false;
      }
    });
  }

  validateEditForm(): string[] {
    const errors: string[] = [];
    
    if (!this.selectedStudent) {
      errors.push('Aucun étudiant sélectionné');
      return errors;
    }
    
    const formValues = this.editForm.value;
    
    if (!formValues.hasUniform && this.isUniformPaid(this.selectedStudent)) {
      errors.push('Impossible de retirer l\'uniforme car il a déjà été payé');
    }
    
    if (this.hasTransportationPaymentsForStudent(this.selectedStudent)) {
      const currentType = this.getTransportationTypeForStudent(this.selectedStudent);
      if (formValues.transportationType !== currentType) {
        errors.push('Impossible de changer le type de transport car des paiements ont déjà été effectués');
      }
    }
    
    return errors;
  }

  onEditFormSubmit(): void {
    const validationErrors = this.validateEditForm();
    
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => this.showWarning(error));
      return;
    }
    
    this.updatePaymentRecord();
  }

  async deletePaymentRecord(student: StudentWithPayment): Promise<void> {
    if (!student._id || !student.hasPaymentRecord) {
      this.showWarning('Aucun dossier de paiement à supprimer');
      return;
    }

    const confirmed = await this.confirmDelete(
      `le dossier de paiement de ${student.name}`,
      `Cette action supprimera définitivement le dossier de paiement de ${student.name}. Cette action est irréversible.`
    );
    
    if (confirmed) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      
      this.paymentService.deletePaymentRecord(student._id, academicYear).subscribe({
        next: (response) => {
          this.showSuccess(`Dossier de paiement supprimé pour ${student.name}`);
          this.loadStudents();
          this.loadDashboard();
        },
        error: (error) => {
          console.error('Error deleting payment record:', error);
          this.showError('Erreur lors de la suppression');
        }
      });
    }
  }

  // ===== PAYMENT DIALOG MANAGEMENT =====

  openPaymentDialog(student: StudentWithPayment, type: 'tuition_monthly' | 'tuition_annual' | 'uniform' | 'transportation_monthly', monthIndex?: number): void {
    if (!student.paymentRecord) {
      this.showWarning('Veuillez d\'abord générer un dossier de paiement');
      return;
    }

    let component: 'tuition' | 'uniform' | 'transportation' = 'tuition';
    
    switch (type) {
      case 'tuition_monthly':
      case 'tuition_annual':
        component = 'tuition';
        break;
      case 'uniform':
        component = 'uniform';
        break;
      case 'transportation_monthly':
        component = 'transportation';
        break;
    }

    const validationError = this.validatePaymentDialog(student, component);
    if (validationError) {
      this.showWarning(validationError);
      return;
    }

    let dialogType: 'monthly' | 'annual' = 'monthly';
    
    switch (type) {
      case 'tuition_monthly':
      case 'uniform':
      case 'transportation_monthly':
        dialogType = 'monthly';
        break;
      case 'tuition_annual':
        dialogType = 'annual';
        break;
    }

    this.currentDialogData = {
      student: student,
      type: dialogType,
      monthIndex: monthIndex,
      academicYear: this.filterForm.get('academicYear')?.value || this.currentAcademicYear,
      component: component
    };

    this.isPaymentDialogOpen = true;
    document.body.style.overflow = 'hidden';
  }

  closePaymentDialog(result?: any): void {
    this.isPaymentDialogOpen = false;
    this.currentDialogData = null;
    document.body.style.overflow = 'auto';

    if (result && result.success) {
      this.handlePaymentResult(result);
    }
  }

  private handlePaymentResult(result: any): void {
    if (result.success) {
      let paymentType = 'paiement';
      
      switch (result.type) {
        case 'tuition_monthly':
          paymentType = 'paiement mensuel des frais scolaires';
          break;
        case 'tuition_annual':
          paymentType = 'paiement annuel des frais scolaires';
          break;
        case 'uniform':
          paymentType = 'paiement de l\'uniforme';
          break;
        case 'transportation_monthly':
          paymentType = 'paiement mensuel du transport';
          break;
      }
      
      this.showSuccess(`${paymentType} enregistré avec succès`);
      this.loadStudents();
      this.loadDashboard();
    }
  }

  // ===== EVENT HANDLERS =====

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchControl.setValue(target.value);
  }

  onAcademicYearChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterForm.patchValue({ academicYear: target.value });
  }

  onPaymentStatusChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterForm.patchValue({ paymentStatus: target.value });
  }

  onGradeCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedGradeCategory = target.value;
    
    this.filterForm.patchValue({ 
      gradeCategory: selectedGradeCategory,
      grade: '',
      classId: ''
    });
  }

  onGradeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedGrade = target.value;
    
    this.filterForm.patchValue({ 
      grade: selectedGrade,
      classId: ''
    });
  }

  onClassIdChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterForm.patchValue({ classId: target.value });
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.changePageSize(target.value);
  }

  // ===== PAGINATION METHODS =====

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadStudents();
    }
  }

  changePageSize(size: string): void {
    this.pageSize = parseInt(size);
    this.currentPage = 1;
    this.totalPages = Math.ceil(this.totalStudents / this.pageSize);
    this.loadStudents();
  }

  // ===== FILTER MANAGEMENT =====

  filterByStatus(status: string): void {
    this.filterForm.patchValue({ paymentStatus: status });
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.filterForm.patchValue({
      paymentStatus: '',
      gradeCategory: '',
      grade: '',
      classId: ''
    });
  }

  hasActiveFilters(): boolean {
    const formValues = this.filterForm.value;
    return !!(
      this.searchControl.value ||
      formValues.paymentStatus ||
      formValues.gradeCategory ||
      formValues.grade ||
      formValues.classId
    );
  }

  // ===== NAVIGATION METHODS =====

  navigateToConfig(): void {
    this.router.navigate(['config'], { relativeTo: this.route });
  }

  // ===== QUICK ACTIONS =====

  getQuickActions(): QuickAction[] {
    if (!this.dashboard) return [];
    
    return [
      {
        id: 'overdue',
        label: `${this.dashboard.statusCounts.overdue} étudiants en retard`,
        count: this.dashboard.statusCounts.overdue,
        icon: '🚨',
        color: '#F44336',
        action: () => this.filterByStatus('overdue')
      },
      {
        id: 'no_record',
        label: `${this.dashboard.statusCounts.no_record} sans dossier`,
        count: this.dashboard.statusCounts.no_record,
        icon: '📝',
        color: '#666666',
        action: () => this.filterByStatus('no_record')
      },
      {
        id: 'partial',
        label: `${this.dashboard.statusCounts.partial} paiements partiels`,
        count: this.dashboard.statusCounts.partial,
        icon: '⏱️',
        color: '#FF9800',
        action: () => this.filterByStatus('partial')
      }
    ].filter(action => action.count > 0);
  }

  // ===== UTILITY METHODS =====

  getStatusEmoji(status: string): string {
    const emojiMap: { [key: string]: string } = {
      'completed': '✅',
      'partial': '⏱️',
      'pending': '⏳',
      'overdue': '❌',
      'no_record': '❓',
      'paid': '✅'
    };
    return emojiMap[status] || '❓';
  }

  getStatusLabel(status: string): string {
    const statusObj = this.paymentStatuses.find(s => s.value === status);
    return statusObj?.label || status;
  }

  getStatusCount(status: string): number {
    if (!this.dashboard) return 0;
    
    switch (status) {
      case 'completed': return this.dashboard.statusCounts.completed || 0;
      case 'partial': return this.dashboard.statusCounts.partial || 0;
      case 'pending': return this.dashboard.statusCounts.pending || 0;
      case 'overdue': return this.dashboard.statusCounts.overdue || 0;
      case 'no_record': return this.dashboard.statusCounts.no_record || 0;
      default: return 0;
    }
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  calculateProgress(student: StudentWithPayment): number {
    if (!student.paymentRecord) return 0;
    
    const totalAmount = student.paymentRecord.totalAmounts?.grandTotal || 0;
    const paidAmount = student.paymentRecord.paidAmounts?.grandTotal || 0;
    
    return this.paymentService.calculatePaymentProgress(paidAmount, totalAmount);
  }

  getClassName(student: StudentWithPayment): string {
    if (typeof student.studentClass === 'object' && student.studentClass?.name) {
      return student.studentClass.name;
    }
    return 'Non assigné';
  }

  getClassGrade(student: StudentWithPayment): string {
    if (student.grade) {
      return this.paymentService.getGradeLabel(student.grade);
    }
    if (typeof student.studentClass === 'object' && student.studentClass?.grade) {
      return student.studentClass.grade;
    }
    return 'Non assigné';
  }

  getGradeCategoryLabel(gradeCategory: GradeCategory | string): string {
    if (!gradeCategory) return '';
    return this.paymentService.getGradeCategoryLabel(gradeCategory as GradeCategory);
  }

  getGradeCategoryColor(gradeCategory: GradeCategory | string): string {
    if (!gradeCategory) return '#666666';
    return this.paymentService.getGradeCategoryColor(gradeCategory);
  }

  getPaymentMethodLabel(method?: string): string {
    return this.paymentService.getPaymentMethodLabel(method || '');
  }

  isPaymentOverdue(dueDate: Date | string): boolean {
    return this.paymentService.isPaymentOverdue(dueDate, this.paymentConfig?.gracePeriod);
  }

  formatDate(date: Date | string): string {
    return this.paymentService.formatDate(date);
  }

  safeFormatDate(date: Date | string | undefined | null): string {
    if (!date) return 'Non définie';
    return this.paymentService.formatDate(date);
  }

  // ===== BUTTON HELPER METHODS =====

  getStudentsWithoutRecord(): number {
    if (!this.dashboard) return 0;
    return this.dashboard.statusCounts.no_record || 0;
  }

  getStudentsWithRecord(): number {
    if (!this.dashboard) return 0;
    const total = this.dashboard.overview.totalStudents || 0;
    const withoutRecord = this.dashboard.statusCounts.no_record || 0;
    return total - withoutRecord;
  }

  // ===== COMPONENT-SPECIFIC HELPERS =====

  getTotalAmounts(student: StudentWithPayment): any {
    if (!student.paymentRecord?.totalAmounts) {
      return {
        tuition: 0,
        uniform: 0,
        transportation: 0,
        grandTotal: 0
      };
    }
    
    return student.paymentRecord.totalAmounts;
  }

  getPaidAmounts(student: StudentWithPayment): any {
    if (!student.paymentRecord?.paidAmounts) {
      return {
        tuition: 0,
        uniform: 0,
        transportation: 0,
        grandTotal: 0
      };
    }
    
    return student.paymentRecord.paidAmounts;
  }

  getRemainingAmounts(student: StudentWithPayment): any {
    if (!student.paymentRecord?.remainingAmounts) {
      const total = this.getTotalAmounts(student);
      const paid = this.getPaidAmounts(student);
      
      return {
        tuition: Math.max(0, total.tuition - paid.tuition),
        uniform: Math.max(0, total.uniform - paid.uniform),
        transportation: Math.max(0, total.transportation - paid.transportation),
        grandTotal: Math.max(0, total.grandTotal - paid.grandTotal)
      };
    }
    
    return student.paymentRecord.remainingAmounts;
  }

  validatePaymentDialog(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation'): string | null {
    if (!student.paymentRecord) {
      return 'Aucun dossier de paiement trouvé pour cet étudiant';
    }

    switch (component) {
      case 'tuition':
        if (student.paymentRecord.annualTuitionPayment?.isPaid) {
          return 'Le paiement annuel des frais scolaires a déjà été effectué';
        }
        break;
        
      case 'uniform':
        if (!student.paymentRecord.uniform?.purchased) {
          return 'Cet étudiant n\'a pas commandé d\'uniforme';
        }
        if (student.paymentRecord.uniform?.isPaid) {
          return 'L\'uniforme a déjà été payé';
        }
        break;
        
      case 'transportation':
        if (!student.paymentRecord.transportation?.using) {
          return 'Cet étudiant n\'utilise pas le service de transport';
        }
        break;
    }
    
    return null;
  }

  hasUniform(student: StudentWithPayment): boolean {
    return student.paymentRecord?.uniform?.purchased || false;
  }

  hasTransportation(student: StudentWithPayment): boolean {
    return student.paymentRecord?.transportation?.using || false;
  }

  getTransportationType(student: StudentWithPayment): string {
    if (!this.hasTransportation(student)) return '';
    const type = student.paymentRecord?.transportation?.type || '';
    return type === 'close' ? 'Zone proche' : type === 'far' ? 'Zone éloignée' : type;
  }

  getComponentStatus(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation'): string {
    if (!student.paymentRecord?.componentStatus) {
      return student.paymentRecord?.overallStatus || 'pending';
    }
    
    if (component === 'uniform') {
      if (!student.paymentRecord.uniform?.purchased) {
        return 'not_applicable';
      }
      return student.paymentRecord.uniform?.isPaid ? 'completed' : 'pending';
    }
    
    return student.paymentRecord.componentStatus[component] || 'pending';
  }

  getComponentStatusLabel(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation'): string {
    const status = this.getComponentStatus(student, component);
    const componentName = component === 'tuition' ? 'Frais scolaires' : 
                         component === 'uniform' ? 'Uniforme' : 'Transport';
    
    switch (status) {
      case 'completed': return `${componentName} - Payé`;
      case 'partial': return `${componentName} - Paiement partiel`;
      case 'pending': return `${componentName} - En attente`;
      case 'overdue': return `${componentName} - En retard`;
      case 'not_applicable': return `${componentName} - Non applicable`;
      default: return `${componentName} - ${status}`;
    }
  }

  canPayComponent(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation'): boolean {
    if (!student.paymentRecord) return false;
    
    switch (component) {
      case 'tuition':
        return !student.paymentRecord.annualTuitionPayment?.isPaid;
        
      case 'uniform':
        return !!(student.paymentRecord.uniform?.purchased && !student.paymentRecord.uniform?.isPaid);
        
      case 'transportation':
        return !!(student.paymentRecord.transportation?.using);
        
      default:
        return false;
    }
  }

  getComponentProgress(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation'): number {
    if (!student.paymentRecord) return 0;
    
    const totalAmounts = this.getTotalAmounts(student);
    const paidAmounts = this.getPaidAmounts(student);
    
    const total = totalAmounts[component] || 0;
    const paid = paidAmounts[component] || 0;
    
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  }

  // ===== PAYMENT HISTORY =====

  getPaymentHistory(student: StudentWithPayment): PaymentHistoryItem[] {
    if (!student.paymentRecord) return [];
    
    return this.paymentService.getPaymentHistory(student.paymentRecord);
  }

  // ===== GENERATE DIALOG HELPERS =====

  getTuitionAmountForGrade(grade: Grade | null): number {
    if (!grade || !this.paymentConfig?.gradeAmounts) return 0;
    return this.paymentConfig.gradeAmounts[grade] || 0;
  }

  getUniformPrice(student?: StudentWithPayment): number {
    if (student?.paymentRecord?.uniform?.price) {
      return student.paymentRecord.uniform.price;
    }
    return this.paymentConfig?.uniform?.price || 0;
  }

  getUniformDescription(): string {
    return this.paymentConfig?.uniform?.description || '';
  }

  isUniformEnabled(): boolean {
    return this.paymentConfig?.uniform?.enabled || false;
  }

  isTransportationEnabled(): boolean {
    return this.paymentConfig?.transportation?.enabled || false;
  }

  isTransportationCloseEnabled(): boolean {
    return this.paymentConfig?.transportation?.tariffs?.close?.enabled || false;
  }

  isTransportationFarEnabled(): boolean {
    return this.paymentConfig?.transportation?.tariffs?.far?.enabled || false;
  }

  getTransportationMonthlyPrice(type: 'close' | 'far'): number {
    if (!this.paymentConfig?.transportation?.tariffs) return 0;
    
    if (type === 'close') {
      return this.paymentConfig.transportation.tariffs.close?.monthlyPrice || 0;
    } else {
      return this.paymentConfig.transportation.tariffs.far?.monthlyPrice || 0;
    }
  }

  getTransportDescription(type: string): string {
    if (!this.paymentConfig?.transportation?.tariffs) return '';
    
    switch (type) {
      case 'close':
        return this.paymentConfig.transportation.tariffs.close?.description || 'Transport pour zone proche';
      case 'far':
        return this.paymentConfig.transportation.tariffs.far?.description || 'Transport pour zone éloignée';
      default:
        return '';
    }
  }

  getTransportationMonths(): number {
    if (!this.paymentConfig?.paymentSchedule) return 10;
    return this.paymentConfig.paymentSchedule.totalMonths;
  }

  getTransportationTotal(): number {
    const formValues = this.generateForm.value;
    const transportationType = formValues.transportationType;
    
    if (!transportationType || !this.paymentConfig?.transportation?.tariffs) return 0;
    
    const monthlyPrice = this.getTransportationMonthlyPrice(transportationType);
    return monthlyPrice * this.getTransportationMonths();
  }

  calculateEstimatedTotal(): number {
    if (!this.selectedStudent?.grade) return 0;
    
    const formValues = this.generateForm.value;
    let total = 0;
    
    total += this.getTuitionAmountForGrade(this.selectedStudent.grade);
    
    if (formValues.hasUniform) {
      total += this.getUniformPrice();
    }
    
    if (formValues.transportationType) {
      total += this.getTransportationTotal();
    }
    
    return total;
  }

  // ===== TRACK BY FUNCTIONS =====

  trackByStudentId(index: number, student: StudentWithPayment): string {
    return student._id;
  }

  trackByPaymentId(index: number, payment: MonthlyPayment): string {
    return `${payment.month}-${payment.dueDate}`;
  }

  trackByHistoryItem(index: number, item: PaymentHistoryItem): string {
    return `${item.date}-${item.amount}-${item.component}`;
  }

  // ===== EDIT FORM HELPERS =====

  hasTransportationPaymentsForStudent(student: StudentWithPayment, type?: 'close' | 'far'): boolean {
    const monthlyPayments = student.paymentRecord?.transportation?.monthlyPayments;
    if (!monthlyPayments) {
      return false;
    }
    
    const paidPayments = monthlyPayments.filter(payment => payment.status === 'paid');
    
    if (!type) {
      return paidPayments.length > 0;
    }
    
    // If specific type is requested, check if current transportation type matches and has payments
    return paidPayments.length > 0 && 
           student.paymentRecord?.transportation?.type === type;
  }

  hasTransportationMonthlyPayments(student: StudentWithPayment): boolean {
    return !!(this.hasTransportation(student) && 
             student.paymentRecord && 
             student.paymentRecord.transportation && 
             student.paymentRecord.transportation.monthlyPayments && 
             student.paymentRecord.transportation.monthlyPayments.length > 0);
  }

  getTransportationPaidPayments(): number {
    if (!this.selectedStudent?.paymentRecord?.transportation?.monthlyPayments) {
      return 0;
    }
    
    return this.selectedStudent.paymentRecord.transportation.monthlyPayments
      .filter(payment => payment.status === 'paid').length;
  }

  getTransportationTotalPayments(): number {
    if (!this.selectedStudent?.paymentRecord?.transportation?.monthlyPayments) {
      return 0;
    }
    
    return this.selectedStudent.paymentRecord.transportation.monthlyPayments.length;
  }

  isChangingTransportationType(): boolean {
    if (!this.selectedStudent?.paymentRecord?.transportation) {
      return false;
    }
    
    const currentType = this.getTransportationTypeForStudent(this.selectedStudent);
    const selectedType = this.editForm.get('transportationType')?.value;
    
    return currentType !== selectedType;
  }

  hasChanges(): boolean {
    if (!this.selectedStudent?.paymentRecord) {
      return false;
    }
    
    const formValues = this.editForm.value;
    const currentUniform = this.selectedStudent.paymentRecord.uniform?.purchased || false;
    const currentTransport = this.selectedStudent.paymentRecord.transportation?.type || '';
    
    return formValues.hasUniform !== currentUniform || 
           formValues.transportationType !== currentTransport;
  }

  getCurrentTotal(): number {
    if (!this.selectedStudent?.paymentRecord) {
      return 0;
    }
    
    return this.getTotalAmounts(this.selectedStudent)?.grandTotal || 0;
  }

  getNewTotal(): number {
    if (!this.selectedStudent?.grade) {
      return 0;
    }
    
    const formValues = this.editForm.value;
    let total = 0;
    
    total += this.getTuitionAmountForGrade(this.selectedStudent.grade);
    
    if (formValues.hasUniform && this.isUniformEnabled()) {
      total += this.getUniformPrice();
    }
    
    if (formValues.transportationType) {
      const monthlyPrice = this.getTransportationMonthlyPrice(formValues.transportationType);
      total += monthlyPrice * this.getTransportationMonths();
    }
    
    return total;
  }

  getTotalDifference(): number {
    return this.getNewTotal() - this.getCurrentTotal();
  }

  // ===== SAFE GETTERS FOR EDIT FORM =====

  isUniformPaid(student: StudentWithPayment): boolean {
    return !!(student.paymentRecord?.uniform?.isPaid);
  }

  isUniformPurchased(student: StudentWithPayment): boolean {
    return !!(student.paymentRecord?.uniform?.purchased);
  }

  getUniformPaymentDate(student: StudentWithPayment): Date | string | null {
    return student.paymentRecord?.uniform?.paymentDate || null;
  }

  isUsingTransportation(student: StudentWithPayment): boolean {
    return !!(student.paymentRecord?.transportation?.using);
  }

  getTransportationTypeForStudent(student: StudentWithPayment): string {
    return student.paymentRecord?.transportation?.type || '';
  }
}