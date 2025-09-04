// payment-dialog.component.ts - Fixed Version
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PaymentService } from '../../../services/payment.service';
import { 
  StudentWithPayment, 
  MonthlyPayment, 
  RecordPaymentRequest,
  StudentPayment 
} from '../../../models/payment.model';

export interface PaymentDialogData {
  student: StudentWithPayment;
  type: 'monthly' | 'annual';
  monthIndex?: number;
  academicYear: string;
  component?: 'tuition' | 'uniform' | 'transportation' | 'inscriptionFee'; // ✅ Add inscriptionFee
} 

@Component({
  selector: 'app-payment-dialog',
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.css']
})
export class PaymentDialogComponent implements OnInit, OnDestroy {
  @Input() data!: PaymentDialogData;
  @Output() dialogClosed = new EventEmitter<any>();

  paymentForm: FormGroup;
  isLoading = false;
  selectedMonth: MonthlyPayment | null = null;
  
  paymentMethods = [
    { value: 'cash', label: 'Espèces', icon: '💵' },
    { value: 'check', label: 'Chèque', icon: '📝' },
    { value: 'bank_transfer', label: 'Virement', icon: '🏦' },
    { value: 'online', label: 'En ligne', icon: '💳' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService
  ) {
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {
    if (!this.validateDataInput()) {
      this.onCancel();
      return;
    }
    
    this.initializeComponentDefaults();
    this.setupFormDefaults();
    this.setupFormValidation();
    this.setupFormWatchers();
    this.setInitialFocus();

    // Add keyboard event listener
    document.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  ngOnDestroy(): void {
    this.cleanupResources();
  }

  // ===== FORM CREATION AND SETUP =====

  private createForm(): FormGroup {
    return this.fb.group({
      monthIndex: [null],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      paymentMethod: ['cash', Validators.required],
      paymentDate: [this.formatDateForInput(new Date()), Validators.required],
      receiptNumber: [''],
      notes: ['', [Validators.maxLength(500)]],
      discount: [0, [Validators.min(0)]]
    });
  }

  private setupFormDefaults(): void {
    // For uniform payments, we don't need month selection
   if (this.data.component === 'uniform') {
    const uniformPrice = this.data.student.paymentRecord?.uniform?.price || 0;
    this.paymentForm.patchValue({
      amount: uniformPrice
    });
    // Remove month validators for uniform
    this.paymentForm.get('monthIndex')?.clearValidators();
    this.paymentForm.get('monthIndex')?.updateValueAndValidity();
    return;
  }

  // ✅ FIX: For inscription fee payments, set the fee amount
  if (this.data.component === 'inscriptionFee') {
    const inscriptionFeePrice = this.data.student.paymentRecord?.inscriptionFee?.price || 0;
    this.paymentForm.patchValue({
      amount: inscriptionFeePrice
    });
    // Remove month validators for inscription fee
    this.paymentForm.get('monthIndex')?.clearValidators();
    this.paymentForm.get('monthIndex')?.updateValueAndValidity();
    return;
  }

    if (this.data.type === 'monthly' && this.data.monthIndex !== undefined) {
      // Pre-select specific month for tuition or transportation
      const month = this.getMonthByIndex(this.data.monthIndex);
      if (month) {
        this.selectedMonth = month;
        const remainingAmount = month.amount - month.paidAmount;
        this.paymentForm.patchValue({
          monthIndex: this.data.monthIndex,
          amount: remainingAmount
        });
      }
    } else if (this.data.type === 'monthly' && (this.data.component === 'tuition' || this.data.component === 'transportation')) {
      // For monthly payments without pre-selected month, require month selection
      this.paymentForm.get('monthIndex')?.setValidators([Validators.required]);
    } else if (this.data.type === 'annual' && this.data.component === 'tuition') {
      // For annual tuition payment
      const totalTuitionAmount = this.data.student.paymentRecord?.totalAmounts?.tuition || 0;
      const paidTuitionAmount = this.data.student.paymentRecord?.paidAmounts?.tuition || 0;
      const remainingTuition = totalTuitionAmount - paidTuitionAmount;
      this.paymentForm.patchValue({
        amount: remainingTuition
      });
    }
  }

  private setupFormValidation(): void {
    // Add custom validators
    this.paymentForm.get('amount')?.setValidators([
      Validators.required,
      Validators.min(0.01),
      this.maxAmountValidator.bind(this)
    ]);

    this.paymentForm.get('discount')?.setValidators([
      Validators.min(0),
      this.maxDiscountValidator.bind(this)
    ]);
  }

  private setupFormWatchers(): void {
    // Watch for month selection changes (only for tuition and transportation)
    if (this.data.component !== 'uniform') {
      this.paymentForm.get('monthIndex')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(monthIndex => {
          if (monthIndex !== null && monthIndex !== undefined) {
            const month = this.getMonthByIndex(monthIndex);
            if (month) {
              this.selectedMonth = month;
              const remainingAmount = month.amount - month.paidAmount;
              this.paymentForm.patchValue({
                amount: remainingAmount
              }, { emitEvent: false });
            }
          }
        });
    }

    // Watch for amount changes to update validation
    this.paymentForm.get('amount')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.paymentForm.get('amount')?.updateValueAndValidity({ emitEvent: false });
      });
  }

  // ===== VALIDATION METHODS =====

  private maxAmountValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    
    const maxAmount = this.getMaxPayableAmount();
    if (maxAmount > 0 && control.value > maxAmount) {
      return {
        maxAmount: {
          max: maxAmount,
          actual: control.value
        }
      };
    }
    return null;
  }

