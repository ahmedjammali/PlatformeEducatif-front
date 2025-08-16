// components/payment-management/payment-management.component.ts
import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { trigger, state, style, transition, animate } from '@angular/animations'; // Add this
import { PaymentService } from '../../../services/payment.service';
import { ClassService } from '../../../services/class.service';
import {
  StudentWithPayment,
  PaymentDashboard,
  PaymentFilters,
  PaymentConfiguration
} from '../../../models/payment.model';
import { Class } from '../../../models/class.model';
import { PaymentDialogComponent, PaymentDialogData } from '../payment-dialog/payment-dialog.component';

@Component({
  selector: 'app-payment-management',
  templateUrl: './payment-management.component.html',
  styleUrls: ['./payment-management.component.css'], 
  animations: [  // Add this animations array
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class PaymentManagementComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data properties
  dataSource: MatTableDataSource<StudentWithPayment>;
  students: StudentWithPayment[] = [];
  dashboard: PaymentDashboard | null = null;
  paymentConfig: PaymentConfiguration | null = null;
  classes: Class[] = [];
  
  // UI state
  isLoading = false;
  selectedStudent: StudentWithPayment | null = null;
  expandedStudentId: string | null = null;
  
  // Filter form
  filterForm: FormGroup;
  searchControl: FormControl;
  academicYears: string[] = [];
  currentAcademicYear: string;
  
  // Table columns
  displayedColumns: string[] = [
    'expand',
    'name',
    'class',
    'status',
    'totalAmount',
    'paidAmount',
    'remainingAmount',
    'progress',
    'actions'
  ];
  
  // Filter options
  paymentStatuses = [
    { value: '', label: 'Tous les statuts' },
    { value: 'completed', label: 'Payé', icon: 'check_circle', color: '#4CAF50' },
    { value: 'partial', label: 'Partiel', icon: 'schedule', color: '#FF9800' },
    { value: 'pending', label: 'En attente', icon: 'hourglass_empty', color: '#2196F3' },
    { value: 'overdue', label: 'En retard', icon: 'error', color: '#F44336' },
    { value: 'no_record', label: 'Sans dossier', icon: 'help_outline', color: '#666666' }
  ];
  
  classGroups = [
    { value: '', label: 'Tous les niveaux' },
    { value: 'college', label: 'Collège' },
    { value: 'moyenne', label: 'Moyenne' },
    { value: 'lycee', label: 'Lycée' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private paymentService: PaymentService,
    private classService: ClassService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<StudentWithPayment>([]);
    this.currentAcademicYear = this.paymentService.getCurrentAcademicYear();
    this.academicYears = this.paymentService.getAcademicYears();
    
    // Initialize filters
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    // Load classes
    this.classService.getClasses().subscribe({
      next: (response) => {
        this.classes = response.classes;
      },
      error: (error) => {
        console.error('Error loading classes:', error);
      }
    });

    // Load payment configuration
    this.loadPaymentConfig();
    
    // Load students with payments
    this.loadStudents();
  }

  private loadPaymentConfig(): void {
    const academicYear = this.filterForm.get('academicYear')?.value;
    this.paymentService.getPaymentConfig(academicYear).subscribe({
      next: (config) => {
        this.paymentConfig = config;
      },
      error: (error) => {
        if (error.status === 404) {
          this.showSnackBar('Configuration de paiement non trouvée. Veuillez la configurer.', 'warning');
        }
      }
    });
  }

  private setupFilters(): void {
    // Search filter
    this.searchControl.valueChanges
      .pipe(
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
      .subscribe(() => this.loadStudents());
  }

  loadStudents(): void {
    this.isLoading = true;
    
    const filters: PaymentFilters = {
      search: this.searchControl.value || undefined,
      paymentStatus: this.filterForm.get('paymentStatus')?.value || undefined,
      classGroup: this.filterForm.get('classGroup')?.value || undefined,
      academicYear: this.filterForm.get('academicYear')?.value,
      page: this.paginator?.pageIndex ? this.paginator.pageIndex + 1 : 1,
      limit: this.paginator?.pageSize || 50
    };

    this.paymentService.getAllStudentsWithPayments(filters).subscribe({
      next: (response) => {
        this.students = response.students;
        this.dataSource.data = this.students;
        
        if (this.paginator) {
          this.paginator.length = response.pagination.totalStudents;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading students:', error);
        this.showSnackBar('Erreur lors du chargement des étudiants', 'error');
        this.isLoading = false;
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
      }
    });
  }

  // Student actions
  toggleExpandRow(student: StudentWithPayment): void {
    this.expandedStudentId = this.expandedStudentId === student._id ? null : student._id;
  }

  generatePaymentRecord(student: StudentWithPayment): void {
    if (!student._id) return;

    const academicYear = this.filterForm.get('academicYear')?.value;
    
    this.paymentService.generatePaymentForStudent(student._id, academicYear).subscribe({
      next: () => {
        this.showSnackBar('Dossier de paiement généré avec succès', 'success');
        this.loadStudents();
        this.loadDashboard();
      },
      error: (error) => {
        console.error('Error generating payment record:', error);
        this.showSnackBar(error.error?.message || 'Erreur lors de la génération du dossier', 'error');
      }
    });
  }

  bulkGeneratePayments(): void {
    const academicYear = this.filterForm.get('academicYear')?.value;
    
    if (confirm('Voulez-vous générer des dossiers de paiement pour tous les étudiants sans dossier?')) {
      this.isLoading = true;
      this.paymentService.bulkGeneratePayments(academicYear).subscribe({
        next: (response) => {
          this.showSnackBar(
            `Génération terminée: ${response.results.success} réussis, ${response.results.errors.length} erreurs`,
            'success'
          );
          this.loadStudents();
          this.loadDashboard();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error in bulk generation:', error);
          this.showSnackBar('Erreur lors de la génération en masse', 'error');
          this.isLoading = false;
        }
      });
    }
  }

openPaymentDialog(student: StudentWithPayment, type: 'monthly' | 'annual', monthIndex?: number): void {
  if (!student.paymentRecord && type === 'monthly') {
    this.showSnackBar('Veuillez d\'abord générer un dossier de paiement', 'warning');
    return;
  }

  const dialogData: PaymentDialogData = {
    student: student,
    type: type,
    monthIndex: monthIndex,
    academicYear: this.filterForm.get('academicYear')?.value
  };

  const dialogRef = this.dialog.open(PaymentDialogComponent, {
    width: '700px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    data: dialogData,
    disableClose: false,
    panelClass: 'payment-dialog-panel'
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loadStudents();
      this.loadDashboard();
      this.showSnackBar('Paiement enregistré avec succès', 'success');
    }
  });
}

  openPaymentDetails(student: StudentWithPayment): void {
    if (!student.paymentRecord) return;
    this.selectedStudent = student;
    // Open a detailed view dialog or navigate to details page
  }

  exportToExcel(): void {
    // Implementation for Excel export
    console.log('Exporting to Excel...');
  }

  printReport(): void {
    // Implementation for printing
    window.print();
  }

  // Utility methods
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

  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    });
  }
}