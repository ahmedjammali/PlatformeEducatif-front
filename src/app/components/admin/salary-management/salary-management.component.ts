import { Component, OnInit } from '@angular/core';
import { SalaryService } from '../../../services/salary.service';
import { User } from '../../../models/user.model';
import {
  SalaryConfiguration,
  TeacherAdminSalary,
  SalarySummary,
  SalaryPayment,
  CreateSalaryConfigurationRequest
} from '../../../models/salary.model';
import { ToasterService } from '../../../services/toaster.service';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-salary-management',
  templateUrl: './salary-management.component.html',
  styleUrls: ['./salary-management.component.css']
})
export class SalaryManagementComponent implements OnInit {
  // Data properties
  users: User[] = [];
  configurations: SalaryConfiguration[] = [];
  salaryRecords: TeacherAdminSalary[] = [];
  salarySummary: SalarySummary | null = null;

  // Filter properties
  searchTerm: string = '';
  selectedRole: string = '';
  selectedConfigStatus: string = '';
  selectedAcademicYear: string = '2025-2026';

  // Modal states
  showCreateConfigModal: boolean = false;
  showPaymentModal: boolean = false;
  showExtraHoursModal: boolean = false;
  showDeleteConfirmModal: boolean = false;
  showConfigDetailsModal: boolean = false;
  showUserDetailsModal: boolean = false;
  showReceiptPreviewModal: boolean = false;

  // Loading states
  loading: boolean = false;
  loadingUsers: boolean = false;
  loadingConfigurations: boolean = false;

  // UI states
  expandedUser: string | null = null;
  configurationToDelete: string | null = null;
  selectedConfiguration: SalaryConfiguration | null = null;
  selectedUser: User | null = null;
  selectedUserForDetails: User | null = null;
  selectedSalaryRecord: TeacherAdminSalary | null = null;

  // Create configuration form
  createConfigForm = {
    userId: '',
    academicYear: this.selectedAcademicYear, // Use current selected academic year
    paymentType: 'monthly' as 'monthly' | 'hourly',
    baseSalary: 0,
    hourlyRate: 0,
    allowExtraHours: false,
    extraHourlyRate: 0,
    paymentCalendar: {
      startMonth: 9, // September
      endMonth: 6,   // June
    }
  };

  // Extra hours form
  extraHoursForm = {
    month: 1,
    extraHours: 0
  };

  // Payment form
  paymentForm = {
    month: 1,
    paidAmount: 0,
    actualHoursWorked: 0,
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'check' | 'digital_wallet',
    paymentDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
    paymentReference: '',
    notes: ''
  };

  // Month names for display
  monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Print data for receipt
  selectedPrintData: { record: TeacherAdminSalary, payment: any, year: string } | null = null;

  constructor(
    private salaryService: SalaryService,
    private toasterService: ToasterService
  ) { }

  ngOnInit(): void {
    // Ensure the create form uses the current selected academic year
    this.createConfigForm.academicYear = this.selectedAcademicYear;
    this.loadData();
  }

  // Data loading methods
  loadData(): void {
    this.loadUsers();
    this.loadConfigurations();
    this.loadSalaryRecords();
    this.loadSalarySummary();
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.salaryService.getTeachersAndAdmins().subscribe({
      next: (users) => {
        this.users = users;
        this.loadingUsers = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toasterService.error('Erreur lors du chargement des utilisateurs');
        this.loadingUsers = false;
      }
    });
  }

  loadConfigurations(): void {
    this.loadingConfigurations = true;
    this.salaryService.getSalaryConfigurations(this.selectedAcademicYear).subscribe({
      next: (configurations) => {
        this.configurations = configurations;
        this.loadingConfigurations = false;
      },
      error: (error) => {
        console.error('Error loading configurations:', error);
        this.toasterService.error('Erreur lors du chargement des configurations');
        this.loadingConfigurations = false;
      }
    });
  }
loadSalaryRecords(): void {
  this.loading = true;
  this.salaryService.getSalaryRecords(this.selectedAcademicYear).subscribe({
    next: (records) => {
      this.salaryRecords = records;
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading salary records:', error);
      this.toasterService.error('Erreur lors du chargement des salaires');
      this.loading = false;
    }
  });
}