  private maxDiscountValidator(control: AbstractControl): { [key: string]: any } | null {
    if (!control.value) return null;
    
    const amount = this.paymentForm?.get('amount')?.value || 0;
    if (control.value > amount) {
      return {
        maxDiscount: {
          max: amount,
          actual: control.value
        }
      };
    }
    return null;
  }

  // Line 129 - Update the validation check to include inscriptionFee
private validateDataInput(): boolean {
  if (!this.data) {
    console.error('PaymentDialogComponent: Missing required data input');
    return false;
  }

  if (!this.data.student) {
    console.error('PaymentDialogComponent: Missing student data');
    return false;
  }

  if (!this.data.student._id) {
    console.error('PaymentDialogComponent: Missing student ID');
    return false;
  }

  if (!this.data.academicYear) {
    console.error('PaymentDialogComponent: Missing academic year');
    return false;
  }

  if (!['monthly', 'annual'].includes(this.data.type)) {
    console.error('PaymentDialogComponent: Invalid payment type');
    return false;
  }

  // ✅ FIX: Add inscriptionFee to the valid components list
  if (this.data.component && !['tuition', 'uniform', 'transportation', 'inscriptionFee'].includes(this.data.component)) {
    console.error('PaymentDialogComponent: Invalid payment component');
    return false;
  }

  return true;
}

private initializeComponentDefaults(): void {
  // Set default component based on payment type if not specified
  if (!this.data.component) {
    this.data.component = 'tuition'; // Default to tuition
  }

  // Validate component compatibility with type
  if (this.data.component === 'uniform') {
    // Uniform is always a one-time payment
    if (this.data.type === 'annual') {
      console.warn('PaymentDialogComponent: Uniform payments are one-time, adjusting to monthly');
      this.data.type = 'monthly';
    }
  }

  // ✅ FIX: Inscription fee is always a one-time payment
  if (this.data.component === 'inscriptionFee') {
    if (this.data.type === 'annual') {
      console.warn('PaymentDialogComponent: Inscription fee payments are one-time, adjusting to monthly');
      this.data.type = 'monthly';
    }
  }

  if (this.data.component === 'transportation' && this.data.type === 'annual') {
    console.warn('PaymentDialogComponent: Transportation payments are typically not annual, adjusting to monthly');
    this.data.type = 'monthly';
  }
}
  // ===== DATA HELPER METHODS =====

getUnpaidMonths(): MonthlyPayment[] {
  // ✅ FIX: Add inscriptionFee to the exclusion list
  if (!this.data.student.paymentRecord || 
      this.data.component === 'uniform' || 
      this.data.component === 'inscriptionFee') {
    return [];
  }
  
  let monthlyPayments: MonthlyPayment[] = [];
  
  if (this.data.component === 'tuition') {
    monthlyPayments = this.data.student.paymentRecord.tuitionMonthlyPayments || [];
  } else if (this.data.component === 'transportation') {
    monthlyPayments = this.data.student.paymentRecord.transportation?.monthlyPayments || [];
  }
  
  return monthlyPayments
    .filter(m => m.status !== 'paid')
    .sort((a, b) => a.month - b.month);
}
  getMonthByIndex(index: number): MonthlyPayment | null {
    if (!this.data.student.paymentRecord || this.data.component === 'uniform') return null;
    
    if (this.data.component === 'tuition') {
      return this.data.student.paymentRecord.tuitionMonthlyPayments?.[index] || null;
    } else if (this.data.component === 'transportation') {
      return this.data.student.paymentRecord.transportation?.monthlyPayments?.[index] || null;
    }
    
    return null;
  }

