import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Import your services and models
import { TeacherFinancialService } from '../../../services/teacher-financial.service';
import { UserService } from '../../../services/user.service';
import {
  TeacherFinancialDisplay,
  PaymentDossierDisplay,
  PaymentStatistics,
  CreateTeacherFinancialRequest,
  UpdateTeacherFinancialRequest,
  UpdatePaymentDossierRequest,
  TeacherPaymentDossier,
  ContractPreset,
  MonthOption,
  ContractValidationErrors
} from '../../../models/teacher-financial.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-teacher-financial',
  templateUrl: './teacher-financial.component.html',
  styleUrls: ['./teacher-financial.component.css']
})
export class TeacherFinancialComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // State
  activeTab = 'overview';
  isLoading = false;
  searchQuery = '';
  filterContract = 'all';
  selectedYear = this.getCurrentAcademicYear();
  
  // Data
  teachers: TeacherFinancialDisplay[] = [];
  filteredTeachers: TeacherFinancialDisplay[] = [];
  teacherDossiers: PaymentDossierDisplay[] = [];
  availableTeachers: User[] = [];
  statistics: PaymentStatistics | null = null;
  academicYears: string[] = ['2025-2026', '2026-2027', '2027-2028', '2028-2029', '2029-2030'];

  // Month selection data
  contractPresets: ContractPreset[] = [];
  academicMonths: MonthOption[] = [];
  monthOptions: MonthOption[] = [];

  // Selected items
  selectedTeacher: TeacherFinancialDisplay | null = null;
  selectedDossier: PaymentDossierDisplay | null = null;
  teacherToDelete: TeacherFinancialDisplay | null = null;

  // Modal states
  showEditModal = false;
  showDossierModal = false;
  showDeleteModal = false;

  // Toast
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'warning' | 'info' = 'success';

  // Forms
  createTeacherForm!: FormGroup;
  editTeacherForm!: FormGroup;
  editDossierForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private teacherFinancialService: TeacherFinancialService,
    private userService: UserService
  ) {
    this.initializeForms();
    this.loadMonthData();
  }

  private initializeForms(): void {
    this.createTeacherForm = this.fb.group({
      teacherId: ['', Validators.required],
      contractType: ['monthly', Validators.required],
      monthlySalary: [null],
      hourlyRate: [null],
      contractualHoursPerMonth: [null],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      endDate: ['', Validators.required],
      contractMonths: [[], [Validators.required, this.contractMonthsValidator]]
    });

    this.editTeacherForm = this.fb.group({
      contractType: ['', Validators.required],
      monthlySalary: [null],
      hourlyRate: [null],
      contractualHoursPerMonth: [null],
      endDate: [''],
      contractMonths: [[]],
      isActive: [true]
    });

    this.editDossierForm = this.fb.group({
      hoursWorked: [null],
      finalAmount: [null, [Validators.required, Validators.min(0)]],
      status: ['', Validators.required],
      notes: ['']
    });

    // Add date range validator
    this.createTeacherForm.addValidators([this.dateRangeValidator]);
    this.editTeacherForm.addValidators([this.dateRangeValidator]);
  }

  private loadMonthData(): void {
    this.contractPresets = this.teacherFinancialService.getContractPresets();
    this.academicMonths = this.teacherFinancialService.getAcademicYearMonthOptions();
    this.monthOptions = this.teacherFinancialService.getMonthOptions();
  }

  // Custom validators
  contractMonthsValidator(control: AbstractControl): ValidationErrors | null {
    const months = control.value;
    if (!months || !Array.isArray(months) || months.length === 0) {
      return { required: true };
    }
    
    const invalidMonths = months.filter((month: number) => month < 1 || month > 12);
    if (invalidMonths.length > 0) {
      return { invalidMonths: true };
    }
    
    return null;
  }

  dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const startDate = group.get('startDate')?.value;
    const endDate = group.get('endDate')?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return { dateRange: true };
      }
    }
    
    return null;
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormValidation();
  }

  ngAfterViewInit(): void {
    document.addEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('keydown', this.handleKeyboardShortcut.bind(this));
  }

  private loadInitialData(): void {
    this.loadStatistics();
    this.loadTeachers();
    this.loadAvailableTeachers();
  }

  private setupFormValidation(): void {
    // Contract type validation
    this.createTeacherForm.get('contractType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.updateContractValidation(this.createTeacherForm, type);
      });

    this.editTeacherForm.get('contractType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.updateContractValidation(this.editTeacherForm, type);
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
    return this.teacherFinancialService.getCurrentAcademicYear();
  }

  // Month selection methods
  isMonthSelected(month: number): boolean {
    const selectedMonths = this.createTeacherForm.get('contractMonths')?.value || [];
    return selectedMonths.includes(month);
  }

  onMonthToggle(month: number, event: any): void {
    const selectedMonths = [...(this.createTeacherForm.get('contractMonths')?.value || [])];
    
    if (event.target.checked) {
      if (!selectedMonths.includes(month)) {
        selectedMonths.push(month);
      }
    } else {
      const index = selectedMonths.indexOf(month);
      if (index > -1) {
        selectedMonths.splice(index, 1);
      }
    }
    
    this.createTeacherForm.patchValue({
      contractMonths: this.teacherFinancialService.sortContractMonths(selectedMonths)
    });
  }

  onMonthSelectionChange(selectedMonths: number[]): void {
    this.createTeacherForm.patchValue({
      contractMonths: this.teacherFinancialService.sortContractMonths(selectedMonths)
    });
  }

  applyContractPreset(preset: ContractPreset): void {
    this.createTeacherForm.patchValue({
      contractMonths: preset.months
    });
  }

  selectAllMonths(): void {
    const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    this.createTeacherForm.patchValue({
      contractMonths: allMonths
    });
  }

  clearAllMonths(): void {
    this.createTeacherForm.patchValue({
      contractMonths: []
    });
  }

  selectSchoolYearMonths(): void {
    const schoolYearMonths = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]; // Sep to Jun
    this.createTeacherForm.patchValue({
      contractMonths: schoolYearMonths
    });
  }

  // Display helper methods
  getSelectedMonthsCount(): number {
    const selectedMonths = this.createTeacherForm.get('contractMonths')?.value || [];
    return selectedMonths.length;
  }

  getSelectedMonthsDisplay(): string {
    const selectedMonths = this.createTeacherForm.get('contractMonths')?.value || [];
    return this.teacherFinancialService.formatContractPeriod(selectedMonths);
  }

  getSelectedMonthsInOrder(): number[] {
    const selectedMonths = this.createTeacherForm.get('contractMonths')?.value || [];
    return this.teacherFinancialService.getContractMonthsInAcademicOrder(selectedMonths);
  }

  getMonthShortName(month: number): string {
    return this.teacherFinancialService.getMonthShortName(month);
  }

  getFirstSemesterMonths(): MonthOption[] {
    return this.academicMonths.slice(0, 6); // Sep to Feb
  }

  getSecondSemesterMonths(): MonthOption[] {
    return this.academicMonths.slice(6); // Mar to Aug
  }

  getContractDateRange(): string {
    const startDate = this.createTeacherForm.get('startDate')?.value;
    const endDate = this.createTeacherForm.get('endDate')?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate).toLocaleDateString();
      const end = new Date(endDate).toLocaleDateString();
      return `${start} to ${end}`;
    }
    
    return 'Not specified';
  }

  // Data loading methods
  loadStatistics(): void {
    const filters = { academicYear: this.selectedYear };
    
    this.teacherFinancialService.getPaymentStatistics(filters).subscribe({
      next: (response) => {
        this.statistics = response.statistics;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
        this.showNotification('Error loading statistics', 'error');
      }
    });
  }

  loadTeachers(): void {
    this.isLoading = true;
    
    this.teacherFinancialService.getAllTeachersFinancialFormatted().subscribe({
      next: (response) => {
        this.teachers = response.teachers;
        this.filterTeachers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading teachers:', error);
        this.showNotification('Error loading teachers', 'error');
        this.isLoading = false;
      }
    });
  }

  loadAvailableTeachers(): void {
    this.userService.getAllUsers({ role: 'teacher' }).subscribe({
      next: (response: any) => {
        const teacherIds = this.teachers.map(t => t.teacherInfo._id);
        this.availableTeachers = response.users.filter(
          (user: User) => !teacherIds.includes(user._id)
        );
      },
      error: (error) => {
        console.error('Error loading available teachers:', error);
        this.showNotification('Error loading available teachers', 'error');
      }
    });
  }

  // Filter methods
  filterTeachers(): void {
    let filtered = [...this.teachers];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(teacher => 
        teacher.teacherInfo.name.toLowerCase().includes(query) ||
        teacher.teacherInfo.email.toLowerCase().includes(query)
      );
    }

    if (this.filterContract !== 'all') {
      filtered = filtered.filter(teacher => teacher.contractType === this.filterContract);
    }

    this.filteredTeachers = filtered;
  }

  setContractFilter(filter: string): void {
    this.filterContract = filter;
    this.filterTeachers();
  }

  sortTeachers(): void {
    this.filteredTeachers.sort((a, b) => {
      return a.teacherInfo.name.localeCompare(b.teacherInfo.name);
    });
  }

  // Navigation methods
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    if (tab === 'teachers') {
      this.loadTeachers();
    }
  }

  viewTeacherDetails(teacher: TeacherFinancialDisplay): void {
    this.selectedTeacher = teacher;
    this.activeTab = 'teacher-detail';
    this.loadTeacherDossiers(teacher.teacherInfo._id);
  }

  loadTeacherDossiers(teacherId: string): void {
    const filters = {
      academicYear: this.selectedYear
    };

    this.isLoading = true;
    
    this.teacherFinancialService.getTeacherPaymentDossiers(teacherId, filters).subscribe({
      next: (dossiers: TeacherPaymentDossier[]) => {
        this.teacherDossiers = dossiers.map(dossier => ({
          _id: dossier._id,
          teacherInfo: {
            _id: teacherId,
            name: this.selectedTeacher?.teacherInfo.name || '',
            email: this.selectedTeacher?.teacherInfo.email || ''
          },
          financialInfo: {
            contractType: this.selectedTeacher?.contractType || 'monthly',
            monthlySalary: this.selectedTeacher?.monthlySalary,
            hourlyRate: this.selectedTeacher?.hourlyRate
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
        console.error('Error loading teacher dossiers:', error);
        this.showNotification('Error loading payment records', 'error');
        this.isLoading = false;
      }
    });
  }

  selectAcademicYear(year: string): void {
    this.selectedYear = year;
    if (this.selectedTeacher) {
      this.loadTeacherDossiers(this.selectedTeacher.teacherInfo._id);
    }
    this.loadStatistics();
  }

  // CRUD Operations
  createTeacher(): void {
    if (this.createTeacherForm.valid) {
      this.isLoading = true;
      const formData = this.createTeacherForm.value;

      // Validate using service
      const validationErrors = this.teacherFinancialService.validateContractForm(formData);
      
      if (this.teacherFinancialService.hasValidationErrors(validationErrors)) {
        this.displayValidationErrors(validationErrors);
        this.isLoading = false;
        return;
      }

      const request: CreateTeacherFinancialRequest = {
        teacherId: formData.teacherId,
        contractType: formData.contractType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        contractMonths: formData.contractMonths,
        monthlySalary: formData.monthlySalary,
        hourlyRate: formData.hourlyRate,
        contractualHoursPerMonth: formData.contractualHoursPerMonth
      };

      this.teacherFinancialService.createTeacherFinancialInfo(request).subscribe({
        next: (response) => {
          this.showNotification(`Contract created successfully! ${response.dossiersCreated} payment dossiers generated for ${response.contractDuration}.`, 'success');
          this.resetForm();
          this.loadTeachers();
          this.loadAvailableTeachers();
          
          setTimeout(() => {
            const newTeacher = this.teachers.find(t => t.teacherInfo._id === formData.teacherId);
            if (newTeacher) {
              this.viewTeacherDetails(newTeacher);
            }
          }, 500);
          
          this.isLoading = false;
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error creating teacher', 'error');
          this.isLoading = false;
        }
      });
    } else {
      this.markFormGroupTouched(this.createTeacherForm);
    }
  }

  editTeacher(teacher: TeacherFinancialDisplay): void {
    this.selectedTeacher = teacher;
    this.editTeacherForm.patchValue({
      contractType: teacher.contractType,
      monthlySalary: teacher.monthlySalary,
      hourlyRate: teacher.hourlyRate,
      contractualHoursPerMonth: teacher.contractualHoursPerMonth,
      endDate: teacher.endDate ? new Date(teacher.endDate).toISOString().split('T')[0] : '',
      contractMonths: teacher.contractMonths || [],
      isActive: teacher.isActive
    });
    this.showEditModal = true;
  }

  updateTeacher(): void {
    if (this.editTeacherForm.valid && this.selectedTeacher) {
      const formData = this.editTeacherForm.value;

      const request: UpdateTeacherFinancialRequest = {
        contractType: formData.contractType,
        monthlySalary: formData.monthlySalary,
        hourlyRate: formData.hourlyRate,
        contractualHoursPerMonth: formData.contractualHoursPerMonth,
        endDate: formData.endDate,
        contractMonths: formData.contractMonths,
        isActive: formData.isActive
      };

      this.teacherFinancialService.updateTeacherFinancialInfo(
        this.selectedTeacher.teacherInfo._id,
        request
      ).subscribe({
        next: () => {
          this.showNotification('Teacher updated successfully', 'success');
          this.closeModal();
          this.loadTeachers();
          this.loadStatistics();
          
          if (this.activeTab === 'teacher-detail' && this.selectedTeacher) {
            const updatedTeacher = this.teachers.find(t => t.teacherInfo._id === this.selectedTeacher!.teacherInfo._id);
            if (updatedTeacher) {
              this.selectedTeacher = updatedTeacher;
              this.loadTeacherDossiers(updatedTeacher.teacherInfo._id);
            }
          }
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error updating teacher', 'error');
        }
      });
    }
  }

  deleteTeacher(teacher: TeacherFinancialDisplay): void {
    this.teacherToDelete = teacher;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.teacherToDelete) {
      this.teacherFinancialService.deleteTeacherFinancialInfo(
        this.teacherToDelete.teacherInfo._id
      ).subscribe({
        next: () => {
          this.showNotification('Teacher deleted successfully', 'success');
          this.closeModal();
          this.loadTeachers();
          this.loadStatistics();
          this.loadAvailableTeachers();
          this.setActiveTab('teachers');
        },
        error: (error) => {
          this.showNotification(error.error?.message || 'Error deleting teacher', 'error');
        }
      });
    }
  }

  // Payment Dossier Operations
  editDossier(dossier: PaymentDossierDisplay): void {
    this.selectedDossier = dossier;
    this.editDossierForm.patchValue({
      hoursWorked: dossier.hoursWorked,
      finalAmount: dossier.finalAmount,
      status: dossier.status,
      notes: dossier.notes
    });
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

      this.teacherFinancialService.updatePaymentDossier(
        this.selectedDossier._id,
        request
      ).subscribe({
        next: () => {
          this.showNotification('Payment record updated successfully', 'success');
          this.closeModal();
          if (this.selectedTeacher) {
            this.loadTeacherDossiers(this.selectedTeacher.teacherInfo._id);
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
      return;
    }

    const request: UpdatePaymentDossierRequest = {
      status: 'paid',
      paymentDate: new Date().toISOString()
    };

    this.teacherFinancialService.updatePaymentDossier(dossier._id, request).subscribe({
      next: () => {
        this.showNotification('Payment marked as paid successfully', 'success');
        if (this.selectedTeacher) {
          this.loadTeacherDossiers(this.selectedTeacher.teacherInfo._id);
        }
        this.loadStatistics();
      },
      error: (error) => {
        this.showNotification(error.error?.message || 'Error updating payment status', 'error');
      }
    });
  }

  markAllPaid(): void {
    if (!this.selectedTeacher || !this.hasUnpaidDossiers()) {
      return;
    }

    if (confirm(`Mark all unpaid records as paid for ${this.selectedTeacher.teacherInfo.name} (${this.selectedYear})?`)) {
      const unpaidDossiers = this.teacherDossiers.filter(d => d.status !== 'paid');
      
      if (unpaidDossiers.length === 0) {
        this.showNotification('No unpaid records found', 'info');
        return;
      }

      this.isLoading = true;
      
      Promise.all(
        unpaidDossiers.map(dossier => 
          this.teacherFinancialService.updatePaymentDossier(dossier._id, {
            status: 'paid',
            paymentDate: new Date().toISOString()
          }).toPromise()
        )
      ).then(() => {
        this.showNotification(`${unpaidDossiers.length} payments marked as paid`, 'success');
        this.loadTeacherDossiers(this.selectedTeacher!.teacherInfo._id);
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
    return this.teacherDossiers.some(d => d.status !== 'paid');
  }

  // Utility methods
  formatCurrency(amount: number | undefined): string {
    if (amount === undefined || amount === null) {
      return 'N/A';
    }
    return this.teacherFinancialService.formatCurrency(amount);
  }

  getMonthName(month: number): string {
    return this.teacherFinancialService.getAcademicMonthName(month);
  }

  getStatusLabel(status: string): string {
    return this.teacherFinancialService.getStatusLabel(status as 'unpaid' | 'paid' | 'partial');
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
    if (!this.teacherDossiers || this.teacherDossiers.length === 0) return 0;
    
    switch (type) {
      case 'calculated':
        return this.teacherDossiers.reduce((sum, d) => sum + (d.finalAmount || 0), 0);
      case 'paid':
        return this.teacherDossiers
          .filter(d => d.status === 'paid')
          .reduce((sum, d) => sum + (d.finalAmount || 0), 0);
      case 'pending':
        return this.teacherDossiers
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
    this.createTeacherForm.reset();
    this.createTeacherForm.patchValue({
      startDate: new Date().toISOString().split('T')[0],
      contractType: 'monthly',
      contractMonths: []
    });
  }

  private displayValidationErrors(errors: ContractValidationErrors): void {
    Object.keys(errors).forEach(key => {
      const control = this.createTeacherForm.get(key);
      if (control) {
        control.setErrors({ serverError: errors[key as keyof ContractValidationErrors] });
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Search functionality
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.filterTeachers();
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
      if (field.errors['email']) {
        return 'Please enter a valid email';
      }
      if (field.errors['dateRange']) {
        return 'End date must be after start date';
      }
      if (field.errors['invalidMonths']) {
        return 'Invalid month selection';
      }
      if (field.errors['serverError']) {
        return field.errors['serverError'];
      }
    }
    return '';
  }

  // Data refresh
  refreshAllData(): void {
    this.isLoading = true;
    this.loadStatistics();
    this.loadTeachers();
    this.loadAvailableTeachers();
    
    setTimeout(() => {
      this.isLoading = false;
      this.showNotification('Data refreshed successfully', 'success');
    }, 1000);
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): void {
    console.error('Error:', error);
    const message = error.error?.message || error.message || defaultMessage;
    this.showNotification(message, 'error');
  }

  // Loading state management
  setLoading(loading: boolean): void {
    this.isLoading = loading;
  }

  // Confirmation dialogs
  confirmAction(message: string, callback: () => void): void {
    if (confirm(message)) {
      callback();
    }
  }

  // Data validation
  validateTeacherData(teacher: TeacherFinancialDisplay): boolean {
    if (!teacher.teacherInfo?.name || !teacher.teacherInfo?.email) {
      return false;
    }
    
    if (teacher.contractType === 'monthly' && (!teacher.monthlySalary || teacher.monthlySalary <= 0)) {
      return false;
    }
    
    if (teacher.contractType === 'hourly' && 
        ((!teacher.hourlyRate || teacher.hourlyRate <= 0) || 
         (!teacher.contractualHoursPerMonth || teacher.contractualHoursPerMonth <= 0))) {
      return false;
    }
    
    return true;
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
  getAriaLabel(teacher: TeacherFinancialDisplay): string {
    return `Teacher ${teacher.teacherInfo.name}, ${teacher.contractType} contract, ${teacher.isActive ? 'active' : 'inactive'}`;
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