  loadSalarySummary(): void {
    this.salaryService.getSalarySummary(this.selectedAcademicYear).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
      },
      error: (error) => {
        console.error('Error loading salary summary:', error);
      }
    });
  }

  // Filter methods
  get filteredUsers(): User[] {
    return this.users.filter(user => {
      const matchesSearch = !this.searchTerm ||
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = !this.selectedRole || user.role === this.selectedRole;

      const hasConfig = this.hasConfiguration(user._id!);
      const matchesConfigStatus = !this.selectedConfigStatus ||
        (this.selectedConfigStatus === 'hasConfig' && hasConfig) ||
        (this.selectedConfigStatus === 'noConfig' && !hasConfig);

      return matchesSearch && matchesRole && matchesConfigStatus;
    });
  }

  get filteredSalaryRecords(): TeacherAdminSalary[] {
    return this.salaryRecords.filter(record => {
      const user = record.user as User;
      const matchesSearch = !this.searchTerm ||
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesSearch;
    });
  }

  onSearchChange(): void {
    // Search is handled by getters
  }

  onFilterChange(): void {
    // Filters are handled by getters
  }

  onAcademicYearChange(): void {
    // Update the create form to use the newly selected academic year
    this.createConfigForm.academicYear = this.selectedAcademicYear;

    this.loadConfigurations();
    this.loadSalaryRecords();
    this.loadSalarySummary();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedConfigStatus = '';
  }

  // Configuration methods
  openCreateConfigModal(user?: User): void {
    if (user) {
      this.selectedUser = user;
      this.createConfigForm.userId = user._id || '';
    }
    // Ensure the form uses the currently selected academic year
    this.createConfigForm.academicYear = this.selectedAcademicYear;
    this.initializePaymentCalendar();
    this.showCreateConfigModal = true;
  }

  closeCreateConfigModal(): void {
    this.showCreateConfigModal = false;
    this.selectedUser = null;
    this.resetCreateConfigForm();
  }

  initializePaymentCalendar(): void {
    // Reset to default month range (September to June - typical academic year)
    this.createConfigForm.paymentCalendar = {
      startMonth: 9, // September
      endMonth: 6,   // June
    };
  }

  onPaymentTypeChange(): void {
    this.initializePaymentCalendar();
  }

  resetCreateConfigForm(): void {
    this.createConfigForm = {
      userId: '',
      academicYear: this.selectedAcademicYear, // Use current selected academic year
      paymentType: 'monthly',
      baseSalary: 0,
      hourlyRate: 0,
      allowExtraHours: false,
      extraHourlyRate: 0,
      paymentCalendar: {
        startMonth: 9,
        endMonth: 6,
      }
    };
  }

  createConfiguration(): void {
    if (!this.validateCreateConfigForm()) {
      return;
    }

    this.loading = true;
    const request: CreateSalaryConfigurationRequest = { ...this.createConfigForm };

    this.salaryService.createSalaryConfiguration(request).subscribe({
      next: (response) => {
        this.toasterService.success('Configuration créée avec succès');
        this.closeCreateConfigModal();
        this.loadData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating configuration:', error);
        this.toasterService.error('Erreur lors de la création de la configuration');
        this.loading = false;
      }
    });
  }

  validateCreateConfigForm(): boolean {
    if (!this.createConfigForm.userId) {
      this.toasterService.error('Veuillez sélectionner un utilisateur');
      return false;
    }

    if (this.createConfigForm.paymentType === 'monthly' && !this.createConfigForm.baseSalary) {
      this.toasterService.error('Veuillez saisir le salaire de base');
      return false;
    }

    if (this.createConfigForm.paymentType === 'hourly' && !this.createConfigForm.hourlyRate) {
      this.toasterService.error('Veuillez saisir le taux horaire');
      return false;
    }

    if (this.createConfigForm.allowExtraHours && !this.createConfigForm.extraHourlyRate) {
      this.toasterService.error('Veuillez saisir le taux horaire supplémentaire');
      return false;
    }

    return true;
  }