  getMonthIndex(month: MonthlyPayment): number {
    if (!this.data.student.paymentRecord || this.data.component === 'uniform') return -1;
    
    let monthlyPayments: MonthlyPayment[] = [];
    
    if (this.data.component === 'tuition') {
      monthlyPayments = this.data.student.paymentRecord.tuitionMonthlyPayments || [];
    } else if (this.data.component === 'transportation') {
      monthlyPayments = this.data.student.paymentRecord.transportation?.monthlyPayments || [];
    }
    
    return monthlyPayments.findIndex(m => 
      m.month === month.month && m.monthName === month.monthName
    );
  }

  getMaxPayableAmount(): number {
     if (this.data.component === 'uniform') {
    return this.data.student.paymentRecord?.uniform?.price || 0;
  }
  
  // ✅ NEW: Handle inscription fee
  if (this.data.component === 'inscriptionFee') {
    return this.data.student.paymentRecord?.inscriptionFee?.price || 0;
  }
    
    if (this.data.type === 'monthly' && this.selectedMonth) {
      return this.selectedMonth.amount - this.selectedMonth.paidAmount;
    }
    
    if (this.data.type === 'annual' && this.data.component === 'tuition') {
      const totalAmount = this.data.student.paymentRecord?.totalAmounts?.tuition || 0;
      const paidAmount = this.data.student.paymentRecord?.paidAmounts?.tuition || 0;
      return totalAmount - paidAmount;
    }
    
    // For other cases, calculate remaining amount for the component
    if (this.data.student.paymentRecord) {
      const totalAmounts = this.data.student.paymentRecord.totalAmounts;
      const paidAmounts = this.data.student.paymentRecord.paidAmounts;
      
      switch (this.data.component) {
        case 'tuition':
          return (totalAmounts?.tuition || 0) - (paidAmounts?.tuition || 0);
        case 'transportation':
          return (totalAmounts?.transportation || 0) - (paidAmounts?.transportation || 0);
        default:
          return 0;
      }
    }
    
    return 0;
  }

  getTotalRemainingAmount(): number {
    return this.data.student.paymentRecord?.remainingAmounts?.grandTotal || 0;
  }

  // ===== UI HELPER METHODS =====

  getDialogTitle(): string {
    if (this.data.component === 'uniform') {
      return 'Paiement Uniforme';
    }
    
    const paymentType = this.data.type === 'annual' ? 'Paiement Annuel' : 'Paiement Mensuel';
    return `${paymentType} - ${this.getComponentLabel()}`;
  }

  getComponentLabel(): string {
  switch (this.data.component) {
    case 'tuition': return 'Frais Scolaires';
    case 'uniform': return 'Uniforme';
    case 'transportation': return 'Transport';
    case 'inscriptionFee': return 'Frais d\'Inscription'; // ✅ NEW
    default: return 'Paiement';
  }
}

 getComponentIcon(): string {
  switch (this.data.component) {
    case 'tuition': return '📚';
    case 'uniform': return '👔';
    case 'transportation': return '🚌';
    case 'inscriptionFee': return '📋'; // ✅ NEW
    default: return '💳';
  }
}
getComponentColor(): string {
  switch (this.data.component) {
    case 'tuition': return '#2196F3';
    case 'uniform': return '#FF9800';
    case 'transportation': return '#4CAF50';
    case 'inscriptionFee': return '#9C27B0'; // ✅ NEW - purple color
    default: return '#666666';
  }
}

