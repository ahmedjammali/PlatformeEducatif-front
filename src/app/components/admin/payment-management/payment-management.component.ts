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
  UpdatePaymentRecordRequest,
  StudentDiscount,
  ApplyDiscountRequest,
  ApplyDiscountResponse,
  PaymentDialogData  // ✅ Add this here
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

  isDiscountDialogOpen = false;
  discountForm!: FormGroup;

  
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

  // Add this property to your class
// In payment-management.component.ts, update this property:
componentOnlyForInvoice?: 'uniform' | 'inscriptionFee' | 'tuition'; // ✅ ADD 'tuition'
  
  // ===== PAGINATION =====
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  
  // ===== MODAL STATES =====
  isPaymentDialogOpen = false;
  isGenerateDialogOpen = false;
  isEditDialogOpen = false;
  currentDialogData: PaymentDialogData | null = null;

   showCurrentMonthOnlyInInvoice = false;
  currentMonthIndexForInvoice?: number;
  currentPaymentDateForInvoice?: Date;
  monthNameForInvoice?: string;


  isInvoiceDialogOpen = false;

  selectedStudentForInvoice: StudentWithPayment | null = null;
  
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
    hasInscriptionFee: [false], // ✅ FIXED: Add this field
    hasUniform: [false],
    transportationType: ['']
  });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
    this.loadDashboard();
    this.checkQueryParams();
        this.discountForm = this.fb.group({
        discountType: ['monthly', Validators.required],
        percentage: [0, [Validators.required, Validators.min(1), Validators.max(100)]],
        notes: ['']
        });
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

