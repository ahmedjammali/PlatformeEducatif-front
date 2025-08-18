// payment-management.component.ts (Updated)
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

// Create a compatible interface for the service response
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
    classGroup: string; // This will be a string from the service
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
  ]
})
export class PaymentManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  // Data sources
  students: StudentWithPayment[] = [];
  dashboard: PaymentDashboard | null = null;
  paymentConfig: PaymentConfiguration | null = null;
  classes: Class[] = [];
  totalStudents = 0;
  
  // UI state
  isLoading = false;
  selectedStudent: StudentWithPayment | null = null;
  expandedStudentId: string | null = null;
  showBulkActions = false;
  
  // Forms and filters
  filterForm: FormGroup;
  searchControl: FormControl;
  academicYears: string[] = [];
  currentAcademicYear: string;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  
  // Modal state
  isPaymentDialogOpen = false;
  currentDialogData: PaymentDialogData | null = null;
  
  // Table configuration
  displayedColumns: string[] = [
    'expand',
    'student',
    'class',
    'status',
    'financial',
    'progress',
    'actions'
  ];
  
  // Filter options - Updated for new class groups
  paymentStatuses: PaymentStatus[] = [
    { value: '', label: 'Tous les statuts', icon: 'list', color: '#666666' },
    { value: 'completed', label: 'Payé', icon: 'check_circle', color: '#4CAF50' },
    { value: 'partial', label: 'Partiel', icon: 'schedule', color: '#FF9800' },
    { value: 'pending', label: 'En attente', icon: 'hourglass_empty', color: '#7AB2D3' },
    { value: 'overdue', label: 'En retard', icon: 'error', color: '#F44336' },
    { value: 'no_record', label: 'Sans dossier', icon: 'help_outline', color: '#666666' }
  ];
  
  // Updated class groups
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
    // Setup any additional view-related functionality
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkQueryParams(): void {
    // Handle any query parameters for auto-filtering
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
        this.showMessage('Erreur lors du chargement des classes', 'error');
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
          this.showMessage('Configuration de paiement non trouvée. Veuillez la configurer.', 'warning');
        } else {
          console.error('Error loading payment config:', error);
        }
      }
    });
  }

  private setupFilters(): void {
    // Search filter with debounce
    this.searchControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadStudents());

    // Form filters
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1; // Reset to first page on filter change
        this.loadStudents();
        this.loadDashboard();
        this.loadPaymentConfig();
        
        // Update current academic year
        this.currentAcademicYear = this.filterForm.get('academicYear')?.value || this.currentAcademicYear;
      });
  }

  loadStudents(): void {
    this.isLoading = true;
    
    const filters: PaymentFilters = {
      search: this.searchControl.value?.trim() || undefined,
      paymentStatus: this.filterForm.get('paymentStatus')?.value || undefined,
      classGroup: this.filterForm.get('classGroup')?.value || undefined,
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
        this.showMessage('Erreur lors du chargement des étudiants', 'error');
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
        this.showMessage('Erreur lors du chargement du tableau de bord', 'error');
      }
    });
  }

  refreshData(): void {
    this.loadStudents();
    this.loadDashboard();
    this.showMessage('Données actualisées', 'success');
  }

  // New bulk operations
  bulkGeneratePayments(): void {
    if (!this.dashboard) {
      this.showMessage('Tableau de bord non disponible', 'warning');
      return;
    }

    const studentsWithoutRecord = this.dashboard.statusCounts.no_record || 0;
    
    if (studentsWithoutRecord === 0) {
      this.showMessage('Tous les étudiants ont déjà un dossier de paiement', 'info');
      return;
    }

    const confirmMessage = `Voulez-vous générer des dossiers de paiement pour ${studentsWithoutRecord} étudiant(s) ?`;
    
    if (confirm(confirmMessage)) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      this.isLoading = true;
      
      this.paymentService.bulkGeneratePayments(academicYear).subscribe({
        next: (response) => {
          const message = `Génération terminée: ${response.results.success} réussis, ${response.results.errors.length} erreurs`;
          this.showMessage(message, 'success');
          this.loadStudents();
          this.loadDashboard();
          this.isLoading = false;
          
          if (response.results.errors.length > 0) {
            this.showBulkErrors(response.results.errors);
          }
        },
        error: (error) => {
          console.error('Error in bulk generation:', error);
          this.showMessage('Erreur lors de la génération en masse', 'error');
          this.isLoading = false;
        }
      });
    }
  }

  updateExistingPayments(): void {
    if (!this.paymentConfig) {
      this.showMessage('Configuration de paiement non disponible', 'warning');
      return;
    }

    const confirmMessage = 'Voulez-vous mettre à jour tous les dossiers de paiement existants avec les nouveaux montants ?';
    
    if (confirm(confirmMessage)) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      this.isLoading = true;
      
      this.paymentService.updateExistingPaymentRecords(academicYear, true).subscribe({
        next: (result: BulkUpdateResult) => {
          const message = `Mise à jour terminée: ${result.results.updated} mis à jour, ${result.results.skipped} ignorés`;
          this.showMessage(message, 'success');
          this.loadStudents();
          this.loadDashboard();
          this.isLoading = false;
          
          if (result.results.errors.length > 0) {
            this.showBulkErrors(result.results.errors);
          }
        },
        error: (error) => {
          console.error('Error updating payments:', error);
          this.showMessage('Erreur lors de la mise à jour', 'error');
          this.isLoading = false;
        }
      });
    }
  }

  private showBulkErrors(errors: Array<{ studentId: string; error: string }>): void {
    if (errors.length > 0) {
      const errorMessage = `Erreurs rencontrées:\n${errors.map(e => `- ${e.error}`).join('\n')}`;
      alert(errorMessage);
    }
  }

  // Student Management Actions
  toggleExpandRow(student: StudentWithPayment): void {
    if (!student.hasPaymentRecord) return;
    this.expandedStudentId = this.expandedStudentId === student._id ? null : student._id;
  }

  generatePaymentRecord(student: StudentWithPayment): void {
    if (!student._id) {
      this.showMessage('ID étudiant manquant', 'error');
      return;
    }

    const academicYear = this.filterForm.get('academicYear')?.value;
    
    this.paymentService.generatePaymentForStudent(student._id, academicYear).subscribe({
      next: (paymentRecord) => {
        this.showMessage(`Dossier de paiement généré pour ${student.name}`, 'success');
        this.loadStudents();
        this.loadDashboard();
      },
      error: (error) => {
        console.error('Error generating payment record:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la génération du dossier';
        this.showMessage(errorMessage, 'error');
      }
    });
  }

  deletePaymentRecord(student: StudentWithPayment): void {
    if (!student._id || !student.hasPaymentRecord) {
      this.showMessage('Aucun dossier de paiement à supprimer', 'warning');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer le dossier de paiement de ${student.name} ?`;
    
    if (confirm(confirmMessage)) {
      const academicYear = this.filterForm.get('academicYear')?.value;
      
      this.paymentService.deletePaymentRecord(student._id, academicYear).subscribe({
        next: (response) => {
          this.showMessage(`Dossier de paiement supprimé pour ${student.name}`, 'success');
          this.loadStudents();
          this.loadDashboard();
        },
        error: (error) => {
          console.error('Error deleting payment record:', error);
          this.showMessage('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  viewStudentDetails(student: StudentWithPayment): void {
    if (!student._id || !student.hasPaymentRecord) return;
    
    const academicYear = this.filterForm.get('academicYear')?.value;
    
    this.paymentService.getStudentPaymentDetails(student._id, academicYear).subscribe({
      next: (details: StudentPaymentDetailsResponse) => {
        // Open details in a modal or navigate to details page
        this.selectedStudent = student;
        this.expandedStudentId = student._id;
        console.log('Student payment details:', details);
      },
      error: (error) => {
        console.error('Error loading student details:', error);
        this.showMessage('Erreur lors du chargement des détails', 'error');
      }
    });
  }

  // Payment dialog methods
  openPaymentDialog(student: StudentWithPayment, type: 'monthly' | 'annual', monthIndex?: number): void {
    if (!student.paymentRecord) {
      this.showMessage('Veuillez d\'abord générer un dossier de paiement', 'warning');
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
      this.showMessage(`Paiement ${paymentType} enregistré avec succès`, 'success');
      
      this.loadStudents();
      this.loadDashboard();
    }
  }

  openPaymentDetails(student: StudentWithPayment): void {
    if (!student.paymentRecord) return;
    this.selectedStudent = student;
    this.expandedStudentId = student._id;
  }

  // Event Handlers
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
    this.filterForm.patchValue({ classGroup: target.value });
  }

  onClassIdChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.filterForm.patchValue({ classId: target.value });
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.changePageSize(target.value);
  }

  // Pagination methods
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

  // Filter Management
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

  // Export and Reports
  exportToExcel(): void {
    const filters = {
      academicYear: this.filterForm.get('academicYear')?.value,
      classGroup: this.filterForm.get('classGroup')?.value || undefined,
      paymentStatus: this.filterForm.get('paymentStatus')?.value || undefined
    };
    
    this.paymentService.exportPaymentData(filters).subscribe({
      next: (exportData) => {
        this.downloadExcelFile(exportData);
        this.showMessage(`${exportData.totalRecords} enregistrements exportés`, 'success');
      },
      error: (error) => {
        console.error('Error exporting data:', error);
        this.showMessage('Erreur lors de l\'export', 'error');
      }
    });
  }

  private downloadExcelFile(exportData: any): void {
    // Convert data to CSV format
    const csvContent = this.convertToCSV(exportData.data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `paiements_${exportData.academicYear || 'export'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ];
    
    return csvRows.join('\n');
  }

  viewReports(): void {
    this.router.navigate(['reports'], { relativeTo: this.route });
  }

  printReport(): void {
    window.print();
  }

  // Navigation
  navigateToConfig(): void {
    this.router.navigate(['config'], { relativeTo: this.route });
  }

  navigateToFinancialOverview(): void {
    this.router.navigate(['financial-overview'], { 
      relativeTo: this.route,
      queryParams: { academicYear: this.currentAcademicYear }
    });
  }

  // Quick Actions
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

  // Utility Methods
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

  getCollectionRateNumber(): number {
    if (!this.dashboard) return 0;
    return parseFloat(this.dashboard.overview.collectionRate) || 0;
  }

  getCollectionRateClass(): string {
    const rate = this.getCollectionRateNumber();
    if (rate >= 80) return 'excellent';
    if (rate >= 60) return 'good';
    return 'poor';
  }

  isPaymentOverdue(dueDate: Date | string): boolean {
    return this.paymentService.isPaymentOverdue(dueDate, this.paymentConfig?.gracePeriod);
  }

  formatDate(date: Date | string): string {
    return this.paymentService.formatDate(date);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    if (type === 'error') {
      alert(`Erreur: ${message}`);
    } else if (type === 'success') {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } else if (type === 'warning') {
      alert(`Attention: ${message}`);
    }
  }
}