  getPaymentTypeLabel(): string {
    if (this.data.component === 'uniform') {
      return 'Unique (début d\'année)';
    }
    
    return this.data.type === 'annual' ? 'Annuel' : 'Mensuel';
  }

  getStudentClass(): string {
    if (typeof this.data.student.studentClass === 'object' && this.data.student.studentClass?.name) {
      return this.data.student.studentClass.name;
    }
    return 'Non assigné';
  }

  getStudentGrade(): string {
    if (this.data.student.grade) {
      return this.paymentService.getGradeLabel(this.data.student.grade);
    }
    if (typeof this.data.student.studentClass === 'object' && this.data.student.studentClass?.grade) {
      return this.data.student.studentClass.grade;
    }
    return 'Non assigné';
  }

  getTransportationType(): string {
    return this.data.student.paymentRecord?.transportation?.type || '';
  }

getSubmitButtonText(): string {
  switch (this.data.component) {
    case 'tuition': 
      return this.data.type === 'annual' ? 'Enregistrer Paiement Annuel' : 'Enregistrer Paiement Mensuel';
    case 'uniform': 
      return 'Enregistrer Paiement Uniforme';
    case 'transportation': 
      return 'Enregistrer Paiement Transport';
    case 'inscriptionFee': 
      return 'Enregistrer Paiement Frais d\'Inscription'; // ✅ NEW
    default: 
      return 'Enregistrer Paiement';
  }
}
  getMaxPaymentDate(): string {
    return this.formatDateForInput(new Date());
  }

  // ===== EVENT HANDLERS =====

  onMonthSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const monthIndex = parseInt(target.value);
    
    if (isNaN(monthIndex)) return;
    
    const month = this.getMonthByIndex(monthIndex);
    if (month) {
      this.selectedMonth = month;
      const remainingAmount = month.amount - month.paidAmount;
      this.paymentForm.patchValue({
        monthIndex: monthIndex,
        amount: remainingAmount
      });
    }
  }

  selectPaymentMethod(method: string): void {
    this.paymentForm.patchValue({ paymentMethod: method });
  }

  fillMaxAmount(): void {
    const maxAmount = this.getMaxPayableAmount();
    if (maxAmount > 0) {
      this.paymentForm.patchValue({ amount: maxAmount });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    // Escape key to cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      this.onCancel();
    }

    // Ctrl+Enter or Cmd+Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.canSubmit()) {
        this.onSubmit();
      }
    }

    // F1 for help
    if (event.key === 'F1') {
      event.preventDefault();
      this.showHelp();
    }
  }

  // ===== CALCULATION METHODS =====

  calculateTotal(): number {
    const amount = this.paymentForm.get('amount')?.value || 0;
    const discount = (this.data.type === 'annual' && this.data.component === 'tuition') 
      ? (this.paymentForm.get('discount')?.value || 0) 
      : 0;
    return Math.max(0, amount - discount);
  }

