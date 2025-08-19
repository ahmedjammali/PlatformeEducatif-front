// payment-management.component.ts (Updated with Delete All and Fixed Class Filter)
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
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
  BulkUpdateResult
} from '../../../models/payment.model';
import { Class } from '../../../models/class.model';
import { User } from '../../../models/user.model';

// Interfaces
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

interface ClassGroup {
  value: string;
  label: string;
  color: string;
}

interface QuickAction {
  id: string;
  label: string;
  count: number;
  icon: string;
  color: string;
  action: () => void;
}

interface StudentPaymentDetailsResponse {
  student: {
    _id: string;
    name: string;
    email: string;
    studentClass: {
      _id: string;
      name: string;
      grade: string;
    };
    classGroup: string;
  };
  paymentRecord: any;
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
  
  // Core Data Properties
  students: StudentWithPayment[] = [];
  dashboard: PaymentDashboard | null = null;
  paymentConfig: PaymentConfiguration | null = null;
  classes: Class[] = [];
  totalStudents = 0;
  
  // UI State
  isLoading = false;
  selectedStudent: StudentWithPayment | null = null;
  expandedStudentId: string | null = null;
  
  // Forms and Filters
  filterForm: FormGroup;
  searchControl: FormControl;
  academicYears: string[] = [];
  currentAcademicYear: string;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  
  // Modal States
  isPaymentDialogOpen = false;
  currentDialogData: PaymentDialogData | null = null;
  
  // Toast and Confirmation Systems
  toasts: Toast[] = [];
  confirmationState: ConfirmationState = {
    isOpen: false,
    config: null
  };
  
  // Configuration Data
  paymentStatuses: PaymentStatus[] = [
    { value: '', label: 'Tous les statuts', icon: 'list', color: '#666666' },
    { value: 'completed', label: 'Payé', icon: 'check_circle', color: '#4CAF50' },
    { value: 'partial', label: 'Partiel', icon: 'schedule', color: '#FF9800' },
    { value: 'pending', label: 'En attente', icon: 'hourglass_empty', color: '#7AB2D3' },
    { value: 'overdue', label: 'En retard', icon: 'error', color: '#F44336' },
    { value: 'no_record', label: 'Sans dossier', icon: 'help_outline', color: '#666666' }
  ];
  
