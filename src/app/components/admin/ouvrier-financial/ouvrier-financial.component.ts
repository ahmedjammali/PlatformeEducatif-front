import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Import your services and models
import { OuvrierFinancialService } from '../../../services/ouvrier-financial.service';
import { UserService } from '../../../services/user.service';
import {
  OuvrierFinancialDisplay,
  PaymentDossierDisplay,
  PaymentStatistics,
  CreateOuvrierFinancialRequest,
  UpdateOuvrierFinancialRequest,
  UpdatePaymentDossierRequest,
  OuvrierPaymentDossier,
  OuvrierPosition,
  OUVRIER_POSITIONS
} from '../../../models/ouvrier-financial.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-ouvrier-financial',
  templateUrl: './ouvrier-financial.component.html',
  styleUrls: ['./ouvrier-financial.component.css'],
  
})
export class OuvrierFinancialComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // State
  activeTab = 'overview';
  isLoading = false;
  searchQuery = '';
  filterContract = 'all';
  filterPosition = 'all';
  selectedYear = this.getCurrentAcademicYear();
  
  // Data
  ouvriers: OuvrierFinancialDisplay[] = [];
  filteredOuvriers: OuvrierFinancialDisplay[] = [];
  ouvrierDossiers: PaymentDossierDisplay[] = [];
  availableOuvriers: User[] = [];
  statistics: PaymentStatistics | null = null;
  academicYears: string[] = ['2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'];

  // Selected items
  selectedOuvrier: OuvrierFinancialDisplay | null = null;
  selectedDossier: PaymentDossierDisplay | null = null;
  ouvrierToDelete: OuvrierFinancialDisplay | null = null;

  // Modal states
  showEditModal = false;
  showDossierModal = false;
  showDeleteModal = false;

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';

  // Forms
  createOuvrierForm: FormGroup;
  editOuvrierForm: FormGroup;
  editDossierForm: FormGroup;

  // Position data
  positions = OUVRIER_POSITIONS;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private ouvrierFinancialService: OuvrierFinancialService,
    private userService: UserService
  ) {
    this.createOuvrierForm = this.fb.group({
      ouvrierId: ['', Validators.required],
      position: ['', Validators.required],
      contractType: ['', Validators.required],
      monthlySalary: [null],
      hourlyRate: [null],
      contractualHoursPerMonth: [null],
      startDate: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.editOuvrierForm = this.fb.group({
      position: ['', Validators.required],
      contractType: ['', Validators.required],
      monthlySalary: [null],
      hourlyRate: [null],
      contractualHoursPerMonth: [null],
      isActive: [true]
    });

    this.editDossierForm = this.fb.group({
      hoursWorked: [null],
      finalAmount: [null, [Validators.required, Validators.min(0)]],
      status: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormValidation();
  }

  ngAfterViewInit(): void {
    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Remove keyboard event listener
    document.removeEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  private loadInitialData(): void {
    this.loadStatistics();
    this.loadOuvriers();
    this.loadAvailableOuvriers();
  }

  private setupFormValidation(): void {
    // Contract type validation
    this.createOuvrierForm.get('contractType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.updateContractValidation(this.createOuvrierForm, type);
      });

    this.editOuvrierForm.get('contractType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.updateContractValidation(this.editOuvrierForm, type);
      });
  }

  private updateContractValidation(form: FormGroup, contractType: string): void {
    const monthlySalary = form.get('monthlySalary');
    const hourlyRate = form.get('hourlyRate');
    const contractualHours = form.get('contractualHoursPerMonth');

    if (contractType === 'monthly') {
      monthlySalary?.setValidators([Validators.required, Validators.min(0)]);
      hourlyRate?.clearValidators();
      contractualHours?.clearValidators();
      hourlyRate?.setValue(null);
      contractualHours?.setValue(null);
    } else if (contractType === 'hourly') {
      monthlySalary?.clearValidators();
      monthlySalary?.setValue(null);
      hourlyRate?.setValidators([Validators.required, Validators.min(0)]);
      contractualHours?.setValidators([Validators.required, Validators.min(0)]);
    }

    monthlySalary?.updateValueAndValidity();
    hourlyRate?.updateValueAndValidity();
    contractualHours?.updateValueAndValidity();
  }

  private getCurrentAcademicYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  // Data loading methods
  loadStatistics(): void {
    const filters = { academicYear: this.selectedYear };
    
    this.ouvrierFinancialService.getPaymentStatistics(filters).subscribe({
      next: (response) => {
        this.statistics = response.statistics;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.showNotification('Error loading statistics', 'error');
      }
    });
  }

  loadOuvriers(): void {
    this.isLoading = true;
    
    this.ouvrierFinancialService.getAllOuvriersFinancialFormatted().subscribe({
      next: (response) => {
        this.ouvriers = response.ouvriers;
        this.filterOuvriers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ouvriers:', error);
        this.showNotification('Error loading ouvriers', 'error');
        this.isLoading = false;
      }
    });
  }

  loadAvailableOuvriers(): void {
    this.userService.getAllUsers({ role: 'ouvrier' }).subscribe({
      next: (response: any) => {
        const ouvrierIds = this.ouvriers.map(o => o.ouvrierInfo._id);
        this.availableOuvriers = response.users.filter(
          (user: User) => !ouvrierIds.includes(user._id)
        );
      },
      error: (error) => {
        console.error('Error loading available ouvriers:', error);
        this.showNotification('Error loading available ouvriers', 'error');
      }
    });
  }

  // Filter methods
  filterOuvriers(): void {
    let filtered = [...this.ouvriers];

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(ouvrier => 
        ouvrier.ouvrierInfo.name.toLowerCase().includes(query) ||
        ouvrier.ouvrierInfo.email.toLowerCase().includes(query) ||
        this.getPositionLabel(ouvrier.position).toLowerCase().includes(query)
      );
    }

    // Position filter
    if (this.filterPosition !== 'all') {
      filtered = filtered.filter(ouvrier => ouvrier.position === this.filterPosition);
    }

    // Contract type filter
    if (this.filterContract !== 'all') {
      filtered = filtered.filter(ouvrier => ouvrier.contractType === this.filterContract);
    }

    this.filteredOuvriers = filtered;
  }

  setPositionFilter(filter: string): void {
    this.filterPosition = filter;
    this.filterOuvriers();
  }

  setContractFilter(filter: string): void {
    this.filterContract = filter;
    this.filterOuvriers();
  }

  sortOuvriers(): void {
    this.filteredOuvriers.sort((a, b) => {
      return a.ouvrierInfo.name.localeCompare(b.ouvrierInfo.name);
    });
  }

  // Navigation methods
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    if (tab === 'ouvriers') {
      this.loadOuvriers();
    }
  }

  viewOuvrierDetails(ouvrier: OuvrierFinancialDisplay): void {
    this.selectedOuvrier = ouvrier;
    this.activeTab = 'ouvrier-detail';
    this.loadOuvrierDossiers(ouvrier.ouvrierInfo._id);
  }

  loadOuvrierDossiers(ouvrierId: string): void {
    const filters = {
      academicYear: this.selectedYear
    };

    this.isLoading = true;
    
    this.ouvrierFinancialService.getOuvrierPaymentDossiers(ouvrierId, filters).subscribe({
      next: (dossiers: OuvrierPaymentDossier[]) => {
        // Convert OuvrierPaymentDossier to PaymentDossierDisplay format
        this.ouvrierDossiers = dossiers.map(dossier => ({
          _id: dossier._id,
          ouvrierInfo: {
            _id: ouvrierId,
            name: this.selectedOuvrier?.ouvrierInfo.name || '',
            email: this.selectedOuvrier?.ouvrierInfo.email || ''
          },
          financialInfo: {
            position: this.selectedOuvrier?.position || 'autre',
            contractType: this.selectedOuvrier?.contractType || 'monthly',
            monthlySalary: this.selectedOuvrier?.monthlySalary,
            hourlyRate: this.selectedOuvrier?.hourlyRate
          },
          month: dossier.month,
          year: dossier.year,
          academicYear: dossier.academicYear,
          hoursWorked: dossier.hoursWorked,
          calculatedAmount: dossier.calculatedAmount,
          finalAmount: dossier.finalAmount,
          status: dossier.status,
          paymentDate: dossier.paymentDate,
          notes: dossier.notes,
          monthName: this.getMonthName(dossier.month)
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ouvrier dossiers:', error);
        this.showNotification('Error loading payment records', 'error');
        this.isLoading = false;
      }
    });
  }

  selectAcademicYear(year: string): void {
    this.selectedYear = year;
    if (this.selectedOuvrier) {
      this.loadOuvrierDossiers(this.selectedOuvrier.ouvrierInfo._id);
    }
    this.loadStatistics();
  }

  // CRUD Operations
  createOuvrier(): void {
    if (this.createOuvrierForm.valid) {
      this.isLoading = true;
      const formData = this.createOuvrierForm.value;

      const request: CreateOuvrierFinancialRequest = {
        ouvrierId: formData.ouvrierId,
        position: formData.position as OuvrierPosition,
        contractType: formData.contractType,
        startDate: formData.startDate,
        monthlySalary: formData.monthlySalary,
        hourlyRate: formData.hourlyRate,
        contractualHoursPerMonth: formData.contractualHoursPerMonth
      };

      this.ouvrierFinancialService.createOuvrierFinancialInfo(request).subscribe({
        next: (response) => {
          this.showNotification('Ouvrier financial information created successfully', 'success');
          this.createOuvrierForm.reset();
          this.createOuvrierForm.get('startDate')?.setValue(new Date().toISOString().split('T')[0]);
          
          // Redirect to ouvrier detail view
          this.loadOuvriers();
          this.loadAvailableOuvriers();
          setTimeout(() => {
            const newOuvrier = this.ouvriers.find(o => o.ouvrierInfo._id === formData.ouvrierId);
            if (newOuvrier) {
              this.viewOuvrierDetails(newOuvrier);
            }
          }, 500);
          
          this.isLoading = false;
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error creating ouvrier', 'error');
          this.isLoading = false;
        }
      });
    }
  }

  editOuvrier(ouvrier: OuvrierFinancialDisplay): void {
    this.selectedOuvrier = ouvrier;
    this.editOuvrierForm.patchValue({
      position: ouvrier.position,
      contractType: ouvrier.contractType,
      monthlySalary: ouvrier.monthlySalary,
      hourlyRate: ouvrier.hourlyRate,
      contractualHoursPerMonth: ouvrier.contractualHoursPerMonth,
      isActive: ouvrier.isActive
    });
    this.showEditModal = true;
  }

  updateOuvrier(): void {
    if (this.editOuvrierForm.valid && this.selectedOuvrier) {
      const formData = this.editOuvrierForm.value;

      const request: UpdateOuvrierFinancialRequest = {
        position: formData.position,
        contractType: formData.contractType,
        monthlySalary: formData.monthlySalary,
        hourlyRate: formData.hourlyRate,
        contractualHoursPerMonth: formData.contractualHoursPerMonth,
        isActive: formData.isActive
      };

      this.ouvrierFinancialService.updateOuvrierFinancialInfo(
        this.selectedOuvrier.ouvrierInfo._id,
        request
      ).subscribe({
        next: () => {
          this.showNotification('Ouvrier updated successfully', 'success');
          this.closeModal();
          this.loadOuvriers();
          this.loadStatistics();
          
          // Update selected ouvrier if in detail view
          if (this.activeTab === 'ouvrier-detail' && this.selectedOuvrier) {
            const updatedOuvrier = this.ouvriers.find(o => o.ouvrierInfo._id === this.selectedOuvrier!.ouvrierInfo._id);
            if (updatedOuvrier) {
              this.selectedOuvrier = updatedOuvrier;
              this.loadOuvrierDossiers(updatedOuvrier.ouvrierInfo._id);
            }
          }
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error updating ouvrier', 'error');
        }
      });
    }
  }

  deleteOuvrier(ouvrier: OuvrierFinancialDisplay): void {
    this.ouvrierToDelete = ouvrier;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.ouvrierToDelete) {
      this.ouvrierFinancialService.deleteOuvrierFinancialInfo(
        this.ouvrierToDelete.ouvrierInfo._id
      ).subscribe({
        next: () => {
          this.showNotification('Ouvrier deleted successfully', 'success');
          this.closeModal();
          this.loadOuvriers();
          this.loadStatistics();
          this.loadAvailableOuvriers();
          this.setActiveTab('ouvriers');
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error deleting ouvrier', 'error');
        }
      });
    }
  }

editDossier(dossier: PaymentDossierDisplay): void {
  this.selectedDossier = dossier;
  this.editDossierForm.patchValue({
    hoursWorked: dossier.hoursWorked,
    finalAmount: dossier.finalAmount,
    status: dossier.status,
    notes: dossier.notes
  });

  // Set up automatic calculation for hourly contracts
  if (dossier.financialInfo.contractType === 'hourly') {
    this.editDossierForm.get('hoursWorked')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.calculateFinalAmount();
      });
  }

  this.showDossierModal = true;
}

  updateDossier(): void {
    if (this.editDossierForm.valid && this.selectedDossier) {
      const formData = this.editDossierForm.value;

      const request: UpdatePaymentDossierRequest = {
        hoursWorked: formData.hoursWorked,
        finalAmount: formData.finalAmount,
        status: formData.status as 'paid' | 'partial' | 'unpaid',
        notes: formData.notes
      };

      if (formData.status === 'paid' && this.selectedDossier.status !== 'paid') {
        request.paymentDate = new Date().toISOString();
      }

      this.ouvrierFinancialService.updatePaymentDossier(
        this.selectedDossier._id,
        request
      ).subscribe({
        next: () => {
          this.showNotification('Payment record updated successfully', 'success');
          this.closeModal();
          if (this.selectedOuvrier) {
            this.loadOuvrierDossiers(this.selectedOuvrier.ouvrierInfo._id);
          }
          this.loadStatistics();
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error updating payment', 'error');
        }
      });
    }
  }

  updatePaymentStatus(dossier: PaymentDossierDisplay): void {
    if (dossier.status === 'paid') {
      return; // Already paid
    }

    const request: UpdatePaymentDossierRequest = {
      status: 'paid',
      paymentDate: new Date().toISOString()
    };

    this.ouvrierFinancialService.updatePaymentDossier(dossier._id, request).subscribe({
      next: () => {
        this.showNotification('Payment marked as paid successfully', 'success');
        if (this.selectedOuvrier) {
          this.loadOuvrierDossiers(this.selectedOuvrier.ouvrierInfo._id);
        }
        this.loadStatistics();
      },
      error: (error) => {
        this.showNotification(error.error?.message || 'Error updating payment status', 'error');
      }
    });
  }

  markAllPaid(): void {
    if (!this.selectedOuvrier || !this.hasUnpaidDossiers()) {
      return;
    }

    if (confirm(`Mark all unpaid records as paid for ${this.selectedOuvrier.ouvrierInfo.name} (${this.selectedYear})?`)) {
      const unpaidDossiers = this.ouvrierDossiers.filter(d => d.status !== 'paid');
      
      if (unpaidDossiers.length === 0) {
        this.showNotification('No unpaid records found', 'info');
        return;
      }

      this.isLoading = true;
      
      Promise.all(
        unpaidDossiers.map(dossier => 
          this.ouvrierFinancialService.updatePaymentDossier(dossier._id, {
            status: 'paid',
            paymentDate: new Date().toISOString()
          }).toPromise()
        )
      ).then(() => {
        this.showNotification(`${unpaidDossiers.length} payments marked as paid`, 'success');
        this.loadOuvrierDossiers(this.selectedOuvrier!.ouvrierInfo._id);
        this.loadStatistics();
        this.isLoading = false;
      }).catch((error) => {
        this.showNotification('Error updating some payments', 'error');
        this.isLoading = false;
        console.error('Bulk update error:', error);
      });
    }
  }

  hasUnpaidDossiers(): boolean {
    return this.ouvrierDossiers.some(d => d.status !== 'paid');
  }

  // Utility methods
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) {
      return 'N/A';
    }
    return new Intl.NumberFormat('fr-TN', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  getMonthName(month: number): string {
    const months = [
      'September', 'October', 'November', 'December',
      'January', 'February', 'March', 'April', 
      'May', 'June', 'July', 'August'
    ];
    
    // Convert calendar month to academic month (September = 1)
    let academicMonth = month;
    if (month >= 9) {
      academicMonth = month - 8; // Sept=1, Oct=2, Nov=3, Dec=4
    } else {
      academicMonth = month + 4; // Jan=5, Feb=6... Aug=12
    }
    
    return months[academicMonth - 1] || 'Unknown';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Paid',
      'unpaid': 'Unpaid',
      'partial': 'Partial'
    };
    return labels[status] || status;
  }

  getPositionLabel(position: OuvrierPosition): string {
    const positionData = this.positions.find(p => p.value === position);
    return positionData?.label || 'Unknown';
  }

  getPositionClass(position: OuvrierPosition): string {
    switch (position) {
      case 'sécurité':
        return 'security';
      case 'chef':
        return 'chef';
      case 'nettoyeur':
        return 'cleaner';
      case 'cuisinier':
        return 'cook';
      case 'surveillant':
        return 'supervisor';
      case 'maintenance':
        return 'maintenance';
      case 'autre':
        return 'other';
      default:
        return 'other';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#4A628A', '#7AB2D3', '#B9E5E8', '#DFF2EB',
      '#5b21b6', '#7c3aed', '#06b6d4', '#0891b2',
      '#10b981', '#f59e0b', '#ef4444', '#3b82f6'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }

  getYearTotal(type: 'calculated' | 'paid' | 'pending'): number {
    if (!this.ouvrierDossiers || this.ouvrierDossiers.length === 0) return 0;
    
    switch (type) {
      case 'calculated':
        return this.ouvrierDossiers.reduce((sum, d) => sum + (d.finalAmount || 0), 0);
      case 'paid':
        return this.ouvrierDossiers
          .filter(d => d.status === 'paid')
          .reduce((sum, d) => sum + (d.finalAmount || 0), 0);
      case 'pending':
        return this.ouvrierDossiers
          .filter(d => d.status !== 'paid')
          .reduce((sum, d) => sum + (d.finalAmount || 0), 0);
      default:
        return 0;
    }
  }

  // Dashboard utility methods
  getCompletionRate(): number {
    if (!this.statistics || this.statistics.totalDossiers === 0) {
      return 0;
    }
    return Math.round((this.statistics.paidCount / this.statistics.totalDossiers) * 100);
  }

  getTotalPending(): number {
    if (!this.statistics) {
      return 0;
    }
    return this.statistics.unpaidAmount + this.statistics.partialAmount;
  }

  // Modal management
  closeModal(): void {
    this.showEditModal = false;
    this.showDossierModal = false;
    this.showDeleteModal = false;

  }

  // Add this method to automatically calculate final amount
calculateFinalAmount(): void {
  if (!this.selectedDossier) return;

  const hoursWorked = this.editDossierForm.get('hoursWorked')?.value;
  const contractType = this.selectedDossier.financialInfo.contractType;

  if (contractType === 'hourly' && hoursWorked !== null && hoursWorked !== undefined) {
    const hourlyRate = this.selectedDossier.financialInfo.hourlyRate || 0;
    const calculatedAmount = hoursWorked * hourlyRate;
    
    // Update the final amount in the form
    this.editDossierForm.patchValue({
      finalAmount: calculatedAmount
    }, { emitEvent: false }); // emitEvent: false to prevent infinite loops
  }
}

  // Toast notifications
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 4000);
  }

  // Form utilities
  resetForm(): void {
    this.createOuvrierForm.reset();
    this.createOuvrierForm.get('startDate')?.setValue(new Date().toISOString().split('T')[0]);
    this.createOuvrierForm.get('contractType')?.setValue('');
    this.createOuvrierForm.get('position')?.setValue('');
  }

  // Search functionality
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.filterOuvriers();
  }

  // Validation helpers
  isFieldInvalid(formGroup: FormGroup, fieldName: string): boolean {
    const field = formGroup.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(formGroup: FormGroup, fieldName: string): string {
    const field = formGroup.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return `${fieldName} is required`;
      }
      if (field.errors['min']) {
        return `${fieldName} must be greater than 0`;
      }
    }
    return '';
  }

  // Data refresh
  refreshAllData(): void {
    this.isLoading = true;
    this.loadStatistics();
    this.loadOuvriers();
    this.loadAvailableOuvriers();
    
    setTimeout(() => {
      this.isLoading = false;
      this.showNotification('Data refreshed successfully', 'success');
    }, 1000);
  }

  // Keyboard shortcuts
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'n':
          event.preventDefault();
          this.setActiveTab('create');
          break;
        case 'r':
          event.preventDefault();
          this.refreshAllData();
          break;
        case 'f':
          event.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
      }
    }
  }

  // Accessibility helpers
  getAriaLabel(ouvrier: OuvrierFinancialDisplay): string {
    return `Ouvrier ${ouvrier.ouvrierInfo.name}, ${this.getPositionLabel(ouvrier.position)}, ${ouvrier.contractType} contract, ${ouvrier.isActive ? 'active' : 'inactive'}`;
  }

  getStatusAriaLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'paid': 'Payment completed',
      'unpaid': 'Payment pending',
      'partial': 'Payment partially completed'
    };
    return labels[status] || status;
  }
}