calculateNewBalance(): number {
  if (!this.data.student.paymentRecord) return 0;
  
  const paymentAmount = this.calculateTotal();
  let currentRemaining = 0;
  
  switch (this.data.component) {
    case 'tuition':
      currentRemaining = this.data.student.paymentRecord.remainingAmounts?.tuition || 0;
      break;
    case 'uniform':
      currentRemaining = this.data.student.paymentRecord.uniform?.price || 0;
      break;
    case 'transportation':
      currentRemaining = this.data.student.paymentRecord.remainingAmounts?.transportation || 0;
      break;
    case 'inscriptionFee': // ✅ NEW
      currentRemaining = this.data.student.paymentRecord.inscriptionFee?.price || 0;
      break;
    default:
      currentRemaining = 0;
  }
  
  return Math.max(0, currentRemaining - paymentAmount);
}

  calculateNewTotalBalance(): number {
    if (!this.data.student.paymentRecord) return 0;
    
    const currentTotalRemaining = this.data.student.paymentRecord.remainingAmounts?.grandTotal || 0;
    const paymentAmount = this.calculateTotal();
    
    return Math.max(0, currentTotalRemaining - paymentAmount);
  }

  // ===== BUSINESS LOGIC =====

  isPartialPayment(): boolean {
    if (this.data.component === 'uniform') return false;
    if (!this.selectedMonth) return false;
    const amount = this.paymentForm.get('amount')?.value || 0;
    const remainingAmount = this.selectedMonth.amount - this.selectedMonth.paidAmount;
    return amount < remainingAmount && amount > 0;
  }

  isFullPayment(): boolean {
    if (this.data.component === 'uniform') {
      const amount = this.paymentForm.get('amount')?.value || 0;
      const uniformPrice = this.data.student.paymentRecord?.uniform?.price || 0;
      return amount === uniformPrice;
    }
    
    if (!this.selectedMonth) return false;
    const amount = this.paymentForm.get('amount')?.value || 0;
    const remainingAmount = this.selectedMonth.amount - this.selectedMonth.paidAmount;
    return amount === remainingAmount;
  }

  getPaymentPercentage(): number {
    if (this.data.component === 'uniform') {
      const amount = this.paymentForm.get('amount')?.value || 0;
      const uniformPrice = this.data.student.paymentRecord?.uniform?.price || 0;
      return uniformPrice > 0 ? Math.round((amount / uniformPrice) * 100) : 0;
    }
    
    if (!this.selectedMonth) return 0;
    const amount = this.paymentForm.get('amount')?.value || 0;
    const totalAmount = this.selectedMonth.amount;
    return totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0;
  }

  isMonthOverdue(month: MonthlyPayment): boolean {
    return this.paymentService.isPaymentOverdue(month.dueDate);
  }

  // ===== VALIDATION AND SUBMISSION =====

canSubmit(): boolean {
  if (this.paymentForm.invalid) return false;
  
  // ✅ FIX: Add inscription fee validation
  if (this.data.component === 'uniform' || this.data.component === 'inscriptionFee') {
    const amount = this.paymentForm.get('amount')?.value || 0;
    const maxAmount = this.getMaxPayableAmount();
    return amount > 0 && amount <= maxAmount;
  }
  
  // For monthly payments of tuition or transportation, month selection is required
  if (this.data.type === 'monthly' && 
      (this.data.component === 'tuition' || this.data.component === 'transportation')) {
    if (!this.selectedMonth) return false;
  }
  
  // Check if amount is within limits
  const amount = this.paymentForm.get('amount')?.value || 0;
  const maxAmount = this.getMaxPayableAmount();
  
  return amount > 0 && amount <= maxAmount;
}