openPaymentModal(record: TeacherAdminSalary, month: number): void {
  // Find the latest version of this record from the salaryRecords array
  const latestRecord = this.salaryRecords.find(r => r._id === record._id);
  
  // Use the latest record if found, otherwise use the passed record
  this.selectedSalaryRecord = latestRecord || record;
  this.paymentForm.month = month;

  const payment = this.selectedSalaryRecord.paymentSchedule.find(p => p.month === month);
  if (payment) {
    // Set the actual hours worked (default to regular hours if not set)
    this.paymentForm.actualHoursWorked = payment.actualHoursWorked || payment.regularHours || 0;

    // For hourly payments, calculate amount based on hours including extras
    if (payment.paymentType === 'hourly') {
      // Use getCurrentTotalAmount which should calculate correctly
      const totalAmount = this.getCurrentTotalAmount(payment);
      
      if (payment.paymentStatus === 'partial') {
        this.paymentForm.paidAmount = totalAmount - (payment.paidAmount || 0);
      } else {
        this.paymentForm.paidAmount = totalAmount;
      }
    } else {
      // For fixed payments
      if (payment.paymentStatus === 'partial') {
        this.paymentForm.paidAmount = payment.totalAmount - (payment.paidAmount || 0);
      } else {
        this.paymentForm.paidAmount = payment.totalAmount;
      }
    }
  }

  this.showPaymentModal = true;
}
  
  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedSalaryRecord = null;
    this.resetPaymentForm();
  }

  resetPaymentForm(): void {
    this.paymentForm = {
      month: 1,
      paidAmount: 0,
      actualHoursWorked: 0,
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0], // Reset to current date
      paymentReference: '',
      notes: ''
    };
  }

  // Auto-calculate payment amount when hours change
  onHoursChange(): void {
    if (!this.selectedSalaryRecord) return;

    const payment = this.getPaymentForMonth(this.selectedSalaryRecord, this.paymentForm.month);
    if (!payment || payment.paymentType !== 'hourly') return;

    // Ensure hours is a valid number
    const hoursWorked = Math.max(0, Number(this.paymentForm.actualHoursWorked) || 0);
    this.paymentForm.actualHoursWorked = hoursWorked;

    // Calculate new total amount based on hours worked AND extra hours
    const newTotalAmount = this.getCurrentTotalAmount(payment);

    // Update the payment object's totalAmount and actualHoursWorked to reflect new calculation
    payment.totalAmount = newTotalAmount;
    payment.actualHoursWorked = hoursWorked;

    // For partial payments, calculate remaining amount to pay
    if (payment.paymentStatus === 'partial') {
      const alreadyPaid = payment.paidAmount || 0;
      this.paymentForm.paidAmount = Math.max(0, newTotalAmount - alreadyPaid);
    } else {
      // For pending payments, set to full calculated amount (including extra hours)
      this.paymentForm.paidAmount = newTotalAmount;
    }

    // Force change detection to update the UI
    this.updatePaymentCalculations();
  }

  // Handle hours change directly on the payment card
  onCardHoursChange(record: TeacherAdminSalary, payment: any, event: any): void {
    const hoursWorked = Math.max(0, Number(event.target.value) || 0);

    // Update the payment object
    payment.actualHoursWorked = hoursWorked;

    // Calculate new total amount for hourly payments including extra hours
    if (payment.paymentType === 'hourly') {
      const newTotalAmount = this.calculateTotalForHoursCard(payment, hoursWorked);
      payment.totalAmount = newTotalAmount;

      // Update payment status based on new total
      this.updatePaymentStatus(payment);
    }

    // Trigger UI update
    this.updatePaymentCalculations();
  }

  // Handle extra hours change directly on the payment card
  onCardExtraHoursChange(record: TeacherAdminSalary, payment: any, event: any): void {
    const extraHours = Math.max(0, Number(event.target.value) || 0);

    // Update the payment object
    payment.extraHours = extraHours;

    // Recalculate total amount
    if (payment.paymentType === 'hourly') {
      const actualHours = payment.actualHoursWorked || payment.regularHours || 0;
      const newTotalAmount = this.calculateTotalForHoursCard(payment, actualHours);
      payment.totalAmount = newTotalAmount;
    } else {
      // For monthly payments, recalculate total
      const baseSalary = payment.baseSalaryAmount || 0;
      const extraHourlyRate = this.getEffectiveExtraHourlyRate(payment);
      const extraAmount = extraHours * extraHourlyRate;
      payment.totalAmount = baseSalary + extraAmount;
      payment.extraAmount = extraAmount;
    }

    // Update payment status based on new total
    this.updatePaymentStatus(payment);

    // Trigger UI update
    this.updatePaymentCalculations();
  }

saveHoursForPayment(record: TeacherAdminSalary, payment: any): void {
  if (!record || !payment) {
    this.toasterService.error('Impossible de sauvegarder: données manquantes');
    return;
  }

  const userId = typeof record.user === 'string' ? record.user : (record.user as any)?._id;

  if (!userId) {
    this.toasterService.error('Impossible de sauvegarder: utilisateur non identifié');
    return;
  }

  const hoursData = {
    userId: userId,
    month: payment.month,
    actualHoursWorked: payment.actualHoursWorked || payment.regularHours || 0,
    extraHours: payment.extraHours || 0
  };

  this.loading = true;
  this.salaryService.updatePaymentHours(hoursData).subscribe({
    next: (response: any) => {
      this.toasterService.success('Heures sauvegardées avec succès');
      
      // CRITICAL: Reload salary records to get updated totals from backend
      this.loadSalaryRecords();
      
      // Also reload summary to update dashboard cards
      this.loadSalarySummary();
    },
    error: (error: any) => {
      console.error('Erreur lors de la sauvegarde des heures:', error);
      this.toasterService.error('Erreur lors de la sauvegarde des heures');
      this.loading = false;
    }
  });
}
calculateTotalForHoursCard(payment: any, hoursWorked: number): number {
  if (!payment || payment.paymentType !== 'hourly' || hoursWorked < 0) return 0;

  const hourlyRate = Math.max(0, payment.hourlyRate || 0);
  const extraHours = Math.max(0, payment.extraHours || 0);

  // All hours worked are paid at the same rate
  const workedPayment = hoursWorked * hourlyRate;

  // Calculate separate extra hours payment (bonus hours)
  let extraPayment = 0;
  if (payment.extraHourlyRate && payment.extraHourlyRate > 0) {
    extraPayment = extraHours * payment.extraHourlyRate;
  }

  return workedPayment + extraPayment;
}

  updatePaymentStatus(payment: any): void {
    if (!payment) return;

    const totalAmount = payment.totalAmount || 0;
    const paidAmount = payment.paidAmount || 0;

    if (paidAmount === 0) {
      payment.paymentStatus = 'pending';
    } else if (paidAmount < totalAmount) {
      payment.paymentStatus = 'partial';
    } else {
      payment.paymentStatus = 'paid';
    }
  }

  // Force UI updates for payment calculations
  private updatePaymentCalculations(): void {
    // This method ensures the UI reflects the updated calculations
    // by triggering change detection and updating related displays
    if (this.selectedSalaryRecord && this.paymentForm.month) {
      // Force Angular change detection by updating a reference
      this.selectedSalaryRecord = { ...this.selectedSalaryRecord };
    }
  }

  // Calculate total amount for given hours (including extras if applicable)
  calculateTotalForHours(hoursWorked: number): number {
    if (!this.selectedSalaryRecord || hoursWorked < 0) return 0;

    const payment = this.getPaymentForMonth(this.selectedSalaryRecord, this.paymentForm.month);
    if (!payment || payment.paymentType !== 'hourly') return 0;

    const regularHours = Math.max(0, payment.regularHours || 0);
    const hourlyRate = Math.max(0, payment.hourlyRate || 0);

    // Determine effective extra hourly rate
    let extraHourlyRate = hourlyRate; // Default to regular rate
    if (payment.extraHourlyRate !== undefined && payment.extraHourlyRate !== null) {
      extraHourlyRate = Math.max(0, payment.extraHourlyRate);
    }

    // Calculate based on regular vs extra hours
    if (hoursWorked <= regularHours) {
      // Only regular hours worked
      return hoursWorked * hourlyRate;
    } else {
      // Regular hours + extra hours
      const extraHours = hoursWorked - regularHours;
      const regularPayment = regularHours * hourlyRate;
      const extraPayment = extraHours * extraHourlyRate;
      return regularPayment + extraPayment;
    }
  }

  // Helper method to get the effective extra hourly rate
  getEffectiveExtraHourlyRate(payment: any): number {
    if (!payment) return 0;

    // If extraHourlyRate is defined and not null, use it; otherwise use regular hourly rate
    return (payment.extraHourlyRate !== undefined && payment.extraHourlyRate !== null)
      ? payment.extraHourlyRate
      : (payment.hourlyRate || 0);
  }