// ✅ ADD THIS NEW METHOD:
getCurrentInscriptionFeeStatus(student: StudentWithPayment): boolean {
  return student.paymentRecord?.inscriptionFee?.applicable || false;
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
    
    // In the loadStudents method, modify the filters object:
const filters: PaymentFilters = {
  search: this.searchControl.value?.trim() || undefined,
  paymentStatus: this.filterForm.get('paymentStatus')?.value || undefined,
  gradeCategory: this.filterForm.get('gradeCategory')?.value || undefined,
  grade: this.filterForm.get('grade')?.value || undefined,
  classId: this.filterForm.get('classId')?.value || undefined,
  academicYear: this.filterForm.get('academicYear')?.value,
  page: this.currentPage,
  // Increase page size when filtering to show more results
  limit: this.hasActiveFilters() ? 500 : this.pageSize
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

   openInvoiceDialog(student: StudentWithPayment, showCurrentMonthOnly = false, monthIndex?: number): void {
    if (!student.hasPaymentRecord) {
      this.showWarning('Aucun dossier de paiement trouvé pour cet étudiant');
      return;
    }

    this.selectedStudentForInvoice = student;
    
    // ✅ NEW: Set monthly context parameters
    this.showCurrentMonthOnlyInInvoice = showCurrentMonthOnly;
    this.currentMonthIndexForInvoice = monthIndex;
    
    // Set month name and payment date if showing specific month
    if (showCurrentMonthOnly && monthIndex !== undefined && student.paymentRecord?.tuitionMonthlyPayments) {
      const monthPayment = student.paymentRecord.tuitionMonthlyPayments[monthIndex];
      if (monthPayment) {
        this.monthNameForInvoice = monthPayment.monthName;
        this.currentPaymentDateForInvoice = new Date(monthPayment.dueDate);
      }
    } else {
      this.monthNameForInvoice = undefined;
      this.currentPaymentDateForInvoice = undefined;
    }

    this.isInvoiceDialogOpen = true;
    document.body.style.overflow = 'hidden';
  }
closeInvoiceDialog(): void {
  this.isInvoiceDialogOpen = false;
  this.selectedStudentForInvoice = null;
  
  // Reset monthly context parameters
  this.showCurrentMonthOnlyInInvoice = false;
  this.currentMonthIndexForInvoice = undefined;
  this.currentPaymentDateForInvoice = undefined;
  this.monthNameForInvoice = undefined;
  this.componentOnlyForInvoice = undefined; // ADD THIS LINE
  
  document.body.style.overflow = 'auto';
}

   getCurrentMonthName(): string {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return monthNames[new Date().getMonth()];
  }

  // 5. Add helper method to determine if we should show monthly invoice
  shouldShowMonthlyInvoice(student: StudentWithPayment): boolean {
    // You can add logic here to determine when to show monthly vs cumulative
    // For example, show monthly if we're in the middle of the academic year
    return student.paymentRecord?.paymentType === 'monthly';
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
    `Voulez-vous générer des dossiers de paiement pour ${studentsWithoutRecord} étudiant(s) ?\n\nOptions par défaut:\n- Frais d'inscription: Non inclus\n- Uniforme: Non inclus\n- Transport: Non inclus\n\nVous pourrez personnaliser chaque dossier individuellement après la création.`,
    'info'
  );

  if (confirmed) {
    const academicYear = this.filterForm.get('academicYear')?.value;
    this.isLoading = true;
    
    const options: BulkGeneratePaymentRequest = {
    academicYear,
    defaultInscriptionFee: true, // ✅ Change to true by default
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
    transportationType: formValues.transportationType || null,
        includeInscriptionFee: true // ✅ Always set to true if config enabled
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

getInscriptionFeeAmount(student: StudentWithPayment): number {
  if (!student.paymentRecord?.inscriptionFee?.price) {
    return 0;
  }
  return student.paymentRecord.inscriptionFee.price;
}
editPaymentRecord(student: StudentWithPayment): void {
  this.selectedStudent = student;
  console.log('Editing payment record for student:', student);
  
  const currentInscriptionFee = this.getCurrentInscriptionFeeStatus(student); // ✅ ADD THIS
  const currentUniform = this.isUniformPurchased(student);
  const currentTransportationType = this.getTransportationTypeForStudent(student);
  
  this.editForm.patchValue({
    hasInscriptionFee: currentInscriptionFee, // ✅ ADD THIS
    hasUniform: currentUniform,
    transportationType: currentTransportationType
  });
  
  // Handle disabled states
  if (this.isInscriptionFeePaid(student)) {
    this.editForm.get('hasInscriptionFee')?.disable();
  } else {
    this.editForm.get('hasInscriptionFee')?.enable();
  }
  
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

  // ✅ CORRECTION: Utiliser getRawValue() pour inclure les champs disabled
  const formValues = this.editForm.getRawValue();
  console.log('Update Payment Record - Form Raw Values:', formValues);
  
  const academicYear = this.filterForm.get('academicYear')?.value;
  
  const updateRequest: UpdatePaymentRecordRequest = {
    academicYear,
    hasInscriptionFee: formValues.hasInscriptionFee || false,
    hasUniform: formValues.hasUniform || false,
    transportationType: formValues.transportationType || null
  };

  console.log('Update request:', updateRequest);

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
  
  console.log('=== DEBUT VALIDATION EDIT FORM ===');
  
  if (!this.selectedStudent) {
    console.log('ERROR: Aucun étudiant sélectionné');
    errors.push('Aucun étudiant sélectionné');
    return errors;
  }
  
  console.log('Selected Student:', this.selectedStudent.name);
  
  // ✅ CORRECTION: Utiliser getRawValue() pour inclure les champs disabled
  const formValues = this.editForm.getRawValue();
  console.log('Form Raw Values (includes disabled):', formValues);
  
  // DEBUG: Inscription Fee
  const currentHasInscriptionFee = this.hasInscriptionFee(this.selectedStudent);
  const newHasInscriptionFee = formValues.hasInscriptionFee;
  const isInscriptionFeePaid = this.isInscriptionFeePaid(this.selectedStudent);
  
  console.log('=== INSCRIPTION FEE DEBUG ===');
  console.log('currentHasInscriptionFee:', currentHasInscriptionFee);
  console.log('newHasInscriptionFee:', newHasInscriptionFee);
  console.log('isInscriptionFeePaid:', isInscriptionFeePaid);
  
  // Erreur seulement si: avait inscription fee ET maintenant on l'enlève ET elle est déjà payée
  if (currentHasInscriptionFee && !newHasInscriptionFee && isInscriptionFeePaid) {
    console.log('ERROR: Tentative de retirer inscription fee payée');
    errors.push('Impossible de retirer les frais d\'inscription car ils ont déjà été payés');
  } else {
    console.log('INSCRIPTION FEE: Validation passée - pas de tentative de retrait');
  }
  
  // DEBUG: Uniform
  const currentHasUniform = this.hasUniform(this.selectedStudent);
  const newHasUniform = formValues.hasUniform;
  const isUniformPaid = this.isUniformPaid(this.selectedStudent);
  
  console.log('=== UNIFORM DEBUG ===');
  console.log('currentHasUniform:', currentHasUniform);
  console.log('newHasUniform:', newHasUniform);
  console.log('isUniformPaid:', isUniformPaid);
  
  // Erreur seulement si: avait uniforme ET maintenant on l'enlève ET il est déjà payé
  if (currentHasUniform && !newHasUniform && isUniformPaid) {
    console.log('ERROR: Tentative de retirer uniforme payé');
    errors.push('Impossible de retirer l\'uniforme car il a déjà été payé');
  } else {
    console.log('UNIFORM: Validation passée');
  }
  
  // DEBUG: Transportation
  const hasTransportPayments = this.hasTransportationPaymentsForStudent(this.selectedStudent);
  const currentTransportType = this.getTransportationTypeForStudent(this.selectedStudent);
  const newTransportType = formValues.transportationType;
  
  console.log('=== TRANSPORTATION DEBUG ===');
  console.log('hasTransportPayments:', hasTransportPayments);
  console.log('currentTransportType:', currentTransportType);
  console.log('newTransportType:', newTransportType);
  
  if (hasTransportPayments) {
    if (currentTransportType && newTransportType && currentTransportType !== newTransportType) {
      console.log('ERROR: Tentative de changer type transport avec paiements existants');
      errors.push('Impossible de changer le type de transport car des paiements ont déjà été effectués');
    }
    
    if (currentTransportType && !newTransportType) {
      console.log('ERROR: Tentative de retirer transport avec paiements existants');
      errors.push('Impossible de retirer le transport car des paiements ont déjà été effectués');
    }
  }
  
  console.log('Validation Errors:', errors);
  console.log('=== FIN VALIDATION EDIT FORM ===');
  
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
openPaymentDialog(student: StudentWithPayment, type: 'tuition_monthly' | 'tuition_annual' | 'uniform' | 'transportation_monthly' | 'inscription_fee', monthIndex?: number): void {
  if (!student.paymentRecord) {
    this.showWarning('Veuillez d\'abord générer un dossier de paiement');
    return;
  }

  let component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee' = 'tuition';
  
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
    case 'inscription_fee':
      component = 'inscriptionFee';
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
    case 'inscription_fee':
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
      // ✅ NEW: Handle inscription fee payment result
      case 'inscription_fee':
        paymentType = 'paiement des frais d\'inscription';
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

getTotalAmounts(student: StudentWithPayment): any {
  if (!student.paymentRecord?.totalAmounts) {
    return {
      tuition: 0,
      inscriptionFee: 0,
      uniform: 0,
      transportation: 0,
      grandTotal: 0
    };
  }
  
  // If student has a discount, recalculate the correct totals
  if (this.hasDiscount(student)) {
    const originalAmounts = this.getOriginalAmounts(student);
    const discountAmount = this.getDiscountAmount(student);
    
    // Apply discount only to tuition
    const discountedTuition = originalAmounts.tuition - discountAmount;
    
    // Include inscription fee in grand total calculation
    const grandTotal = discountedTuition + originalAmounts.inscriptionFee + originalAmounts.uniform + originalAmounts.transportation;
    
    return {
      tuition: discountedTuition,
      inscriptionFee: originalAmounts.inscriptionFee,
      uniform: originalAmounts.uniform,
      transportation: originalAmounts.transportation,
      grandTotal: grandTotal
    };
  }
  
  // If no discount, return stored amounts
  return student.paymentRecord.totalAmounts;
}
getPaidAmounts(student: StudentWithPayment): any {
  if (!student.paymentRecord?.paidAmounts) {
    return {
      tuition: 0,
      inscriptionFee: 0, // ✅ NEW
      uniform: 0,
      transportation: 0,
      grandTotal: 0
    };
  }
  
  return student.paymentRecord.paidAmounts;
}


openMonthlyTuitionInvoice(student: StudentWithPayment, monthIndex: number): void {
  if (!student.hasPaymentRecord) {
    this.showWarning('Aucun dossier de paiement trouvé pour cet étudiant');
    return;
  }

  const monthPayment = student.paymentRecord?.tuitionMonthlyPayments?.[monthIndex];
  if (!monthPayment || monthPayment.status !== 'paid') {
    this.showWarning('Ce mois n\'a pas encore été payé');
    return;
  }

  this.selectedStudentForInvoice = student;
  
  // Set monthly context for TUITION ONLY
  this.showCurrentMonthOnlyInInvoice = true;
  this.currentMonthIndexForInvoice = monthIndex;
  this.monthNameForInvoice = monthPayment.monthName;
  this.currentPaymentDateForInvoice = new Date(monthPayment.paymentDate || monthPayment.dueDate);
  
  // ✅ KEY CHANGE: Set component to tuition only
  this.componentOnlyForInvoice = 'tuition'; // Add this line

  this.isInvoiceDialogOpen = true;
  document.body.style.overflow = 'hidden';
}
getRemainingAmounts(student: StudentWithPayment): any {
  // If no payment record, return zeros
  if (!student.paymentRecord) {
    return {
      tuition: 0,
      inscriptionFee: 0,
      uniform: 0,
      transportation: 0,
      grandTotal: 0
    };
  }
  
  // If the student has a discount, we need to recalculate from original amounts
  if (this.hasDiscount(student)) {
    const originalAmounts = this.getOriginalAmounts(student);
    const paidAmounts = this.getPaidAmounts(student);
    const discountAmount = this.getDiscountAmount(student);
    
    // Apply discount only to tuition
    const discountedTuition = originalAmounts.tuition - discountAmount;
    
    // Calculate remaining amounts for each component
    const remainingTuition = Math.max(0, discountedTuition - paidAmounts.tuition);
    const remainingInscriptionFee = Math.max(0, originalAmounts.inscriptionFee - paidAmounts.inscriptionFee);
    const remainingUniform = Math.max(0, originalAmounts.uniform - paidAmounts.uniform);
    const remainingTransportation = Math.max(0, originalAmounts.transportation - paidAmounts.transportation);
    
    // ✅ FIXED: Calculate grand total correctly including inscription fee
    const remainingGrandTotal = remainingTuition + remainingInscriptionFee + remainingUniform + remainingTransportation;
    
    return {
      tuition: remainingTuition,
      inscriptionFee: remainingInscriptionFee,
      uniform: remainingUniform,
      transportation: remainingTransportation,
      grandTotal: remainingGrandTotal
    };
  }
  
  // If no discount, use the stored remaining amounts
  if (student.paymentRecord.remainingAmounts) {
    return student.paymentRecord.remainingAmounts;
  }
  
  // Fallback: calculate from total and paid amounts
  const total = this.getTotalAmounts(student);
  const paid = this.getPaidAmounts(student);
  
  return {
    tuition: Math.max(0, total.tuition - paid.tuition),
    inscriptionFee: Math.max(0, total.inscriptionFee - paid.inscriptionFee),
    uniform: Math.max(0, total.uniform - paid.uniform),
    transportation: Math.max(0, total.transportation - paid.transportation),
    grandTotal: Math.max(0, total.grandTotal - paid.grandTotal)
  };
}
validatePaymentDialog(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): string | null {
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

    // ✅ NEW: Inscription fee validation
    case 'inscriptionFee':
      if (!student.paymentRecord.inscriptionFee?.applicable) {
        return 'Les frais d\'inscription ne sont pas applicables pour cet étudiant';
      }
      if (student.paymentRecord.inscriptionFee?.isPaid) {
        return 'Les frais d\'inscription ont déjà été payés';
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

getComponentStatus(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): string {
  if (!student.paymentRecord?.componentStatus) {
    return student.paymentRecord?.overallStatus || 'pending';
  }
  
  if (component === 'uniform') {
    if (!student.paymentRecord.uniform?.purchased) {
      return 'not_applicable';
    }
    return student.paymentRecord.uniform?.isPaid ? 'completed' : 'pending';
  }
  
  // ✅ NEW: Handle inscription fee status
  if (component === 'inscriptionFee') {
    if (!student.paymentRecord.inscriptionFee?.applicable) {
      return 'not_applicable';
    }
    return student.paymentRecord.inscriptionFee?.isPaid ? 'completed' : 'pending';
  }
  
  return student.paymentRecord.componentStatus[component] || 'pending';
}
getOriginalAmounts(student: StudentWithPayment): any {
  if (!student.paymentRecord) {
    return { tuition: 0, inscriptionFee: 0, uniform: 0, transportation: 0, grandTotal: 0 };
  }

  // Calculate original tuition from grade configuration
  const originalTuition = this.getTuitionAmountForGrade(student.grade);
  
  // ✅ ADD: Get original inscription fee
  let originalInscriptionFee = 0;
  if (student.paymentRecord.inscriptionFee?.applicable) {
    originalInscriptionFee = this.getInscriptionFeeForStudent(student);
  }
  
  // Get uniform price from config or stored value
  let originalUniform = 0;
  if (student.paymentRecord.uniform?.purchased) {
    originalUniform = this.getUniformPrice(student);
  }

  // Calculate transportation from config
  let originalTransportation = 0;
  if (student.paymentRecord.transportation?.using) {
    const type = student.paymentRecord.transportation.type;
    const monthlyPrice = this.getTransportationMonthlyPrice(type as 'close' | 'far');
    const months = this.getTransportationMonths();
    originalTransportation = monthlyPrice * months;
  }

  // ✅ FIX: Include inscription fee in grand total
  const originalGrandTotal = originalTuition + originalInscriptionFee + originalUniform + originalTransportation;

  return {
    tuition: originalTuition,
    inscriptionFee: originalInscriptionFee, // ✅ ADD this
    uniform: originalUniform,
    transportation: originalTransportation,
    grandTotal: originalGrandTotal
  };
}
getComponentStatusLabel(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): string {
  const status = this.getComponentStatus(student, component);
  const componentName = component === 'tuition' ? 'Frais scolaires' : 
                       component === 'uniform' ? 'Uniforme' : 
                       component === 'transportation' ? 'Transport' :
                       component === 'inscriptionFee' ? 'Frais d\'inscription' : // ✅ NEW
                       component;
  
  switch (status) {
    case 'completed': return `${componentName} - Payé`;
    case 'partial': return `${componentName} - Paiement partiel`;
    case 'pending': return `${componentName} - En attente`;
    case 'overdue': return `${componentName} - En retard`;
    case 'not_applicable': return `${componentName} - Non applicable`;
    default: return `${componentName} - ${status}`;
  }
}

canPayComponent(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): boolean {
  if (!student.paymentRecord) return false;
  
  switch (component) {
    case 'tuition':
      return !student.paymentRecord.annualTuitionPayment?.isPaid;
      
    case 'uniform':
      return !!(student.paymentRecord.uniform?.purchased && !student.paymentRecord.uniform?.isPaid);
      
    case 'transportation':
      return !!(student.paymentRecord.transportation?.using);

    // ✅ NEW: Handle inscription fee component
    case 'inscriptionFee':
      return !!(student.paymentRecord.inscriptionFee?.applicable && !student.paymentRecord.inscriptionFee?.isPaid);
      
    default:
      return false;
  }
}


getComponentProgress(student: StudentWithPayment, component: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'): number {
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
  
  // Tuition
  total += this.getTuitionAmountForGrade(this.selectedStudent.grade);
  
  // ✅ CHANGE: Always add inscription fee if enabled (automatic)
  if (this.isInscriptionFeeEnabled()) {
    total += this.getInscriptionFeeForStudent(this.selectedStudent);
  }
  
  // Uniform
  if (formValues.hasUniform) {
    total += this.getUniformPrice();
  }
  
  // Transportation
  if (formValues.transportationType) {
    total += this.getTransportationTotal();
  }
  
  return total;
}
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
  
  // ✅ CORRECTION: Utiliser getRawValue() pour inclure les champs disabled
  const formValues = this.editForm.getRawValue();
  
  console.log('=== CHECKING CHANGES ===');
  console.log('Form Raw Values:', formValues);
  
  // Utiliser les méthodes existantes pour obtenir l'état actuel
  const currentInscriptionFee = this.hasInscriptionFee(this.selectedStudent);
  const currentUniform = this.hasUniform(this.selectedStudent);
  const currentTransport = this.getTransportationTypeForStudent(this.selectedStudent);
  
  console.log('Current values:', {
    currentInscriptionFee,
    currentUniform,
    currentTransport
  });
  
  // Comparer avec les nouvelles valeurs
  const inscriptionFeeChanged = formValues.hasInscriptionFee !== currentInscriptionFee;
  const uniformChanged = formValues.hasUniform !== currentUniform;
  const transportChanged = formValues.transportationType !== currentTransport;
  
  console.log('Changes detected:', {
    inscriptionFeeChanged,
    uniformChanged,
    transportChanged
  });
  
  const hasChanges = inscriptionFeeChanged || uniformChanged || transportChanged;
  console.log('Has changes overall:', hasChanges);
  
  return hasChanges;
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
  
  // Tuition
  total += this.getTuitionAmountForGrade(this.selectedStudent.grade);
  
  // ✅ FIXED: Inscription fee in edit form
  if (formValues.hasInscriptionFee && this.isInscriptionFeeEnabled()) {
    total += this.getInscriptionFeeForStudent(this.selectedStudent);
  }
  
  // Uniform
  if (formValues.hasUniform && this.isUniformEnabled()) {
    total += this.getUniformPrice();
  }
  
  // Transportation
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

openDiscountDialog(student: StudentWithPayment): void {
  if (!student.hasPaymentRecord) {
    this.showWarning('Aucun dossier de paiement trouvé pour cet étudiant');
    return;
  }

  // CHANGE: Block if student already has a discount
  if (this.hasDiscount(student)) {
    this.showWarning('Cet étudiant a déjà une remise. Vous devez d\'abord la supprimer pour en créer une nouvelle.');
    return;
  }

  this.selectedStudent = student;
  
  // Always reset form for new discount creation
  this.discountForm.reset({
    discountType: 'monthly',
    percentage: 0,
    notes: ''
  });
  
  this.isDiscountDialogOpen = true;
  document.body.style.overflow = 'hidden';
}


closeDiscountDialog(): void {
  this.isDiscountDialogOpen = false;
  this.selectedStudent = null;
  document.body.style.overflow = 'auto';
}
async applyDiscount(): Promise<void> {
  if (!this.selectedStudent?._id || !this.discountForm.valid) {
    this.showError('Veuillez remplir tous les champs requis');
    return;
  }

  if (this.hasDiscount(this.selectedStudent)) {
    this.showError('Cet étudiant a déjà une remise. Supprimez-la d\'abord pour en créer une nouvelle.');
    return;
  }

  const formValues = this.discountForm.value;
  const academicYear = this.filterForm.get('academicYear')?.value;

  // ===== BEFORE DISCOUNT =====
  console.log('\n🔍 BEFORE DISCOUNT:');
  console.log('Student:', this.selectedStudent.name);
  console.log('Total Amount (stored):', this.selectedStudent.paymentRecord?.totalAmounts?.grandTotal);
  console.log('Has discount:', this.hasDiscount(this.selectedStudent));
  console.log('getTotalAmounts():', this.getTotalAmounts(this.selectedStudent).grandTotal);

  const discountRequest: ApplyDiscountRequest = {
    discountType: formValues.discountType,
    percentage: formValues.percentage,
    notes: formValues.notes || undefined
  };

  this.isLoading = true;
  
  this.paymentService.applyStudentDiscount(this.selectedStudent._id, discountRequest, academicYear).subscribe({
    next: (response) => {
      // Update the student with response data
      if (this.selectedStudent && this.selectedStudent.paymentRecord) {
        this.selectedStudent.paymentRecord.discount = {
          enabled: true,
          type: response.discount.type as 'monthly' | 'annual',
          percentage: response.discount.percentage,
          appliedDate: new Date(),
          notes: discountRequest.notes
        };
        
        if (response.paymentRecord) {
          this.selectedStudent.paymentRecord = response.paymentRecord;
        }
      }
      
      // ===== AFTER DISCOUNT =====
      console.log('\n✅ AFTER DISCOUNT:');
      if (this.selectedStudent) {
        console.log('Student:', this.selectedStudent.name);
        console.log('Discount %:', response.discount.percentage);
        console.log('Has discount:', this.hasDiscount(this.selectedStudent));
        console.log('Total Amount (stored):', this.selectedStudent.paymentRecord?.totalAmounts?.grandTotal);
        console.log('getTotalAmounts():', this.getTotalAmounts(this.selectedStudent).grandTotal);
        console.log('getOriginalAmounts():', this.getOriginalAmounts(this.selectedStudent).grandTotal);
        console.log('getDiscountAmount():', this.getDiscountAmount(this.selectedStudent));
        console.log('getDiscountedAmount():', this.getDiscountedAmount(this.selectedStudent));
        
        // Show the calculation breakdown
        const original = this.getOriginalAmounts(this.selectedStudent);
        const discount = this.getDiscountAmount(this.selectedStudent);
        console.log('\n📊 CALCULATION BREAKDOWN:');
        console.log('Original tuition:', original.tuition);
        console.log('Original inscription fee:', original.inscriptionFee);
        console.log('Discount amount:', discount);
        console.log('Final tuition:', original.tuition - discount);
        console.log('Final total:', (original.tuition - discount) + original.inscriptionFee + original.uniform + original.transportation);
      }
      
      this.showSuccess(`Remise de ${response.discount.percentage}% appliquée avec succès`);
      this.loadStudents();
      this.loadDashboard();
      this.closeDiscountDialog();
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error applying discount:', error);
      const errorMessage = this.paymentService.handlePaymentError(error) || 'Erreur lors de l\'application de la remise';
      this.showError(errorMessage);
      this.isLoading = false;
    }
  });
}
async removeDiscount(student: StudentWithPayment): Promise<void> {
  if (!student._id || !this.hasDiscount(student)) {
    this.showWarning('Aucune remise à supprimer');
    return;
  }

  const discountPercentage = this.getDiscountPercentage(student);
  const confirmed = await this.confirmAction(
    'Supprimer la remise',
    `Voulez-vous supprimer la remise de ${discountPercentage}% pour ${student.name} ?\n\nCette action est irréversible.`,
    'warning'
  );

  if (!confirmed) return;

  const academicYear = this.filterForm.get('academicYear')?.value;
  this.isLoading = true;

  this.paymentService.removeStudentDiscount(student._id, academicYear).subscribe({
    next: (response) => {
      this.showSuccess(`Remise supprimée pour ${student.name}`);
      
      // Update the student in the local array immediately
      const studentIndex = this.students.findIndex(s => s._id === student._id);
      if (studentIndex !== -1 && this.students[studentIndex].paymentRecord?.discount) {
        this.students[studentIndex].paymentRecord!.discount = {
          enabled: false,
          type: undefined,
          percentage: undefined,
          appliedBy: undefined,
          appliedDate: undefined,
          notes: undefined
        };
      }
      
      this.loadStudents();
      this.loadDashboard();
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error removing discount:', error);
      const errorMessage = this.paymentService.handlePaymentError(error) || 'Erreur lors de la suppression de la remise';
      this.showError(errorMessage);
      this.isLoading = false;
    }
  });
}

hasDiscount(student: StudentWithPayment): boolean {
  return !!(
    student.paymentRecord?.discount?.enabled && 
    student.paymentRecord?.discount?.percentage && 
    student.paymentRecord.discount.percentage > 0
  );
}

getDiscountDisplayText(student: StudentWithPayment): string {
  if (!this.hasDiscount(student)) return 'Aucune remise';
  
  const discount = student.paymentRecord?.discount;
  if (!discount) return 'Aucune remise';
  
  const typeLabel = discount.type === 'annual' ? 'Annuelle' : 'Mensuelle';
  return `${typeLabel} - ${discount.percentage}%`;
}


getDiscountPercentage(student: StudentWithPayment): number {
  if (!this.hasDiscount(student)) return 0;
  return student.paymentRecord?.discount?.percentage || 0;
}

getDiscountType(student: StudentWithPayment): 'monthly' | 'annual' | null {
  if (!this.hasDiscount(student)) return null;
  return student.paymentRecord?.discount?.type || null;
}
getDiscountAmount(student: StudentWithPayment): number {
  if (!this.hasDiscount(student)) return 0;
  
  // Use original tuition amount, not the stored (already discounted) amount
  const originalTuition = this.getOriginalAmounts(student).tuition;
  const percentage = this.getDiscountPercentage(student);
  
  return Math.round(originalTuition * percentage / 100);
}
getDiscountedAmount(student: StudentWithPayment): number {
  if (!this.hasDiscount(student)) {
    // If no discount, return the regular grand total
    return this.getTotalAmounts(student).grandTotal;
  }
  
  const originalAmounts = this.getOriginalAmounts(student);
  const discountAmount = this.getDiscountAmount(student);
  
  // ✅ FIXED: Apply discount only to tuition, but include all components in final total
  const discountedTuition = originalAmounts.tuition - discountAmount;
  const finalTotal = discountedTuition + originalAmounts.inscriptionFee + originalAmounts.uniform + originalAmounts.transportation;
  
  return finalTotal;
} 
// ===== FORM VALIDATION =====
isDiscountFormValid(): boolean {
  return this.discountForm.valid;
}
needsAmountRecalculation(student: StudentWithPayment): boolean {
  if (!this.hasDiscount(student)) return false;
  
  const originalAmounts = this.getOriginalAmounts(student);
  const storedAmounts = this.getTotalAmounts(student);
  const discountAmount = this.getDiscountAmount(student);
  
  // Check if stored amounts match what they should be after discount
  const expectedTuitionAfterDiscount = originalAmounts.tuition - discountAmount;
  const expectedGrandTotal = originalAmounts.grandTotal - discountAmount;
  
  return Math.abs(storedAmounts.tuition - expectedTuitionAfterDiscount) > 1 ||
         Math.abs(storedAmounts.grandTotal - expectedGrandTotal) > 1;
}
getDiscountFormErrors(): string[] {
  const errors: string[] = [];
  
  if (this.discountForm.get('percentage')?.hasError('required')) {
    errors.push('Le pourcentage est requis');
  }
  
  if (this.discountForm.get('percentage')?.hasError('min')) {
    errors.push('Le pourcentage doit être supérieur à 0');
  }
  
  if (this.discountForm.get('percentage')?.hasError('max')) {
    errors.push('Le pourcentage ne peut pas dépasser 100');
  }
  
  return errors;
}

getDiscountPreview(): { original: number; discount: number; final: number } {
  if (!this.selectedStudent) {
    return { original: 0, discount: 0, final: 0 };
  }

  const percentage = this.discountForm.get('percentage')?.value || 0;
  const originalTuition = this.getOriginalAmounts(this.selectedStudent).tuition;
  const originalTotal = this.getOriginalAmounts(this.selectedStudent).grandTotal;
  
  const discountAmount = Math.round(originalTuition * percentage / 100);
  const finalAmount = originalTotal - discountAmount;

  return {
    original: originalTotal,
    discount: discountAmount,
    final: finalAmount
  };
}

// Additional helper methods to add to payment-management.component.ts

// Add these methods to your PaymentManagementComponent class:

/**
 * Get the current month index for a student's payment schedule
 */
getCurrentMonthIndex(student: StudentWithPayment): number {
  if (!student.paymentRecord?.tuitionMonthlyPayments) {
    return 0;
  }

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Find the payment for the current month
  const currentMonthPayment = student.paymentRecord.tuitionMonthlyPayments.findIndex(payment => {
    const paymentDate = new Date(payment.dueDate);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  });

  // Return the found index or default to 0
  return currentMonthPayment >= 0 ? currentMonthPayment : 0;
}

/**
 * Get month name from month index
 */
getMonthNameFromIndex(monthIndex: number): string {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return monthNames[monthIndex] || 'Mois inconnu';
}

/**
 * Get the payment for a specific month
 */
getPaymentForMonth(student: StudentWithPayment, monthIndex: number): MonthlyPayment | null {
  if (!student.paymentRecord?.tuitionMonthlyPayments || monthIndex < 0) {
    return null;
  }
  
  return student.paymentRecord.tuitionMonthlyPayments[monthIndex] || null;
}

/**
 * Check if a month has any payments
 */
hasPaymentsForMonth(student: StudentWithPayment, monthIndex: number): boolean {
  const payment = this.getPaymentForMonth(student, monthIndex);
  return !!(payment && payment.paidAmount > 0);
}

/**
 * Get transportation payment for specific month
 */
getTransportationPaymentForMonth(student: StudentWithPayment, monthIndex: number): MonthlyPayment | null {
  if (!student.paymentRecord?.transportation?.monthlyPayments || monthIndex < 0) {
    return null;
  }
  
  return student.paymentRecord.transportation.monthlyPayments[monthIndex] || null;
}


/**
 * Quick access method for current month invoice
 */
openCurrentMonthInvoice(student: StudentWithPayment): void {
  const currentMonthIndex = this.getCurrentMonthIndex(student);
  this.openInvoiceDialog(student, true, currentMonthIndex);
}

/**
 * Quick access method for cumulative invoice
 */
openCumulativeInvoice(student: StudentWithPayment): void {
  this.openInvoiceDialog(student, false);
}

hasInscriptionFee(student: StudentWithPayment): boolean {
  return student.paymentRecord?.inscriptionFee?.applicable || false;
}

isInscriptionFeePaid(student: StudentWithPayment): boolean {
  return !!(student.paymentRecord?.inscriptionFee?.isPaid);
}

canPayInscriptionFee(student: StudentWithPayment): boolean {
  return !!(student.paymentRecord?.inscriptionFee?.applicable && !student.paymentRecord?.inscriptionFee?.isPaid);
}

getInscriptionFeePaymentDate(student: StudentWithPayment): Date | string | null {
  return student.paymentRecord?.inscriptionFee?.paymentDate || null;
}

// ✅ NEW: Configuration checking methods
isInscriptionFeeEnabled(): boolean {
  return this.paymentConfig?.inscriptionFee?.enabled || false;
}

getInscriptionFeeDescription(): string {
  return this.paymentConfig?.inscriptionFee?.description || 'Frais d\'inscription obligatoires';
}

getInscriptionFeeForStudent(student: StudentWithPayment): number {
  if (!this.paymentConfig?.inscriptionFee?.enabled || !student.gradeCategory) {
    return 0;
  }

  if (student.gradeCategory === 'maternelle' || student.gradeCategory === 'primaire') {
    return this.paymentConfig.inscriptionFee.prices.maternelleAndPrimaire || 0;
  }
  
  if (student.gradeCategory === 'secondaire') {
    return this.paymentConfig.inscriptionFee.prices.collegeAndLycee || 0;
  }
  
  return 0;
}

/**
 * Open invoice dialog specifically for inscription fee
 */
openInscriptionFeeInvoice(student: StudentWithPayment): void {
  if (!student.hasPaymentRecord || !student.paymentRecord?.inscriptionFee?.isPaid) {
    this.showWarning('Les frais d\'inscription n\'ont pas encore été payés');
    return;
  }

  this.selectedStudentForInvoice = student;
  this.showCurrentMonthOnlyInInvoice = false;
  this.currentMonthIndexForInvoice = undefined;
  this.currentPaymentDateForInvoice = undefined;
  this.monthNameForInvoice = undefined;
  this.componentOnlyForInvoice = 'inscriptionFee'; // NEW: Set component-only mode

  this.isInvoiceDialogOpen = true;
  document.body.style.overflow = 'hidden';
}

/**
 * Open invoice dialog specifically for uniform
 */
openUniformInvoice(student: StudentWithPayment): void {
  if (!student.hasPaymentRecord || !student.paymentRecord?.uniform?.isPaid) {
    this.showWarning('L\'uniforme n\'a pas encore été payé');
    return;
  }

  this.selectedStudentForInvoice = student;
  this.showCurrentMonthOnlyInInvoice = false;
  this.currentMonthIndexForInvoice = undefined;
  this.currentPaymentDateForInvoice = undefined;
  this.monthNameForInvoice = undefined;
  this.componentOnlyForInvoice = 'uniform'; // NEW: Set component-only mode

  this.isInvoiceDialogOpen = true;
  document.body.style.overflow = 'hidden';
}
}