getValidationMessages(): string[] {
  const messages: string[] = [];
  
  // ✅ FIX: Exclude inscription fee from month selection requirement
  if (this.data.type === 'monthly' && 
      this.data.component !== 'uniform' && 
      this.data.component !== 'inscriptionFee' &&
      !this.selectedMonth) {
    messages.push('Veuillez sélectionner un mois à payer');
  }
  
  const amount = this.paymentForm.get('amount')?.value || 0;
  const maxAmount = this.getMaxPayableAmount();
  
  if (amount <= 0) {
    messages.push('Le montant doit être supérieur à zéro');
  }
  
  if (amount > maxAmount) {
    messages.push(`Le montant ne peut pas dépasser ${this.formatCurrency(maxAmount)}`);
  }
  
  const discount = this.paymentForm.get('discount')?.value || 0;
  if (discount > amount) {
    messages.push('La remise ne peut pas être supérieure au montant');
  }
  
  return messages;
}

  private performFinalValidation(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Form validation
    if (this.paymentForm.invalid) {
      errors.push('Le formulaire contient des erreurs');
    }

    // Business rules validation
    const businessErrors = this.getValidationMessages();
    errors.push(...businessErrors);

    // Payment record validation
    if (!this.data.student.paymentRecord) {
      errors.push('Aucun dossier de paiement trouvé pour cet étudiant');
    }

    // Component-specific validation
    if (this.data.component === 'uniform') {
      if (!this.data.student.paymentRecord?.uniform) {
        errors.push('Aucune information d\'uniforme trouvée');
      } else if (this.data.student.paymentRecord.uniform.isPaid) {
        errors.push('L\'uniforme a déjà été payé');
      }
    }

    if (this.data.component === 'inscriptionFee') {
    if (!this.data.student.paymentRecord?.inscriptionFee?.applicable) {
      errors.push('Les frais d\'inscription ne sont pas applicables pour cet étudiant');
    } else if (this.data.student.paymentRecord?.inscriptionFee?.isPaid) {
      errors.push('Les frais d\'inscription ont déjà été payés');
    }
  }

    if (this.data.component === 'transportation') {
      if (!this.data.student.paymentRecord?.transportation?.using) {
        errors.push('Cet étudiant n\'utilise pas le service de transport');
      }
    }

    if (this.data.component === 'tuition' && this.data.type === 'annual') {
      if (this.data.student.paymentRecord?.annualTuitionPayment?.isPaid) {
        errors.push('Le paiement annuel des frais scolaires a déjà été effectué');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async onSubmit(): Promise<void> {
    // Mark all fields as touched for validation display
    this.markFormGroupTouched(this.paymentForm);

    // Perform comprehensive validation
    const validation = this.performFinalValidation();
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(', ');

      return;
    }

    this.isLoading = true;
    const formValue = this.paymentForm.value;
    const studentId = this.data.student._id;

    try {
      const paymentRequest: RecordPaymentRequest = {
        amount: formValue.amount,
        paymentMethod: formValue.paymentMethod,
        paymentDate: formValue.paymentDate,
        notes: formValue.notes?.trim() || undefined,
        receiptNumber: formValue.receiptNumber?.trim() || undefined
      };

      let result: StudentPayment | undefined;

      if (this.data.component === 'uniform') {
        // Uniform payment
        const uniformRequest = {
          paymentMethod: paymentRequest.paymentMethod,
          paymentDate: paymentRequest.paymentDate,
          notes: paymentRequest.notes,
          receiptNumber: paymentRequest.receiptNumber
        };
        
        result = await this.paymentService.recordUniformPayment(
          studentId, 
          uniformRequest, 
          this.data.academicYear
        ).toPromise();
        
        if (result) {
          this.handleSuccess(result, 'uniform');
        }
        
      } 
      else if (this.data.component === 'inscriptionFee') { // ✅ NEW
      // Inscription fee payment
      const inscriptionFeeRequest = {
        paymentMethod: paymentRequest.paymentMethod,
        paymentDate: paymentRequest.paymentDate,
        notes: paymentRequest.notes,
        receiptNumber: paymentRequest.receiptNumber
      };
      
      result = await this.paymentService.recordInscriptionFeePayment(
        studentId, 
        inscriptionFeeRequest, 
        this.data.academicYear
      ).toPromise();
      
      if (result) {
        this.handleSuccess(result, 'inscription_fee');
      }
    }
      else if (this.data.component === 'tuition') {
        if (this.data.type === 'monthly') {
          // Monthly tuition payment
          paymentRequest.monthIndex = formValue.monthIndex;
          
          result = await this.paymentService.recordMonthlyTuitionPayment(
            studentId, 
            paymentRequest, 
            this.data.academicYear
          ).toPromise();
          
          if (result) {
            this.handleSuccess(result, 'tuition_monthly');
          }
          
        } else {
          // Annual tuition payment
          paymentRequest.discount = formValue.discount || 0;
          
          result = await this.paymentService.recordAnnualTuitionPayment(
            studentId, 
            paymentRequest, 
            this.data.academicYear
          ).toPromise();
          
          if (result) {
            this.handleSuccess(result, 'tuition_annual');
          }
        }
        
      } else if (this.data.component === 'transportation') {
        // Monthly transportation payment
        paymentRequest.monthIndex = formValue.monthIndex;
        
        result = await this.paymentService.recordMonthlyTransportationPayment(
          studentId, 
          paymentRequest, 
          this.data.academicYear
        ).toPromise();
        
        if (result) {
          this.handleSuccess(result, 'transportation_monthly');
        }
      }
      
    } catch (error: any) {
      console.error('Error recording payment:', error);
      this.handleError(error);
    }
  }

  private handleSuccess(paymentRecord: StudentPayment, paymentType: string): void {

    
    this.dialogClosed.emit({
      success: true,
      paymentRecord: paymentRecord,
      type: paymentType,
      component: this.data.component,
      amount: this.calculateTotal()
    });
  }

  private handleError(error: any): void {
    this.isLoading = false;
    const errorMessage = this.paymentService.handlePaymentError(error);

  }

  onCancel(): void {
    this.dialogClosed.emit({ success: false });
  }

  // ===== UTILITY METHODS =====

  formatDate(date: Date | string): string {
    return this.paymentService.formatDate(date);
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'partial': 'Partiel',
      'paid': 'Payé',
      'overdue': 'En retard'
    };
    return statusMap[status] || status;
  }

  // ===== FORM VALIDATION HELPERS =====

  isFieldInvalid(fieldPath: string): boolean {
    const field = this.paymentForm.get(fieldPath);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldPath: string): string {
    const field = this.paymentForm.get(fieldPath);
    if (field && field.errors && (field.dirty || field.touched)) {
      
      if (field.errors['required']) {
        if (fieldPath === 'monthIndex') return 'Veuillez sélectionner un mois';
        if (fieldPath === 'amount') return 'Le montant est requis';
        if (fieldPath === 'paymentMethod') return 'Le mode de paiement est requis';
        if (fieldPath === 'paymentDate') return 'La date de paiement est requise';
        return 'Ce champ est requis';
      }
      
      if (field.errors['min']) {
        return `La valeur minimum est ${field.errors['min'].min}`;
      }
      
      if (field.errors['maxAmount']) {
        const error = field.errors['maxAmount'];
        return `Le montant ne peut pas dépasser ${this.formatCurrency(error.max)}`;
      }
      
      if (field.errors['maxDiscount']) {
        const error = field.errors['maxDiscount'];
        return `La remise ne peut pas dépasser ${this.formatCurrency(error.max)}`;
      }
      
      if (field.errors['maxlength']) {
        return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
      }
    }
    return '';
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

  // ===== HELP AND ACCESSIBILITY =====

  private showHelp(): void {
    const helpMessage = this.getHelpMessage();

  }

  private getHelpMessage(): string {
    switch (this.data.component) {
      case 'tuition':
        return 'Saisissez le montant des frais scolaires à payer. Pour les paiements mensuels, sélectionnez d\'abord le mois concerné.';
      case 'uniform':
        return 'Paiement unique pour l\'uniforme scolaire. Le montant est fixé selon la configuration de l\'école.';
      case 'transportation':
        return 'Paiement mensuel pour le service de transport scolaire. Sélectionnez le mois à payer.';
      default:
        return 'Remplissez les champs requis et cliquez sur "Enregistrer le Paiement".';
    }
  }

  getAmountAriaLabel(): string {
    const maxAmount = this.getMaxPayableAmount();
    return `Montant à payer, maximum ${this.formatCurrency(maxAmount)}`;
  }

  getMonthSelectAriaLabel(): string {
    const unpaidCount = this.getUnpaidMonths().length;
    return `Sélectionner le mois à payer, ${unpaidCount} mois disponible${unpaidCount > 1 ? 's' : ''}`;
  }

  getPaymentMethodAriaLabel(method: any): string {
    return `Sélectionner ${method.label} comme mode de paiement`;
  }

  // ===== MESSAGE HANDLING =====

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {

    
    if (type === 'error') {
      this.createNotification(message, type, '❌');
    } else if (type === 'success') {
      this.createNotification(message, type, '✅');
    } else if (type === 'warning') {
      this.createNotification(message, type, '⚠️');
    } else {
      this.createNotification(message, type, 'ℹ️');
    }
  }

  private createNotification(message: string, type: string, icon: string): void {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">${icon}</span>
        <span>${message}</span>
      </div>
    `;
    
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type as keyof typeof colors]};
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      z-index: 10000;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 300px;
      max-width: 500px;
      word-wrap: break-word;
      animation: slideIn 0.3s ease-out;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }
    }, type === 'error' ? 5000 : 3000);
  }

  // ===== FINAL CLEANUP METHODS =====

  private cleanupResources(): void {
    document.removeEventListener('keydown', this.onKeyDown.bind(this));
    this.destroy$.next();
    this.destroy$.complete();
    this.paymentForm.reset();
    this.selectedMonth = null;
    this.isLoading = false;
  }

  private setInitialFocus(): void {
    setTimeout(() => {
      const firstInput = document.querySelector('.payment-form input, .payment-form select') as HTMLElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }
}