  classGroups: ClassGroup[] = [
    { value: '', label: 'Tous les niveaux', color: '#666666' },
    { value: 'école', label: 'École', color: '#2196F3' },
    { value: 'college', label: 'Collège', color: '#4CAF50' },
    { value: 'lycée', label: 'Lycée', color: '#FF9800' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private classService: ClassService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.currentAcademicYear = this.paymentService.getCurrentAcademicYear();
    this.academicYears = this.paymentService.getAcademicYears();
    
    // Initialize forms
    this.searchControl = new FormControl('');
    this.filterForm = new FormGroup({
      paymentStatus: new FormControl(''),
      classGroup: new FormControl(''),
      classId: new FormControl(''),
      academicYear: new FormControl(this.currentAcademicYear)
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFilters();
    this.loadDashboard();
    this.checkQueryParams();
  }

  ngAfterViewInit(): void {
    // Setup any additional view-related functionality if needed
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
      if (params['classGroup']) {
        this.filterForm.patchValue({ classGroup: params['classGroup'] });
      }
    });
  }

  private loadInitialData(): void {
    this.loadClasses();
    this.loadPaymentConfig();
    this.loadStudents();
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

  // ===== NEW: CLASS FILTER HELPER =====
  
getFilteredClasses(): Class[] {
  const selectedClassGroup = this.filterForm.get('classGroup')?.value;
  
  if (!selectedClassGroup) {
    return this.classes;
  }
  
  return this.classes.filter(classItem => {
    const classGroup = this.getClassGroupFromGrade(classItem.grade);
    return classGroup === selectedClassGroup;
  });
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
      classGroup: this.filterForm.get('classGroup')?.value || undefined,
      classId: this.filterForm.get('classId')?.value || undefined, // FIXED: Include classId filter
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
  private getClassGroupFromGrade(grade: string): string {
  const ecoleGrades = ['6eme', '5eme', '4eme', '3eme', '2nde', '1ere'];
  const collegeGrades = ['9eme', '8eme', '7eme'];
  const lyceeGrades = ['4ᵉ année S', '3ᵉ année S', '2ᵉ année S', '1ʳᵉ année S'];
  
  if (ecoleGrades.includes(grade)) return 'école';
  if (collegeGrades.includes(grade)) return 'college';
  if (lyceeGrades.includes(grade)) return 'lycée';
  
  return 'école'; // Default
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
      `Voulez-vous générer des dossiers de paiement pour ${studentsWithoutRecord} étudiant(s) ?`,
      'info'
    );

    if (confirmed) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      this.isLoading = true;
      
      this.paymentService.bulkGeneratePayments(academicYear).subscribe({
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

  // ===== NEW: DELETE ALL PAYMENT RECORDS =====
  
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
      // Double confirmation for this critical action
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

  generatePaymentRecord(student: StudentWithPayment): void {
    if (!student._id) {
      this.showError('ID étudiant manquant');
      return;
    }

    const academicYear = this.filterForm.get('academicYear')?.value;
    
    this.paymentService.generatePaymentForStudent(student._id, academicYear).subscribe({
      next: (paymentRecord) => {
        this.showSuccess(`Dossier de paiement généré pour ${student.name}`);
        this.loadStudents();
        this.loadDashboard();
      },
      error: (error) => {
        console.error('Error generating payment record:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la génération du dossier';
        this.showError(errorMessage);
      }
    });
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

  viewStudentDetails(student: StudentWithPayment): void {
    if (!student._id || !student.hasPaymentRecord) return;
    
    const academicYear = this.filterForm.get('academicYear')?.value;
    
    this.paymentService.getStudentPaymentDetails(student._id, academicYear).subscribe({
      next: (details: StudentPaymentDetailsResponse) => {
        this.selectedStudent = student;
        this.expandedStudentId = student._id;
        console.log('Student payment details:', details);
      },
      error: (error) => {
        console.error('Error loading student details:', error);
        this.showError('Erreur lors du chargement des détails');
      }
    });
  }

  // ===== PAYMENT DIALOG MANAGEMENT =====

  openPaymentDialog(student: StudentWithPayment, type: 'monthly' | 'annual', monthIndex?: number): void {
    if (!student.paymentRecord) {
      this.showWarning('Veuillez d\'abord générer un dossier de paiement');
      return;
    }

    this.currentDialogData = {
      student: student,
      type: type,
      monthIndex: monthIndex,
      academicYear: this.filterForm.get('academicYear')?.value || this.currentAcademicYear
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
      const paymentType = result.type === 'monthly' ? 'mensuel' : 'annuel';
      this.showSuccess(`Paiement ${paymentType} enregistré avec succès`);
      
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

  onClassGroupChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedClassGroup = target.value;
    
    // FIXED: Clear classId when classGroup changes
    this.filterForm.patchValue({ 
      classGroup: selectedClassGroup,
      classId: '' // Reset class selection when group changes
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
      classGroup: '',
      classId: ''
    });
  }

  hasActiveFilters(): boolean {
    const formValues = this.filterForm.value;
    return !!(
      this.searchControl.value ||
      formValues.paymentStatus ||
      formValues.classGroup ||
      formValues.classId
    );
  }

  // ===== NAVIGATION METHODS =====

  navigateToConfig(): void {
    this.router.navigate(['config'], { relativeTo: this.route });
  }

  navigateToFinancialOverview(): void {
    this.router.navigate(['financial-overview'], { 
      relativeTo: this.route,
      queryParams: { academicYear: this.currentAcademicYear }
    });
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

  getStatusColor(status: string): string {
    return this.paymentService.getPaymentStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return this.paymentService.getPaymentStatusIcon(status);
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
    return this.paymentService.calculatePaymentProgress(
      student.paymentRecord.paidAmount,
      student.paymentRecord.totalAmount
    );
  }

  getClassName(student: StudentWithPayment): string {
    if (typeof student.studentClass === 'object' && student.studentClass?.name) {
      return student.studentClass.name;
    }
    return 'Non assigné';
  }

  getClassGrade(student: StudentWithPayment): string {
    if (typeof student.studentClass === 'object' && student.studentClass?.grade) {
      return student.studentClass.grade;
    }
    return 'Non assigné';
  }

  getClassGroupLabel(classGroup: string): string {
    const group = this.classGroups.find(g => g.value === classGroup);
    return group?.label || classGroup;
  }

  getClassGroupColor(classGroup: string): string {
    const group = this.classGroups.find(g => g.value === classGroup);
    return group?.color || '#666666';
  }

  getPaymentMethodLabel(method?: string): string {
    return this.paymentService.getPaymentMethodLabel(method || '');
  }

  getCompletionRate(): number {
    if (!this.dashboard) return 0;
    const total = this.dashboard.overview.totalStudents;
    const completed = this.dashboard.statusCounts.completed;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }

  isPaymentOverdue(dueDate: Date | string): boolean {
    return this.paymentService.isPaymentOverdue(dueDate, this.paymentConfig?.gracePeriod);
  }

  formatDate(date: Date | string): string {
    return this.paymentService.formatDate(date);
  }

  // ===== BUTTON HELPER METHODS =====

  getStudentsWithoutRecord(): number {
    if (!this.dashboard) return 0;
    return this.dashboard.statusCounts.no_record || 0;
  }

  // NEW: Helper method for delete all button
  getStudentsWithRecord(): number {
    if (!this.dashboard) return 0;
    const total = this.dashboard.overview.totalStudents || 0;
    const withoutRecord = this.dashboard.statusCounts.no_record || 0;
    return total - withoutRecord;
  }

  shouldShowBulkGenerate(): boolean {
    return this.getStudentsWithoutRecord() > 0;
  }

  shouldShowUpdate(): boolean {
    return !!this.paymentConfig;
  }

  shouldShowDeleteAll(): boolean {
    return this.getStudentsWithRecord() > 0;
  }

  getGenerateButtonText(): string {
    const count = this.getStudentsWithoutRecord();
    if (count === 0) {
      return 'Tous les dossiers créés';
    }
    return `${count} étudiant${count > 1 ? 's' : ''} sans dossier`;
  }

  getUpdateButtonText(): string {
    if (!this.paymentConfig) {
      return 'Configuration requise';
    }
    return 'Appliquer nouvelle configuration';
  }

  getDeleteAllButtonText(): string {
    const count = this.getStudentsWithRecord();
    if (count === 0) {
      return 'Aucun dossier à supprimer';
    }
    return `${count} dossier${count > 1 ? 's' : ''} existant${count > 1 ? 's' : ''}`;
  }
}