getCurrentTotalAmount(payment: any): number {
  if (!payment) return 0;

  if (payment.paymentType === 'hourly') {
    // Get the actual hours worked (from the payment object itself)
    const currentHours = Math.max(0, payment.actualHoursWorked || payment.regularHours || 0);
    const hourlyRate = Math.max(0, payment.hourlyRate || 0);
    
    // Calculate base amount from ALL hours worked at regular rate
    const baseAmount = currentHours * hourlyRate;

    // Add extra hours amount (independent extra hours)
    const extraHours = Math.max(0, payment.extraHours || 0);
    const extraHourlyRate = payment.extraHourlyRate || 0;
    const extraAmount = extraHours * extraHourlyRate;

    return baseAmount + extraAmount;
  } else {
    // For monthly payments
    const baseSalary = Math.max(0, payment.baseSalaryAmount || 0);
    const extraHours = Math.max(0, payment.extraHours || 0);
    const extraHourlyRate = payment.extraHourlyRate || 0;
    const extraAmount = extraHours * extraHourlyRate;

    return baseSalary + extraAmount;
  }
}

  // Helper method to get calculation breakdown details
  getCalculationBreakdown(payment: any, hoursWorked: number): any {
    if (!payment || payment.paymentType !== 'hourly' || hoursWorked <= 0) {
      return null;
    }

    const regularHours = Math.max(0, payment.regularHours || 0);
    const hourlyRate = Math.max(0, payment.hourlyRate || 0);
    const extraHourlyRate = this.getEffectiveExtraHourlyRate(payment);

    if (hoursWorked <= regularHours) {
      // Only regular hours
      return {
        type: 'regular_only',
        regularHours: hoursWorked,
        regularRate: hourlyRate,
        regularAmount: hoursWorked * hourlyRate,
        extraHours: 0,
        extraRate: 0,
        extraAmount: 0,
        total: hoursWorked * hourlyRate
      };
    } else {
      // Regular + extra hours
      const extraHours = hoursWorked - regularHours;
      const regularAmount = regularHours * hourlyRate;
      const extraAmount = extraHours * extraHourlyRate;

      return {
        type: 'regular_plus_extra',
        regularHours: regularHours,
        regularRate: hourlyRate,
        regularAmount: regularAmount,
        extraHours: extraHours,
        extraRate: extraHourlyRate,
        extraAmount: extraAmount,
        total: regularAmount + extraAmount
      };
    }
  }

  recordPayment(): void {
    if (!this.selectedSalaryRecord || !this.paymentForm.paidAmount) {
      this.toasterService.error('Veuillez saisir le montant payé');
      return;
    }

    this.loading = true;
    this.salaryService.recordPayment(this.selectedSalaryRecord._id!, this.paymentForm).subscribe({
      next: (response) => {
        this.toasterService.success('Paiement enregistré avec succès');
        this.closePaymentModal();
        this.loadSalaryRecords();
        this.loadSalarySummary();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error recording payment:', error);
        this.toasterService.error('Erreur lors de l\'enregistrement du paiement');
        this.loading = false;
      }
    });
  }

  // Extra hours methods
  openExtraHoursModal(record: TeacherAdminSalary, month: number): void {
    this.selectedSalaryRecord = record;
    this.extraHoursForm.month = month;

    const payment = record.paymentSchedule.find(p => p.month === month);
    if (payment) {
      this.extraHoursForm.extraHours = payment.extraHours;
    }

    this.showExtraHoursModal = true;
  }

  closeExtraHoursModal(): void {
    this.showExtraHoursModal = false;
    this.selectedSalaryRecord = null;
    this.resetExtraHoursForm();
  }

  resetExtraHoursForm(): void {
    this.extraHoursForm = {
      month: 1,
      extraHours: 0
    };
  }

  updateExtraHours(): void {
    if (!this.selectedSalaryRecord) {
      return;
    }

    this.loading = true;
    this.salaryService.updateExtraHours(this.selectedSalaryRecord._id!, this.extraHoursForm).subscribe({
      next: (response) => {
        this.toasterService.success('Heures supplémentaires mises à jour');
        this.closeExtraHoursModal();
        this.loadSalaryRecords();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating extra hours:', error);
        this.toasterService.error('Erreur lors de la mise à jour des heures supplémentaires');
        this.loading = false;
      }
    });
  }

  // Helper methods
  getUserName(user: User | string): string {
    if (typeof user === 'string') {
      const foundUser = this.users.find(u => u._id === user);
      return foundUser ? foundUser.name : 'Utilisateur inconnu';
    }
    return user.name;
  }

  getUserRole(user: User | string): string {
    if (typeof user === 'string') {
      const foundUser = this.users.find(u => u._id === user);
      return foundUser ? foundUser.role : '';
    }
    return user.role;
  }

  getRoleDisplay(role: string): string {
    const roleMap: { [key: string]: string } = {
      'teacher': 'Enseignant',
      'admin': 'Admin',
      'student': 'Étudiant',
      'superadmin': 'Super Administrateur'
    };
    return roleMap[role] || role;
  }

  getRoleLabel(role: string): string {
    return this.getRoleDisplay(role);
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
      '#00D2D3', '#FF9F43', '#10AC84', '#EE5A24'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getSubjectsArray(subjects: any): any[] {
    if (Array.isArray(subjects)) {
      return subjects;
    }
    if (subjects && typeof subjects === 'object') {
      return Object.values(subjects);
    }
    return [];
  }

  getSubjectName(subject: any): string {
    if (typeof subject === 'string') {
      return subject;
    }
    if (subject && subject.name) {
      return subject.name;
    }
    if (subject && subject.subjectName) {
      return subject.subjectName;
    }
    return 'Matière inconnue';
  }

  getStatusDisplay(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'Actif',
      'completed': 'Terminé',
      'suspended': 'Suspendu',
      'cancelled': 'Annulé',
      'pending': 'En attente',
      'paid': 'Payé',
      'overdue': 'En retard'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'status-active',
      'completed': 'status-completed',
      'suspended': 'status-suspended',
      'cancelled': 'status-cancelled',
      'pending': 'status-pending',
      'paid': 'status-paid',
      'overdue': 'status-overdue'
    };
    return statusClasses[status] || 'status-default';
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(0)} DT`;
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR');
  }

  hasConfiguration(userId: string): boolean {
    return this.configurations.some(config =>
      (typeof config.user === 'string' ? config.user : config.user._id) === userId
    );
  }

  // Helper methods for template type safety
  getSalaryConfiguration(record: TeacherAdminSalary): SalaryConfiguration | null {
    if (typeof record.salaryConfiguration === 'string') {
      return this.configurations.find(config => config._id === record.salaryConfiguration) || null;
    }
    return record.salaryConfiguration;
  }

  getPaymentType(record: TeacherAdminSalary): string {
    const config = this.getSalaryConfiguration(record);
    return config ? config.paymentType : '';
  }

  getPaymentTypeDisplay(record: TeacherAdminSalary): string {
    const paymentType = this.getPaymentType(record);
    return paymentType === 'monthly' ? 'Mensuel' : 'Horaire';
  }

  getConfigurationIdByUserId(userId: string): string | null {
    const config = this.configurations.find(config =>
      (typeof config.user === 'string' ? config.user : config.user._id) === userId
    );
    return config ? config._id! : null;
  }

  getRecordId(record: TeacherAdminSalary): string {
    return record._id || '';
  }

  isSelectedUserSet(): boolean {
    return this.selectedUser !== null;
  }

  // New methods for unified table view
  toggleUserDetails(userId: string): void {
    this.expandedUser = this.expandedUser === userId ? null : userId;
  }

  getUserId(user: User | string): string {
    return typeof user === 'string' ? user : user._id || '';
  }

  // Helper method to get payment for a specific month
  getPaymentForMonth(record: TeacherAdminSalary, month: number): SalaryPayment | undefined {
    return record.paymentSchedule.find(p => p.month === month);
  }

  // Delete configuration method
  deleteConfiguration(configurationId: string): void {
    this.configurationToDelete = configurationId;
    this.showDeleteConfirmModal = true;
  }

  // Confirm delete configuration
  confirmDeleteConfiguration(): void {
    if (this.configurationToDelete) {
      this.salaryService.deleteSalaryConfiguration(this.configurationToDelete).subscribe({
        next: (response) => {
          this.toasterService.success('Configuration supprimée avec succès');
          this.loadData(); // Reload data to refresh the view
          this.closeDeleteConfirmModal();
        },
        error: (error) => {
          console.error('Error deleting configuration:', error);
          this.toasterService.error(
            error.error?.message || 'Erreur lors de la suppression de la configuration'
          );
          this.closeDeleteConfirmModal();
        }
      });
    }
  }

  // Close delete confirmation modal
  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.configurationToDelete = null;
  }

  // Config details modal methods
  openConfigDetailsModal(userId: string): void {
    const configuration = this.configurations.find(config =>
      (typeof config.user === 'string' ? config.user : config.user._id) === userId
    );
    if (configuration) {
      this.selectedConfiguration = configuration;
      this.showConfigDetailsModal = true;
    }
  }

  closeConfigDetailsModal(): void {
    this.showConfigDetailsModal = false;
    this.selectedConfiguration = null;
  }

  deleteConfigurationFromModal(): void {
    if (this.selectedConfiguration && this.selectedConfiguration._id) {
      const configurationId = this.selectedConfiguration._id;
      this.closeConfigDetailsModal();
      this.deleteConfiguration(configurationId);
    }
  }

  // User details modal methods
  viewUserDetails(user: User): void {
    this.selectedUserForDetails = user;
    this.showUserDetailsModal = true;
  }

  closeUserDetailsModal(): void {
    this.showUserDetailsModal = false;
    this.selectedUserForDetails = null;
  }

  deleteConfigurationFromRecord(record: TeacherAdminSalary): void {
    const configuration = this.getSalaryConfiguration(record);
    if (configuration && configuration._id) {
      this.deleteConfiguration(configuration._id);
    }
  }

  // Helper functions for user details
  getClassName(classData: string | any | null): string {
    if (!classData) return 'Aucune classe assignée';

    // If it's a string (class ID), return it
    if (typeof classData === 'string') {
      return 'Classe ID: ' + classData;
    }

    // If it's a class object with name property
    if (classData && classData.name) {
      return classData.name;
    }

    return 'Classe non identifiée';
  }

  getTeachingClassesDisplay(teachingClasses: any[]): string {
    if (!teachingClasses || teachingClasses.length === 0) {
      return 'Aucune matière assignée';
    }
    // You might want to implement actual teaching classes display here
    return teachingClasses.length + ' matière(s) assignée(s)';
  }

  // Receipt Preview Methods
  openReceiptPreview(record: TeacherAdminSalary, payment: any): void {
    this.selectedPrintData = {
      record: record,
      payment: payment,
      year: this.selectedAcademicYear
    };
    this.showReceiptPreviewModal = true;
  }

  closeReceiptPreview(): void {
    this.showReceiptPreviewModal = false;
    this.selectedPrintData = null;
  }

downloadReceipt(): void {
  if (!this.selectedPrintData) {
    this.toasterService.error('Aucune donnée de reçu disponible');
    return;
  }

  // Show loading state
  this.loading = true;
  this.toasterService.success('Génération du PDF en cours...');

  // Create a temporary element to render the receipt
  const tempElement = document.createElement('div');
  tempElement.style.position = 'absolute';
  tempElement.style.left = '-9999px';
  tempElement.style.top = '-9999px';
  tempElement.style.width = '210mm'; // A4 width
  tempElement.style.padding = '20mm';
  tempElement.style.backgroundColor = 'white';
  tempElement.style.fontFamily = 'Arial, sans-serif';

  // Add TWO copies of the receipt content with a separator
  const receiptHTML = this.generateReceiptHTML();
  tempElement.innerHTML = `
    ${receiptHTML}
    <div style="border-top: 2px dashed #999; margin: 30px 0; page-break-inside: avoid;"></div>
    ${receiptHTML}
  `;

  // Apply styles directly
  const styleElement = document.createElement('style');
  styleElement.textContent = this.getPrintStyles().replace(/@page[^}]*}/g, '');
  tempElement.appendChild(styleElement);

  // Add to document temporarily
  document.body.appendChild(tempElement);

  // Use html2canvas and jsPDF to generate PDF
  html2canvas(tempElement, {
    useCORS: true,
    allowTaint: false,
    width: tempElement.scrollWidth,
    height: tempElement.scrollHeight
  }).then((canvas: HTMLCanvasElement) => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgWidth = 190; // A4 width minus margins
    const pageHeight = 297; // A4 height
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const employeeName = this.getEmployeeName(this.selectedPrintData!.record).replace(/[^\w\s]/gi, '');
    const monthName = this.monthNames[this.selectedPrintData!.payment.month - 1];
    const filename = `recu_salaire_${employeeName.replace(/\s+/g, '_')}_${monthName}.pdf`;

    pdf.save(filename);
    this.loading = false;
    this.toasterService.success('Reçu PDF téléchargé avec succès!');

    // Clean up
    document.body.removeChild(tempElement);
  }).catch((error: any) => {
    console.error('Error generating PDF:', error);
    this.loading = false;
    this.fallbackDownload(tempElement);
  });
}
  private fallbackDownload(tempElement: HTMLElement): void {
    const employeeName = this.getEmployeeName(this.selectedPrintData!.record).replace(/[^\w\s]/gi, '');
    const monthName = this.monthNames[this.selectedPrintData!.payment.month - 1];

    // Create HTML content for download
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu de Salaire - ${employeeName} - ${monthName}</title>
        <meta charset="utf-8">
        <style>
          ${this.getPrintStyles()}
          body { margin: 0; padding: 20mm; background: white; }
          @media print {
            body { margin: 0; padding: 20mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${this.generateReceiptHTML()}
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recu_salaire_${employeeName.replace(/\s+/g, '_')}_${monthName}.html`;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Clean up temp element
    if (tempElement.parentNode) {
      document.body.removeChild(tempElement);
    }

    this.toasterService.success('Reçu téléchargé en format HTML (ouvrez avec votre navigateur pour imprimer en PDF)');
  }

  private getPrintStyles(): string {
    return `
      @page {
        size: A4;
        margin: 20mm;
      }

      body {
        font-family: Arial, sans-serif;
        line-height: 1.4;
        color: #000;
        background: white;
      }

      .receipt-container {
        max-width: 100%;
        margin: 0 auto;
        padding: 0;
      }

      .receipt-part {
        padding: 20px;
        margin-bottom: 20px;
      }

      .receipt-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
      }

      .receipt-header h2 {
        font-size: 16px;
        font-weight: bold;
        margin: 0 0 8px 0;
        text-transform: uppercase;
      }

      .receipt-header p {
        font-size: 11px;
        margin: 0;
        font-style: italic;
      }

      .receipt-paragraph {
        margin-bottom: 12px;
        line-height: 1.5;
        font-size: 13px;
        text-align: justify;
      }

      .field-value {
        font-weight: bold;
        margin: 0 2px;
      }

      .field-suffix {
        font-weight: normal;
      }

      .receipt-signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 25px;
        padding-top: 15px;
      }

      .signature-section {
        text-align: center;
        width: 45%;
      }

      .signature-section p {
        margin: 3px 0;
        font-size: 11px;
      }

      .signature-space {
        height: 45px;
        border-bottom: 1px solid #000;
        margin-top: 15px;
      }

      /* Receipt breakdown styles */
      .receipt-breakdown {
        margin: 15px 0;
        padding: 12px;
        border: 1px solid #000;
        border-radius: 4px;
        background-color: white;
      }

      .receipt-breakdown h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
        font-weight: 600;
        color: #000;
        border-bottom: 1px solid #333;
        padding-bottom: 6px;
      }

      .breakdown-items {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .breakdown-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 12px;
      }

      .breakdown-label {
        color: #333;
        flex: 1;
      }

      .breakdown-value {
        font-weight: 500;
        color: #000;
        min-width: 70px;
        text-align: right;
      }

      .breakdown-total {
        border-top: 1px solid #333;
        margin-top: 6px;
        padding-top: 6px;
        font-size: 13px;
      }

      .breakdown-total .breakdown-label,
      .breakdown-total .breakdown-value {
        color: #000;
        font-weight: bold;
      }
    `;
  }

  private generateSalaryBreakdownHTML(payment: any): string {
    if (!this.shouldShowSalaryBreakdown(payment)) {
      return '';
    }

    const extraHoursAmount = (payment.extraHours || 0) * (payment.extraHourlyRate || 0);

    return `
      <div class="receipt-breakdown">
        <h4>Détail du Salaire:</h4>
        <div class="breakdown-items">
          ${payment.paymentType === 'monthly' ?
            `<div class="breakdown-item">
              <span class="breakdown-label">Salaire de base:</span>
              <span class="breakdown-value">${this.formatCurrency(payment.baseSalaryAmount || 0)}</span>
            </div>` :
            `<div class="breakdown-item">
              <span class="breakdown-label">Salaire régulier (${payment.actualHoursWorked || payment.regularHours || 0}h × ${this.formatCurrency(payment.hourlyRate || 0)}/h):</span>
              <span class="breakdown-value">${this.formatCurrency(payment.regularAmount || 0)}</span>
            </div>`
          }
          ${(payment.extraHours || 0) > 0 ?
            `<div class="breakdown-item">
              <span class="breakdown-label">Heures Supplémentaires (${payment.extraHours}h × ${this.formatCurrency(payment.extraHourlyRate || 0)}/h):</span>
              <span class="breakdown-value">${this.formatCurrency(extraHoursAmount)}</span>
            </div>` : ''
          }
          <div class="breakdown-total">
            <span class="breakdown-label"><strong>Total:</strong></span>
            <span class="breakdown-value"><strong>${this.formatCurrency(this.getReceiptTotalAmount(payment))}</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  private generateReceiptHTML(): string {
    if (!this.selectedPrintData) return '';

    const totalAmount = this.getReceiptTotalAmount(this.selectedPrintData.payment);
    const amountInWords = this.convertAmountToWords(totalAmount);

    return `
      <div class="receipt-container">
        <div class="receipt-part">
          <div class="receipt-header">
            <h2>REÇU POUR PAIEMENT DE SALAIRE EN ESPÈCES</h2>
          </div>

          <div class="receipt-content">
            <p class="receipt-paragraph">
              Je soussigné, <span class="field-value">${this.getEmployeeName(this.selectedPrintData.record)}</span> , certifie avoir reçu la somme de <span class="field-value">${amountInWords}</span> TND (en toutes lettres), soit en chiffre : <span class="field-value">${this.formatCurrency(totalAmount)}</span> TND. Montant de salaire pour la période du <span class="field-value">${this.formatDateRange(this.selectedPrintData.payment.month, this.selectedPrintData.year)}</span>, comme salaire pour le mois de <span class="field-value">${this.monthNames[this.selectedPrintData.payment.month - 1]}</span>, de la part de <span class="field-value">Ons School</span>.
            </p>

            ${this.generateSalaryBreakdownHTML(this.selectedPrintData.payment)}

            <p class="receipt-paragraph">
              Fait à <span class="field-value">.....................</span>, le <span class="field-value">${this.formatDate(this.selectedPrintData.payment.paidDate) || this.getCurrentDate()}</span>.
            </p>

            <div class="receipt-signatures">
              <div class="signature-section">
                <p>« Lu et approuvé »</p>
                <p>Signature de l'école</p>
                <div class="signature-space"></div>
              </div>
              <div class="signature-section">
                <p>« Lu et approuvé »</p>
                <p>Signature de l'employé</p>
                <div class="signature-space"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getEmployeeName(record: TeacherAdminSalary): string {
    if (typeof record.user === 'string') {
      return 'Utilisateur inconnu';
    }
    return record.user.name || 'Nom non défini';
  }

  convertAmountToWords(amount: number): string {
    // Simple number to words converter for French
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    const hundreds = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents'];

    if (amount === 0) return 'zéro';
    if (amount < 0) return 'moins ' + this.convertAmountToWords(-amount);

    let result = '';
    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);

    // Convert whole part
    if (wholePart >= 1000) {
      result += Math.floor(wholePart / 1000) === 1 ? 'mille ' : units[Math.floor(wholePart / 1000)] + ' mille ';
    }

    const remainder = wholePart % 1000;
    if (remainder >= 100) {
      result += hundreds[Math.floor(remainder / 100)] + ' ';
    }

    const lastTwo = remainder % 100;
    if (lastTwo >= 20) {
      result += tens[Math.floor(lastTwo / 10)];
      if (lastTwo % 10 !== 0) {
        result += '-' + units[lastTwo % 10];
      }
    } else if (lastTwo >= 10) {
      result += teens[lastTwo - 10];
    } else if (lastTwo > 0) {
      result += units[lastTwo];
    }

    // Add decimal part if exists
    if (decimalPart > 0) {
      result += ' virgule ' + decimalPart;
    }

    return result.trim();
  }

  formatDateRange(month: number, year: string): string {
    const startYear = year.split('-')[0];
    const endYear = year.split('-')[1];

    if (month >= 9) {
      return `01/${month.toString().padStart(2, '0')}/${startYear} au 31/${month.toString().padStart(2, '0')}/${startYear}`;
    } else {
      return `01/${month.toString().padStart(2, '0')}/${endYear} au 31/${month.toString().padStart(2, '0')}/${endYear}`;
    }
  }

  getCurrentDate(): string {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  }

  // Check if salary breakdown should be shown in receipt
  shouldShowSalaryBreakdown(payment: any): boolean {
    // Show breakdown if there are extra hours or if it's an hourly payment with details
    return (payment.extraHours && payment.extraHours > 0) ||
           (payment.paymentType === 'hourly' && payment.actualHoursWorked !== payment.regularHours);
  }
getReceiptTotalAmount(payment: any): number {
  if (!payment) return 0;

  if (payment.paymentType === 'monthly') {
    const baseSalary = Math.max(0, payment.baseSalaryAmount || 0);
    const extraHours = Math.max(0, payment.extraHours || 0);
    const extraHourlyRate = payment.extraHourlyRate || 0;
    const extraAmount = extraHours * extraHourlyRate;
    return baseSalary + extraAmount;
  } else {
    // For hourly payments, calculate from actualHoursWorked
    const actualHours = Math.max(0, payment.actualHoursWorked || payment.regularHours || 0);
    const hourlyRate = Math.max(0, payment.hourlyRate || 0);
    
    // Calculate base payment from all hours worked
    const basePayment = actualHours * hourlyRate;
    
    // Add separate extra hours if any
    const extraHours = Math.max(0, payment.extraHours || 0);
    const extraHourlyRate = payment.extraHourlyRate || 0;
    const extraPayment = extraHours * extraHourlyRate;
    
    return basePayment + extraPayment;
  }
}
}
